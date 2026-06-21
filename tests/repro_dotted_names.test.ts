import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser";

describe("Dotted Names Reproduction", async () => {
  it("should parse diagram_42 contents", async () => {
    const puml = `@startuml

skinparam packageStyle rectangle

package foo1.foo2 {
}

package foo1.foo2.foo3 {
  class Object
}

foo1.foo2 +-- foo1.foo2.foo3

@enduml`;
    await parsePlantUml(puml);
  });

  it("should parse qualified names in relationships", async () => {
    const puml = `@startuml
net.sourceforge.plantuml.Object <|-- net.sourceforge.plantuml.ArrayList
@enduml`;
    await parsePlantUml(puml);
  });
});



