import { IRDiagram } from "../ir/types";

// Lazy singleton — MermaidParser.performSelfAnalysis() is expensive;
// only load & instantiate the bundle when a Mermaid diagram is first parsed.
let _mermaidBundle: { lexer: any; parser: any; visitor: any } | null = null;
async function getMermaidBundle() {
    if (!_mermaidBundle) {
        const tBundle = performance.now();
        const [{ MermaidLexer }, { parser }, { visitor }] = await Promise.all([
            import("./lexer"),
            import("./parser"),
            import("./visitor"),
        ]);
        _mermaidBundle = { lexer: MermaidLexer, parser, visitor };
        console.log(
            `[Mermaid] 🔧 Bundle init (imports + performSelfAnalysis): ${(performance.now() - tBundle).toFixed(1)}ms`
        );
    }
    return _mermaidBundle;
}

export async function parseMermaid(text: string): Promise<IRDiagram> {
    const tTotal = performance.now();

    const { lexer, parser, visitor } = await getMermaidBundle();
    const tAfterBundle = performance.now();
    const bundleMs = tAfterBundle - tTotal;
    // Only log bundle wait time when it was a real cold-start (>1ms)
    if (bundleMs > 1) {
        console.log(`[Mermaid] ⏳ Bundle cold-start wait: ${bundleMs.toFixed(1)}ms`);
    }

    // ── Phase 1: Lex ─────────────────────────────────────────────────────
    const t1 = performance.now();
    const lexingResult = lexer.tokenize(text);
    const lexMs = performance.now() - t1;

    // Filter out "unexpected character" warnings — these are non-fatal
    const realLexErrors = lexingResult.errors.filter((e: any) => !e.message?.includes('unexpected character'));
    if (realLexErrors.length > 0) {
        throw new Error(`Lexing errors:\n${realLexErrors.map((e: any) => e.message).join("\n")}`);
    }

    // ── Phase 2: Parse (Chevrotain rule matching) ─────────────────────────
    const t2 = performance.now();
    parser.input = lexingResult.tokens;
    const cst = parser.diagram();
    const parseMs = performance.now() - t2;

    if (parser.errors.length > 0) {
        throw new Error(`Parsing errors:\n${parser.errors.map((e: any) => e.message).join("\n")}`);
    }

    // ── Phase 3: Visit (CST → AST) ────────────────────────────────────────
    const t3 = performance.now();
    const ast = visitor.visit(cst);
    const visitMs = performance.now() - t3;

    ast.syntax = 'mermaid';

    // ── Summary ───────────────────────────────────────────────────────────
    const totalMs = performance.now() - tTotal;
    console.log(
        `[Mermaid] 📊 parseMermaid breakdown` +
        `  |  tokens=${lexingResult.tokens.length}` +
        `  |  Lex=${lexMs.toFixed(1)}ms` +
        `  |  Parse=${parseMs.toFixed(1)}ms` +
        `  |  Visit=${visitMs.toFixed(1)}ms` +
        `  |  Total=${totalMs.toFixed(1)}ms`
    );

    return ast;
}
