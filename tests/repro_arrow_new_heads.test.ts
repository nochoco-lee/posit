import { describe, it, expect } from "vitest";
import { SequenceLexer } from "../src/parser/lexer";

describe("Arrow token new heads", () => {
    const lex = (input: string) => {
        const lexResult = SequenceLexer.tokenize(input);
        return lexResult.tokens.map(t => ({
            type: t.tokenType.name,
            image: t.image
        }));
    };

    it("should match arrows with ( and ) heads", () => {
        const testCases = [
            "->)",
            "(<-",
            "->(",
            ")<-",
            "o->)",
            "(<-o",
            "->>)",
            "(<<-",
            "->o", // existing
            "o<-"  // existing
        ];

        for (const tc of testCases) {
            const tokens = lex(tc);
            expect(tokens).toHaveLength(1);
            expect(tokens[0].type).toBe("Arrow");
            expect(tokens[0].image).toBe(tc);
        }
    });

    it("should match arrows with [ and ] heads", () => {
        const testCases = [
            "->]",
            "[<-",
            "->[",
            "]<-",
            "x->]",
            "[<-x",
            "->>]",
            "[<<-"
        ];

        for (const tc of testCases) {
            const tokens = lex(tc);
            expect(tokens).toHaveLength(1);
            expect(tokens[0].type).toBe("Arrow");
            expect(tokens[0].image).toBe(tc);
        }
    });

    it("should match arrows with multiple heads", () => {
        const tokens = lex("->))");
        expect(tokens).toHaveLength(1);
        expect(tokens[0].type).toBe("Arrow");
        expect(tokens[0].image).toBe("->))");
    });
});
