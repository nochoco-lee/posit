import { IRDiagram } from "../ir/types";
import { PlantUmlScanner } from "./scanner";

function unescapeHtml(text: string): string {
    return text
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#34;/g, '"')
        .replace(/&#39;/g, "'");
}

// ── Lazy singletons — parsers are expensive to construct (Chevrotain
// runs performSelfAnalysis() in the constructor). We only build each
// one the first time it is actually needed, and we skip loading the
// modules for diagram types that are never used in a session. ────────

let _sequenceBundle: { lexer: any; parser: any; visitor: any } | null = null;
async function getSequenceBundle() {
    if (!_sequenceBundle) {
        const [{ SequenceLexer }, { parser }, { visitor }] = await Promise.all([
            import("./sequence/lexer"),
            import("./sequence/parser"),
            import("./sequence/visitor"),
        ]);
        _sequenceBundle = { lexer: SequenceLexer, parser, visitor };
    }
    return _sequenceBundle;
}

let _classBundle: { lexer: any; parser: any; visitor: any } | null = null;
async function getClassBundle() {
    if (!_classBundle) {
        const [{ ClassLexer }, { parser }, { visitor }] = await Promise.all([
            import("./class/lexer"),
            import("./class/parser"),
            import("./class/visitor"),
        ]);
        _classBundle = { lexer: ClassLexer, parser, visitor };
    }
    return _classBundle;
}

let _deploymentBundle: { lexer: any; parser: any; visitor: any } | null = null;
async function getDeploymentBundle() {
    if (!_deploymentBundle) {
        const [{ DeploymentLexer }, { parser }, { visitor }] = await Promise.all([
            import("./deployment/lexer"),
            import("./deployment/parser"),
            import("./deployment/visitor"),
        ]);
        _deploymentBundle = { lexer: DeploymentLexer, parser, visitor };
    }
    return _deploymentBundle;
}

/**
 * Pre-warm all three parser bundles in parallel.
 * Call this once on app startup (fire-and-forget).  Each bundle's
 * Chevrotain performSelfAnalysis() is expensive and synchronous; running it
 * eagerly — while the loading overlay is still visible — prevents the
 * first diagram of each type from freezing the main thread.
 */
export function warmUpParsers(): void {
    Promise.all([
        getSequenceBundle(),
        getClassBundle(),
        getDeploymentBundle(),
    ]).catch(() => { /* ignore errors during warm-up */ });
}


export async function parsePlantUml(text: string): Promise<IRDiagram> {
    const unescapedText = unescapeHtml(text);
    const scanner = new PlantUmlScanner();
    const diagramType = scanner.scan(unescapedText);

    if (diagramType === 'unknown') {
        throw new Error("Could not determine PlantUML diagram type. Please ensure your script starts with @startuml and contains valid diagram elements.");
    }

    let bundle: { lexer: any; parser: any; visitor: any };

    switch (diagramType) {
        case 'sequence':
            bundle = await getSequenceBundle();
            break;
        case 'class':
            bundle = await getClassBundle();
            break;
        case 'deployment':
            bundle = await getDeploymentBundle();
            break;
        default:
            throw new Error(`Unsupported diagram type: ${diagramType}`);
    }

    const { lexer, parser, visitor } = bundle;

    const lexResult = lexer.tokenize(unescapedText);
    if (lexResult.errors.length > 0) {
        // console.warn("Lexing errors:", lexResult.errors);
    }

    parser.reset();
    parser.input = lexResult.tokens;
    const cst = parser.diagram();

    if (parser.errors.length > 0) {
        const maxErrors = 5;
        const messages = parser.errors.slice(0, maxErrors).map((e: any) => e.message);
        let combined = messages.join("; ");
        if (parser.errors.length > maxErrors) {
            combined += `; ... and ${parser.errors.length - maxErrors} more error(s)`;
        }
        throw new Error(`Parsing errors (${diagramType}): ` + combined);
    }

    const ast = visitor.visit(cst);
    if (!ast) {
        throw new Error(`Parsing errors: Visitor returned null AST for ${diagramType}`);
    }
    
    ast.syntax = 'plantuml';
    ast.diagramType = diagramType;

    return ast;
}
