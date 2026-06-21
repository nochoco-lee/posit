import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser/index";

describe("Diagram 5: Multiline participant", async () => {
    it("should parse multiline participant title", async () => {
        const input = `@startuml
participant Participant [
    =Title
    ----
    ""SubTitle""
]

participant Bob

Participant -> Bob
@enduml`;
        const ast = await parsePlantUml(input);
        expect(ast.type).toBe("Diagram");
    });
});



