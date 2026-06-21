import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser/index";
import { ClassLexer as SequenceLexer } from "../src/parser/class/lexer";

describe("Diagram 20 Reproduction", async () => {
    it("should parse diagram 20", async () => {
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
        
        const ast = await parsePlantUml(input);
        expect(ast.type).toBe("Diagram");
    });
});



