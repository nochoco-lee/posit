import { MermaidLexer } from "./lexer";
import { parser } from "./parser";
import { visitor } from "./visitor";
import { IRDiagram } from "../ir/types";

export function parseMermaid(text: string): IRDiagram {
    // 1. Lexing
    const lexingResult = MermaidLexer.tokenize(text);

    if (lexingResult.errors.length > 0) {
        throw new Error(`Lexing errors:\n${lexingResult.errors.map(e => e.message).join("\n")}`);
    }

    // 2. Parsing
    parser.input = lexingResult.tokens;
    const cst = parser.diagram();

    if (parser.errors.length > 0) {
        throw new Error(`Parsing errors:\n${parser.errors.map(e => e.message).join("\n")}`);
    }

    // 3. Visiting to create AST
    const ast = visitor.visit(cst);

    return ast;
}
