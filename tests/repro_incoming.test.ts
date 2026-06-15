import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser/index";
import { SequenceLexer } from "../src/parser/sequence/lexer";

describe("repro_incoming", () => {
    it("should parse ?-> Alice", () => {
        const input = `@startuml
?-> Alice
@enduml`;
        const lexingResult = SequenceLexer.tokenize(input);
        console.log("Tokens:", lexingResult.tokens.map((t: any) => ({ type: t.tokenType.name, image: t.image })));
        const ast = parsePlantUml(input);
        expect(ast.statements.length).toBe(1);
    });
});
