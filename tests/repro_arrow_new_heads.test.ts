import { describe, it, expect } from "vitest";
import { SequenceLexer } from "../src/parser/sequence/lexer";

describe("Arrow token new heads", async () => {
    const lex = (input: string) => {
        const lexResult = SequenceLexer.tokenize(input);
        return lexResult.tokens.map(t => ({
            type: t.tokenType.name,
            image: t.image
        }));
    };

    it("should match arrows with ( and ) heads separately to support duration", async () => {
        const testCases = [
            "->)",
            "(<-",
            "->(",
            ")<-"
        ];

        for (const tc of testCases) {
            const tokens = lex(tc);
            expect(tokens.length).toBeGreaterThan(1);
            expect(tokens.some(t => t.type === "Arrow")).toBe(true);
        }
    });

    it("should match arrows with [ and ] heads", async () => {
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

    it("should match arrows with multiple heads separately", async () => {
        const tokens = lex("->))");
        expect(tokens.length).toBe(3);
        expect(tokens[0].type).toBe("Arrow");
        expect(tokens[1].type).toBe("RParen");
        expect(tokens[2].type).toBe("RParen");
    });
});



