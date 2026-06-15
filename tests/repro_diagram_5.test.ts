import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser/index";

describe("diagram_5 reproduction", () => {
    it("should parse participant with multiline title", () => {
        const input = `@startuml
participant Participant [
    =Title
    ----
    ""SubTitle""
]
@enduml`;
        const ast = parsePlantUml(input);
        expect(ast.statements[0]).toMatchObject({
            type: "node",
            name: "Participant"
        });
    });
});
