import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser";

describe("Directional Arrows Reproduction", () => {
  it("should parse diagram_48 contents", () => {
    const puml = `@startuml
foo -left-> dummyLeft
foo -right-> dummyRight
foo -up-> dummyUp
foo -down-> dummyDown
@enduml`;
    parsePlantUml(puml);
  });

  it("should parse diagram_49 contents", () => {
    const puml = `@startuml
foo -l-> dummyLeft
foo -r-> dummyRight
foo -u-> dummyUp
foo -d-> dummyDown
@enduml`;
    parsePlantUml(puml);
  });
});
