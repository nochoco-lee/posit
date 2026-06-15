import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser/index";
import { SequenceLexer } from "../src/parser/lexer";

describe("Diagram 51 Reproduction", () => {
    it("should parse diagram 51", () => {
        const input = `@startuml
alice -> bob   --++ #gold: hello
bob   -> alice --++ #gold: you too
alice -> bob   --: step1
alice -> bob   : step2
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
