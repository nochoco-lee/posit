import { describe, it, expect } from "vitest";
import { ClassLexer as SequenceLexer } from "../src/parser/class/lexer";

describe("Generic Tokenization", () => {
    it("should tokenize List~T~", () => {
        const input = `class List~T~ {`;
        const lexResult = SequenceLexer.tokenize(input);
        console.log(lexResult.tokens.map(t => ({ 
            type: (t.tokenType as any).name, 
            image: t.image 
        })));
    });
});
