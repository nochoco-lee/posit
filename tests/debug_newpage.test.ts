import { describe, it, expect } from "vitest";
import { SequenceLexer } from "../src/parser/sequence/lexer";

describe("Newpage Tokenization", () => {
    it("should tokenize newpage with title", () => {
        const input = `newpage A title for the\\nlast page`;
        const lexResult = SequenceLexer.tokenize(input);
        console.log(lexResult.tokens.map(t => ({ 
            type: (t.tokenType as any).name, 
            image: t.image,
            line: t.startLine
        })));
    });
});
