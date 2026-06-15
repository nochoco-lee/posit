import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser/index";
import { SequenceLexer } from "../src/parser/lexer";

describe("Diagram 84 Reproduction", () => {
    it("should parse diagram 84", () => {
        const input = `@startuml
A ->(10) B: text 10
B ->(10) A: text 10

A ->(10) B: text 10
A (10)<- B: text 10
@enduml`;
        const lexResult = SequenceLexer.tokenize(input);
        console.log("Tokens:", lexResult.tokens.map(t => ({ 
            type: (t.tokenType as any).name, 
            image: t.image,
            line: t.startLine 
        })));
        
        const ast = parsePlantUml(input);
        expect(ast.type).toBe("Diagram");
    });
});
