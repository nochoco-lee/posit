import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser/index";
import { SequenceLexer } from "../src/parser/lexer";

describe("Diagram 20 Reproduction", () => {
    it("should parse diagram 20", () => {
        const input = `@startuml
class Object << general >>
Object <|--- ArrayList
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
