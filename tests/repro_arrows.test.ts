import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser";

describe("Directional Arrows Reproduction", async () => {
  it("should parse diagram_48 contents", async () => {
    const puml = `@startuml
foo -left-> dummyLeft
foo -right-> dummyRight
foo -up-> dummyUp
foo -down-> dummyDown
@enduml`;
    await parsePlantUml(puml);
  });

  it("should parse diagram_49 contents", async () => {
    const puml = `@startuml
foo -l-> dummyLeft
foo -r-> dummyRight
foo -u-> dummyUp
foo -d-> dummyDown
@enduml`;
    await parsePlantUml(puml);
  });
});



