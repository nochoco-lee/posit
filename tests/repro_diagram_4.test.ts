import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser/index";

describe("diagram_4 reproduction", async () => {
    it("should parse participant with order", async () => {
        const input = `@startuml
participant Last order 30
@enduml`;
        const ast = await parsePlantUml(input);
        expect(ast.statements[0]).toMatchObject({
            type: "node",
            name: "Last"
        });
    });
});



