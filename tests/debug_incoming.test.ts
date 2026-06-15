import { it } from "vitest";
import { SequenceLexer } from "../src/parser/lexer";

it("should tokenize ?->>", () => {
    const input = `@startuml
?->> Alice
@enduml`;
    const lexResult = SequenceLexer.tokenize(input);
    console.log(JSON.stringify(lexResult.tokens.map((t: any) => ({ type: t.tokenType.name, image: t.image, line: t.startLine })), null, 2));
});

