import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser/index";
import { LayoutManager } from "../src/layout/engine";
import { IRDiagram } from "../src/ir/types";

describe("Deployment Layout Manager", async () => {
    it("should layout basic deployment elements in a stack", async () => {
        const puml = `
@startuml
node n1
database d1
@enduml
`;
        const ast: IRDiagram = await parsePlantUml(puml);
        const layout = new LayoutManager().process(ast);
        
        expect(layout.diagramType).toBe('deployment');
        expect(layout.nodes['n1']).toBeDefined();
        expect(layout.nodes['d1']).toBeDefined();
        
        // n1 at 50, 50
        expect(layout.nodes['n1'].position).toEqual({ x: 50, y: 50 });
        // d1 should be below n1 (60 height + 20 padding)
        expect(layout.nodes['d1'].position.y).toBe(50 + 60 + 20);
    });

    it("should handle nested containers", async () => {
        const puml = `
@startuml
node n1 {
  artifact a1
}
@enduml
`;
        const ast: IRDiagram = await parsePlantUml(puml);
        const layout = new LayoutManager().process(ast);
        
        expect(layout.groups.length).toBe(1);
        const group = layout.groups[0];
        expect(group.label).toBe('n1');
        
        expect(layout.nodes['a1']).toBeDefined();
        // a1 should be inside n1
        // n1 starts at 50, 50. a1 should be at 50+20, 50+20+20
        expect(layout.nodes['a1'].position).toEqual({ x: 50 + 20, y: 50 + 20 + 20 });
        
        // n1 size should be large enough to contain a1
        expect(group.size.width).toBeGreaterThan(120);
        expect(group.size.height).toBeGreaterThan(60);
    });

    it("should capture stereotypes", async () => {
        const puml = `
@startuml
node n1 <<stereo1>>
cloud c1 <<stereo2>> {
  artifact a1 <<stereo3>>
}
@enduml
`;
        const ast: IRDiagram = await parsePlantUml(puml);
        const layout = new LayoutManager().process(ast);
        
        expect(layout.nodes['n1'].stereotype).toBe('<<stereo1>>');
        expect(layout.groups[0].stereotype).toBe('<<stereo2>>');
        expect(layout.nodes['a1'].stereotype).toBe('<<stereo3>>');
    });

    it("should capture colors", async () => {
        const puml = `
@startuml
node n1 #red
cloud c1 #blue {
  artifact a1 #green
}
@enduml
`;
        const ast: IRDiagram = await parsePlantUml(puml);
        const layout = new LayoutManager().process(ast);
        
        expect(layout.nodes['n1'].color).toBe('#red');
        expect(layout.groups[0].color).toBe('#blue');
        expect(layout.nodes['a1'].color).toBe('#green');
    });

    it("should assign shape-specific sizes", async () => {
        const puml = `
@startuml
usecase UC1
person P1
database DB1
node N1
@enduml
`;
        const ast: IRDiagram = await parsePlantUml(puml);
        const layout = new LayoutManager().process(ast);

        expect(layout.nodes["UC1"].size).toEqual({ width: 140, height: 70 });
        expect(layout.nodes["P1"].size).toEqual({ width: 60, height: 90 });
        expect(layout.nodes["DB1"].size).toEqual({ width: 100, height: 80 });
        expect(layout.nodes["N1"].size).toEqual({ width: 120, height: 60 });
    });
});



