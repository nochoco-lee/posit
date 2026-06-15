import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser/index";

describe("Deployment Diagram Skinparam Bug", () => {
    it("should parse a deployment diagram with skinparam", () => {
        const input = `
@startuml
skinparam componentStyle uml2
component A
component B
A --> B : "hello"
@enduml
        `;

        const ast = parsePlantUml(input);
        expect(ast.diagramType).toBe("deployment");
    });

    it("should handle ambiguous deployment diagrams with skinparam", () => {
        const input = `
@startuml
skinparam handwritten true
[A] --> [B]
@enduml
        `;

        const ast = parsePlantUml(input);
        expect(ast.diagramType).toBe("deployment");
    });

    it("should handle multiline skinparam blocks", () => {
        const input = `
@startuml
skinparam component {
  BackgroundColor red
}
[A] --> [B]
@enduml
        `;

        const ast = parsePlantUml(input);
        expect(ast.diagramType).toBe("deployment");
        expect(ast.statements.length).toBeGreaterThan(0);
    });
});
