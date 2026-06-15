import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser/index";

describe("Diagram 4: order keyword", () => {
    it("should parse participant with order keyword", () => {
        const input = `@startuml
participant Last order 30
participant Middle order 20
participant First order 10
@enduml`;
        const ast = parsePlantUml(input);
        expect(ast.type).toBe("Diagram");
    });
});
