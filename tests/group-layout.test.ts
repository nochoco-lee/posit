
import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser";
import { LayoutManager } from "../src/layout/engine";

describe("Sequence Group Layout", () => {
    it("should process alt/else groups and record section info", () => {
        const input = `
@startuml
alt success
    A -> B : ok
else failure
    A -> B : error
end
@enduml
`;

        const ast = parsePlantUml(input);
        const layoutManager = new LayoutManager();
        const map = layoutManager.process(ast);

        expect(map.groups.length).toBe(1);
        const group = map.groups[0];
        expect(group.dividerYs).toBeDefined();
        expect(group.dividerYs.length).toBe(1); // One divider between success and failure
        expect(group.dividerYs[0]).toBeGreaterThan(group.position.y);
        expect(group.dividerYs[0]).toBeLessThan(group.position.y + group.size.height);
    });
});
