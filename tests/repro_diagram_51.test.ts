import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser/index";

describe("diagram_51 reproduction", () => {
    it("should parse diagram_51", () => {
        const input = `@startuml
alice -> bob --++ #gold : hello
bob -> alice --++ #gold : you too
alice -> bob -- : step1
alice -> bob : step2
@enduml`;
        const ast = parsePlantUml(input);
        expect(ast.statements.length).toBe(4);
    });
});
