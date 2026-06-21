import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser/index";

describe("diagram_5 reproduction", async () => {
    it("should parse participant with multiline title", async () => {
        const input = `@startuml
participant Participant [
    =Title
    ----
    ""SubTitle""
]
@enduml`;
        const ast = await parsePlantUml(input);
        expect(ast.statements[0]).toMatchObject({
            type: "node",
            name: "Participant"
        });
    });
});



