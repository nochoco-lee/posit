/**
 * parser.worker.ts
 *
 * Runs all Chevrotain parser bundles off the main thread.
 * performSelfAnalysis() is synchronous + CPU-intensive (~5-25s per parser),
 * so it must never run on the main thread.
 *
 * Protocol (main → worker):
 *   { type: 'WARM_QUEUE', order: ParserType[] }   — set initial warm-up order
 *   { type: 'PRIORITIZE', parser: ParserType }     — move a type to front of queue
 *   { type: 'PARSE', id: string, parser: ParserType, text: string }
 *
 * Protocol (worker → main):
 *   { type: 'READY', parser: ParserType, ms: number }   — bundle is warm
 *   { type: 'PARSE_OK', id: string, ast: object }
 *   { type: 'PARSE_ERROR', id: string, message: string }
 *   { type: 'LOG', level: 'log'|'warn'|'error', message: string }
 */

export type ParserType = 'sequence' | 'class' | 'deployment' | 'mermaid';

// ── Bundle singletons ─────────────────────────────────────────────────────────

type Bundle = { lexer: any; parser: any; visitor: any };

const bundles: Partial<Record<ParserType, Bundle>> = {};
const warming: Partial<Record<ParserType, Promise<Bundle>>> = {};

function log(message: string) {
    self.postMessage({ type: 'LOG', level: 'log', message });
}

async function loadBundle(parserType: ParserType): Promise<Bundle> {
    if (bundles[parserType]) return bundles[parserType]!;
    if (warming[parserType]) return warming[parserType]!;

    const t = performance.now();
    log(`[Worker] ⚙️  Loading ${parserType} bundle…`);

    const promise = (async (): Promise<Bundle> => {
        let bundle: Bundle;
        switch (parserType) {
            case 'sequence': {
                const [{ SequenceLexer }, { parser }, { visitor }] = await Promise.all([
                    import('./parser/sequence/lexer'),
                    import('./parser/sequence/parser'),
                    import('./parser/sequence/visitor'),
                ]);
                bundle = { lexer: SequenceLexer, parser, visitor };
                break;
            }
            case 'class': {
                const [{ ClassLexer }, { parser }, { visitor }] = await Promise.all([
                    import('./parser/class/lexer'),
                    import('./parser/class/parser'),
                    import('./parser/class/visitor'),
                ]);
                bundle = { lexer: ClassLexer, parser, visitor };
                break;
            }
            case 'deployment': {
                const [{ DeploymentLexer }, { parser }, { visitor }] = await Promise.all([
                    import('./parser/deployment/lexer'),
                    import('./parser/deployment/parser'),
                    import('./parser/deployment/visitor'),
                ]);
                bundle = { lexer: DeploymentLexer, parser, visitor };
                break;
            }
            case 'mermaid': {
                const [{ MermaidLexer }, { parser }, { visitor }] = await Promise.all([
                    import('./mermaid/lexer'),
                    import('./mermaid/parser'),
                    import('./mermaid/visitor'),
                ]);
                bundle = { lexer: MermaidLexer, parser, visitor };
                break;
            }
        }
        const ms = performance.now() - t;
        bundles[parserType] = bundle!;
        log(`[Worker] ✅ ${parserType} ready in ${ms.toFixed(0)}ms`);
        self.postMessage({ type: 'READY', parser: parserType, ms });
        return bundle!;
    })();

    warming[parserType] = promise;
    return promise;
}

// ── Warm-up queue ─────────────────────────────────────────────────────────────

let warmQueue: ParserType[] = [];
let isWarming = false;

async function drainWarmQueue() {
    if (isWarming) return;
    isWarming = true;
    while (warmQueue.length > 0) {
        const next = warmQueue.shift()!;
        if (!bundles[next]) {
            await loadBundle(next).catch(() => { /* ignore */ });
        }
    }
    isWarming = false;
}

function prioritize(parserType: ParserType) {
    // Remove from wherever it is in the queue and put it first
    warmQueue = warmQueue.filter(t => t !== parserType);
    if (!bundles[parserType]) {
        warmQueue.unshift(parserType);
    }
    // Drain will pick it up; if draining is paused waiting on a Promise,
    // the Promise for the current type will resolve and the re-sorted queue
    // will be drained naturally. If the current warm is the wrong type,
    // it will finish quickly (bundles[current] gets set) and then the
    // prioritized type will be next.
}

// ── Parse helpers ─────────────────────────────────────────────────────────────

function unescapeHtml(text: string): string {
    return text
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#34;/g, '"')
        .replace(/&#39;/g, "'");
}

async function parseWith(parserType: ParserType, text: string): Promise<object> {
    const { lexer, parser, visitor } = await loadBundle(parserType);

    if (parserType === 'mermaid') {
        const t1 = performance.now();
        const lexingResult = lexer.tokenize(text);
        const realLexErrors = lexingResult.errors.filter((e: any) => !e.message?.includes('unexpected character'));
        if (realLexErrors.length > 0) throw new Error(`Lexing errors:\n${realLexErrors.map((e: any) => e.message).join('\n')}`);

        const t2 = performance.now();
        parser.input = lexingResult.tokens;
        const cst = parser.diagram();
        if (parser.errors.length > 0) throw new Error(`Parsing errors:\n${parser.errors.map((e: any) => e.message).join('\n')}`);

        const t3 = performance.now();
        const ast = visitor.visit(cst);
        ast.syntax = 'mermaid';
        const t4 = performance.now();
        log(`[Worker] 📊 mermaid  Lex=${(t2 - t1).toFixed(1)}ms  Parse=${(t3 - t2).toFixed(1)}ms  Visit=${(t4 - t3).toFixed(1)}ms`);
        return ast;
    } else {
        // PlantUML types
        const unescaped = unescapeHtml(text);
        const t1 = performance.now();
        const lexResult = lexer.tokenize(unescaped);

        const t2 = performance.now();
        parser.reset();
        parser.input = lexResult.tokens;
        const cst = parser.diagram();

        if (parser.errors.length > 0) {
            const maxErrors = 5;
            const msgs = parser.errors.slice(0, maxErrors).map((e: any) => e.message);
            let combined = msgs.join('; ');
            if (parser.errors.length > maxErrors) combined += `; … and ${parser.errors.length - maxErrors} more`;
            throw new Error(`Parsing errors (${parserType}): ` + combined);
        }

        const t3 = performance.now();
        const ast = visitor.visit(cst);
        if (!ast) throw new Error(`Visitor returned null AST for ${parserType}`);
        ast.syntax = 'plantuml';
        ast.diagramType = parserType;
        const t4 = performance.now();
        log(`[Worker] 📊 ${parserType}  Lex=${(t2 - t1).toFixed(1)}ms  Parse=${(t3 - t2).toFixed(1)}ms  Visit=${(t4 - t3).toFixed(1)}ms`);
        return ast;
    }
}

// ── Message handler ───────────────────────────────────────────────────────────

self.onmessage = async (event: MessageEvent) => {
    const msg = event.data;

    switch (msg.type) {
        case 'WARM_QUEUE': {
            warmQueue = (msg.order as ParserType[]).filter(t => !bundles[t]);
            drainWarmQueue();
            break;
        }
        case 'PRIORITIZE': {
            prioritize(msg.parser as ParserType);
            // If queue draining has already finished, re-trigger it
            drainWarmQueue();
            break;
        }
        case 'PARSE': {
            try {
                const ast = await parseWith(msg.parser as ParserType, msg.text);
                self.postMessage({ type: 'PARSE_OK', id: msg.id, ast });
            } catch (e: any) {
                self.postMessage({ type: 'PARSE_ERROR', id: msg.id, message: e.message ?? String(e) });
            }
            break;
        }
    }
};
