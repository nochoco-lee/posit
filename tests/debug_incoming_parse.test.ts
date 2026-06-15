import { it } from "vitest";
import { SequenceLexer } from "./src/parser/lexer";
import { parser } from "./src/parser/parser";

it("should parse ?-> Alice", () => {
    const input = `@startuml
?-> Alice
@enduml`;
    const lexResult = SequenceLexer.tokenize(input);
    parser.input = lexResult.tokens;
    const cst = parser.diagram();
    if (parser.errors.length > 0) {
        console.log("ERRORS:", JSON.stringify(parser.errors.map(e => e.message), null, 2));
    }
});
