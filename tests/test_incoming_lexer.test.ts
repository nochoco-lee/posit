import { describe, it } from "vitest";
import { SequenceLexer } from "../src/parser/sequence/lexer";

describe("Incoming Lexer Test", async () => {
    it("should tokenize ?-> Alice", async () => {
        const lexingResult = SequenceLexer.tokenize("@startuml\n?-> Alice\n@enduml");
        console.log(lexingResult.tokens.map(t => ({ image: t.image, type: t.tokenType.name })));
    });
});



