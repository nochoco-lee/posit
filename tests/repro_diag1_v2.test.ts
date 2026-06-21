import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser/index";
import { LayoutManager } from "../src/layout/engine";

describe("Sequence Diagram 1 Direction", async () => {
    it("should correctly identify 'from' and 'to' for diagram 1", async () => {
        const input = `
@startuml
Alice -> Bob: Authentication Request
Bob --> Alice: Authentication Response

Alice -> Bob: Another authentication Request
Alice <-- Bob: Another authentication Response
@enduml
`;
        const ast = await parsePlantUml(input);
        const layoutManager = new LayoutManager();
        const map = layoutManager.process(ast);

        // 0: Alice -> Bob
        expect(map.connections[0].from).toBe("Alice");
        expect(map.connections[0].to).toBe("Bob");

        // 1: Bob --> Alice
        expect(map.connections[1].from).toBe("Bob");
        expect(map.connections[1].to).toBe("Alice");

        // 2: Alice -> Bob
        expect(map.connections[2].from).toBe("Alice");
        expect(map.connections[2].to).toBe("Bob");

        // 3: Alice <-- Bob (normalized to Bob -> Alice)
        expect(map.connections[3].from).toBe("Bob");
        expect(map.connections[3].to).toBe("Alice");
    });
});



