import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser/index";
import { SequenceLayoutManager } from "../src/layout/sequence";

describe("Issue 1: Arrow Direction", () => {
    it("should have correct direction in IR for Alice <-- Bob", () => {
        const input = `@startuml
Alice <-- Bob: Another authentication Response
@enduml`;
        const ast = parsePlantUml(input);
        const edge = ast.statements[0] as any;
        
        // Visitor swaps them, so 'from' should be Bob
        expect(edge.from).toBe("Bob");
        expect(edge.to).toBe("Alice");
        expect(edge.arrow).toBe("-->");
    });
});
