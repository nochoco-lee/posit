import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser";
import { LayoutManager } from "../src/layout/engine";

describe("Dotted Names Reproduction", async () => {
  it("should parse diagram_42 contents and correctly identify package relationships without making them classes", async () => {
    const puml = `@startuml

skinparam packageStyle rectangle

package foo1.foo2 {
}

package foo1.foo2.foo3 {
  class Object
}

foo1.foo2 +-- foo1.foo2.foo3

@enduml`;
    const ast = await parsePlantUml(puml);
    const layoutManager = new LayoutManager();
    const map = layoutManager.process(ast);

    // foo1.foo2 and foo1.foo2.foo3 should NOT be in nodes
    expect(map.nodes["foo1.foo2"]).toBeUndefined();
    expect(map.nodes["foo1.foo2.foo3"]).toBeUndefined();

    // They should be in groups
    const group1 = map.groups.find(g => g.id === "foo1.foo2");
    const group2 = map.groups.find(g => g.id === "foo1.foo2.foo3");
    expect(group1).toBeDefined();
    expect(group2).toBeDefined();

    // The connection should connect them
    const conn = map.connections.find(c => c.from === "foo1.foo2" && c.to === "foo1.foo2.foo3");
    expect(conn).toBeDefined();
  });

  it("should parse qualified names in relationships", async () => {
    const puml = `@startuml
net.sourceforge.plantuml.Object <|-- net.sourceforge.plantuml.ArrayList
@enduml`;
    const ast = await parsePlantUml(puml);
    const layoutManager = new LayoutManager();
    const map = layoutManager.process(ast);

    // These are classes (since they are not defined as packages)
    expect(map.nodes["net.sourceforge.plantuml.Object"]).toBeDefined();
    expect(map.nodes["net.sourceforge.plantuml.ArrayList"]).toBeDefined();
  });
});



