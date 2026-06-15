import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser/index";

describe("Diagram 36 Reproduction", () => {
    it("should parse delay notation", () => {
        const input = `@startuml
Alice -> Bob : hello
... Some delay ...
Bob -> Alice : ok
@enduml`;
        const ast = parsePlantUml(input);
        expect(ast.type).toBe("Diagram");
    });
});
