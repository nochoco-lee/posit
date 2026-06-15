import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser/index";
import { LayoutManager } from "../src/layout/engine";

describe("Class Diagram Package Nesting", () => {
    it("should render classes inside their defined package in a class diagram", () => {
        const puml = `
@startuml
package "My Package" {
  class ClassA {
    +field1
  }
}
@enduml
`;
        const ast = parsePlantUml(puml);
        const layout = new LayoutManager().process(ast);

        expect(layout.groups.length).toBe(1);
        const pkg = layout.groups[0];
        expect(pkg.label).toBe("My Package");

        expect(layout.nodes["ClassA"]).toBeDefined();
        const classA = layout.nodes["ClassA"];

        console.log("Package:", pkg.position, pkg.size);
        console.log("ClassA:", classA.position, classA.size);

        // ClassA should be within the vertical bounds of the package
        expect(classA.position.y).toBeGreaterThanOrEqual(pkg.position.y);
        expect(classA.position.y + classA.size.height).toBeLessThanOrEqual(pkg.position.y + pkg.size.height);
        
        // ClassA should be within the horizontal bounds of the package
        expect(classA.position.x).toBeGreaterThanOrEqual(pkg.position.x);
        expect(classA.position.x + classA.size.width).toBeLessThanOrEqual(pkg.position.x + pkg.size.width);
    });

    it("should render multiple classes inside their defined package", () => {
        const puml = `
@startuml
package "My Package" {
  class ClassA {
    +field1
  }
  class ClassB {
    +field2
  }
}
@enduml
`;
        const ast = parsePlantUml(puml);
        const layout = new LayoutManager().process(ast);

        expect(layout.groups.length).toBe(1);
        const pkg = layout.groups[0];

        const classA = layout.nodes["ClassA"];
        const classB = layout.nodes["ClassB"];

        expect(classA.position.y).toBeGreaterThanOrEqual(pkg.position.y);
        expect(classA.position.y + classA.size.height).toBeLessThanOrEqual(pkg.position.y + pkg.size.height);
        
        expect(classB.position.y).toBeGreaterThanOrEqual(pkg.position.y);
        expect(classB.position.y + classB.size.height).toBeLessThanOrEqual(pkg.position.y + pkg.size.height);

        // ClassB should be horizontal to ClassA since they are independent
        expect(classB.position.y).toBe(classA.position.y);
        expect(classB.position.x).toBeGreaterThan(classA.position.x);
    });

    it("should handle 'together' blocks in class diagrams", () => {
        const puml = `
@startuml
together {
  class ClassA {
    +field1
  }
}
@enduml
`;
        const ast = parsePlantUml(puml);
        const layout = new LayoutManager().process(ast);

        expect(layout.groups.length).toBe(1);
        const pkg = layout.groups[0];
        expect(pkg.keyword).toBe("together");

        const classA = layout.nodes["ClassA"];
        expect(classA.position.y).toBeGreaterThanOrEqual(pkg.position.y);
        expect(classA.position.y + classA.size.height).toBeLessThanOrEqual(pkg.position.y + pkg.size.height);
    });
});
