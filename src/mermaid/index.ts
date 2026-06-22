import { IRDiagram } from "../ir/types";

// Lazy singleton — MermaidParser.performSelfAnalysis() is expensive;
// only load & instantiate the bundle when a Mermaid diagram is first parsed.
let _mermaidBundle: { lexer: any; parser: any; visitor: any } | null = null;
async function getMermaidBundle() {
    if (!_mermaidBundle) {
        const [{ MermaidLexer }, { parser }, { visitor }] = await Promise.all([
            import("./lexer"),
            import("./parser"),
            import("./visitor"),
        ]);
        _mermaidBundle = { lexer: MermaidLexer, parser, visitor };
    }
    return _mermaidBundle;
}

export async function parseMermaid(text: string): Promise<IRDiagram> {
    const { lexer, parser, visitor } = await getMermaidBundle();

    // 1. Lexing
    const lexingResult = lexer.tokenize(text);
    // Filter out "unexpected character" warnings — these are non-fatal
    const realLexErrors = lexingResult.errors.filter((e: any) => !e.message?.includes('unexpected character'));
    if (realLexErrors.length > 0) {
        throw new Error(`Lexing errors:\n${realLexErrors.map((e: any) => e.message).join("\n")}`);
    }

    // 2. Parsing
    parser.input = lexingResult.tokens;
    const cst = parser.diagram();

    if (parser.errors.length > 0) {
        throw new Error(`Parsing errors:\n${parser.errors.map((e: any) => e.message).join("\n")}`);
    }

    // 3. Visiting to create AST
    const ast = visitor.visit(cst);
    ast.syntax = 'mermaid';

    return ast;
}
