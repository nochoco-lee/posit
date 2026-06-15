import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser/index";

describe("Diagram 5: Multiline participant", () => {
    it("should parse multiline participant title", () => {
        const input = `@startuml
participant Participant [
    =Title
    ----
    ""SubTitle""
]

participant Bob

Participant -> Bob
@enduml`;
        const ast = parsePlantUml(input);
        expect(ast.type).toBe("Diagram");
    });
});
