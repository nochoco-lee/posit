import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser/index";
import { LayoutManager } from "../src/layout/engine";

describe("Sequence Arrow Direction Reproduction", async () => {
    it("should correctly identify 'from' and 'to' for Alice <-- Bob", async () => {
        const input = `
@startuml
Alice <-- Bob: Response
@enduml
        `;
        const ast = await parsePlantUml(input);
        const edge = ast.statements[0] as any;
        
        // In Alice <-- Bob, the source of information is Bob, and it goes TO Alice.
        // Usually, PlantUML interprets "A <- B" as "From B to A".
        expect(edge.from).toBe("Bob");
        expect(edge.to).toBe("Alice");
    });

    it("should correctly identify 'from' and 'to' for Alice <- Bob", async () => {
        const input = `
@startuml
Alice <- Bob: Response
@enduml
        `;
        const ast = await parsePlantUml(input);
        const edge = ast.statements[0] as any;
        
        expect(edge.from).toBe("Bob");
        expect(edge.to).toBe("Alice");
    });
});



