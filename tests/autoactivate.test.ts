
import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser";
import { LayoutManager } from "../src/layout/engine";

describe("Sequence Autoactivate Support", () => {
    it("should automatically start activations when autoactivate is on", () => {
        const input = `
@startuml
autoactivate on
A -> B : call
return ok
@enduml
`;

        const ast = parsePlantUml(input);
        const layoutManager = new LayoutManager();
        const map = layoutManager.process(ast);

        expect(map.connections.length).toBe(2);
        expect(map.activations?.length).toBe(1);
        expect(map.activations![0].nodeId).toBe("B");
    });

    it("should handle the actual 'B' identifier", () => {
        const input = `
@startuml
autoactivate on
A -> B : call
return ok
@enduml
`;

        const ast = parsePlantUml(input);
        const layoutManager = new LayoutManager();
        const map = layoutManager.process(ast);

        expect(map.activations?.length).toBe(1);
        expect(map.activations![0].nodeId).toBe("B");
        expect(map.activations![0].endMessageIndex).toBe(1);
    });
});
