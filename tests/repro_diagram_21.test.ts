import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser/index";

describe("Reproduction of diagram_21.puml", () => {
    it("should parse diagram_21.puml content", () => {
        const input = `
@startuml
class Foo
note left: On last defined class

note top of Foo
  In java, <size:18>every</size> <u>class</u>
  <b>extends</b>
  <i>this</i> one.
end note
@enduml
    `;

        const ast = parsePlantUml(input);
        expect(ast.type).toBe("Diagram");
    });
});
