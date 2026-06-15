import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser";

describe("Diagram 50 Reproduction", () => {
  it("should parse diagram_50 contents", () => {
    const puml = `@startuml
class Student {
  Name
}
Student "0..*" - "1..*" Course
(Student, Course) .. Enrollment

class Enrollment {
  drop()
  cancel()
}
@enduml`;
    parsePlantUml(puml);
  });
});
