
import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser";
import { LayoutManager } from "../src/layout/engine";

describe("Sequence Destroy Support", async () => {
    it("should handle destroy statements by ending activations and marking destroy", async () => {
        const input = `
@startuml
Alice -> Bob : hello
activate Bob
Bob -> Alice : bye
destroy Bob
@enduml
`;

        const ast = await parsePlantUml(input);
        const layoutManager = new LayoutManager();
        const map = layoutManager.process(ast);

        expect(map.activations?.length).toBe(1);
        const act = map.activations![0];
        expect(act.nodeId).toBe("Bob");
        expect(act.isDestroy).toBe(true);
        expect(act.endMessageIndex).toBe(1);
    });
});



