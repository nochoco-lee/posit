import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser/index";
import { SequenceLexer } from "../src/parser/sequence/lexer";

describe("Diagram 36 Reproduction", () => {
    it("should parse diagram 36 or fail informatively", () => {
        const input = `@startuml
participant Alice
participant "The **Famous** Bob" as Bob

Alice -> Bob : hello --there--
... Some ~~long delay~~ ...
Bob -> Alice : ok
@enduml`;
        const lexResult = SequenceLexer.tokenize(input);
        console.log("Tokens:", lexResult.tokens.map(t => ({ 
            type: (t.tokenType as any).name, 
            image: t.image,
            line: t.startLine 
        })));
        
        try {
            const ast = parsePlantUml(input);
            expect(ast.type).toBe("Diagram");
        } catch (e: any) {
            console.error(e.message);
            throw e;
        }
    });
});
