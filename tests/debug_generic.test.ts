import { describe, it, expect } from "vitest";
import { SequenceLexer } from "../src/parser/lexer";

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
