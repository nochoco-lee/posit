
import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser";
import { LayoutManager } from "../src/layout/engine";

describe("Sequence Return Support", () => {
    it("should handle return statements by generating connections and ending activations", () => {
        const input = `
@startuml
A -> B : call
activate B
B -> C : nested call
activate C
return ok
return ok
@enduml
`;

        const ast = parsePlantUml(input);
        const layoutManager = new LayoutManager();
        const map = layoutManager.process(ast);

        // Connections:
        // 0: A -> B
        // 1: B -> C
        // 2: C --> B (from first return)
        // 3: B --> A (from second return)
        expect(map.connections.length).toBe(4);
        
        expect(map.connections[2].from).toBe("C");
        expect(map.connections[2].to).toBe("B");
        expect(map.connections[2].label).toBe("ok");
        expect(map.connections[2].type).toBe("-->");

        expect(map.connections[3].from).toBe("B");
        expect(map.connections[3].to).toBe("A");
        expect(map.connections[3].label).toBe("ok");
        expect(map.connections[3].type).toBe("-->");

        // Activations should be closed
        expect(map.activations?.length).toBe(2);
        expect(map.activations![0].endMessageIndex).toBe(3);
        expect(map.activations![1].endMessageIndex).toBe(2);
    });
});
