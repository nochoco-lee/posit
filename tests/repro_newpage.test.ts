import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser/index";

describe("Diagram 23: newpage", async () => {
    it("should parse newpage keyword", async () => {
        const input = `@startuml

Alice -> Bob : message 1
Alice -> Bob : message 2

newpage

Alice -> Bob : message 3
Alice -> Bob : message 4

newpage A title for the\\nlast page

Alice -> Bob : message 5
Alice -> Bob : message 6
@enduml`;
        const ast = await parsePlantUml(input);
        expect(ast.type).toBe("Diagram");
    });
});



