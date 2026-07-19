import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser/index";
import { LayoutManager } from "../src/layout/engine";

describe("Class Diagram Package Nesting", async () => {
    it("should render classes inside their defined package in a class diagram", async () => {
        const puml = `
@startuml
package "My Package" {
  class ClassA {
    +field1
  }
}
@enduml
`;
        const ast = await parsePlantUml(puml);
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

    it("should render multiple classes inside their defined package", async () => {
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
        const ast = await parsePlantUml(puml);
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

    it("should handle 'together' blocks in class diagrams", async () => {
        const puml = `
@startuml
together {
  class ClassA {
    +field1
  }
}
@enduml
`;
        const ast = await parsePlantUml(puml);
        const layout = new LayoutManager().process(ast);

        expect(layout.groups.length).toBe(1);
        const pkg = layout.groups[0];
        expect(pkg.keyword).toBe("together");

        const classA = layout.nodes["ClassA"];
        expect(classA.position.y).toBeGreaterThanOrEqual(pkg.position.y);
        expect(classA.position.y + classA.size.height).toBeLessThanOrEqual(pkg.position.y + pkg.size.height);
    });

    it("should parse package layout comments placed after the closing brace", async () => {
        const puml = `
@startuml
package foo1.foo2 {
} /' @pos(351, 349) '/

package foo1.foo2.foo3 {
  class Object /' @pos(131, 123) '/
} /' @pos(63, 91) '/
@enduml
`;
        const ast = await parsePlantUml(puml);
        const layout = new LayoutManager().process(ast);

        expect(layout.groups.length).toBe(2);
        
        const pkg1 = layout.groups.find(g => g.label === "foo1.foo2");
        const pkg2 = layout.groups.find(g => g.label === "foo1.foo2.foo3");

        expect(pkg1).toBeDefined();
        expect(pkg1!.position).toEqual({ x: 351, y: 349 });

        expect(pkg2).toBeDefined();
        expect(pkg2!.position).toEqual({ x: 63, y: 91 });

        const obj = layout.nodes["Object"];
        expect(obj).toBeDefined();
        expect(obj.position).toEqual({ x: 131, y: 123 });
    });
});



