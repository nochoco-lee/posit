import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser/index";

describe("Deployment Diagram Skinparam Bug", async () => {
    it("should parse a deployment diagram with skinparam", async () => {
        const input = `
@startuml
skinparam componentStyle uml2
component A
component B
A --> B : "hello"
@enduml
        `;

        const ast = await parsePlantUml(input);
        expect(ast.diagramType).toBe("deployment");
    });

    it("should handle ambiguous deployment diagrams with skinparam", async () => {
        const input = `
@startuml
skinparam handwritten true
[A] --> [B]
@enduml
        `;

        const ast = await parsePlantUml(input);
        expect(ast.diagramType).toBe("deployment");
    });

    it("should handle multiline skinparam blocks", async () => {
        const input = `
@startuml
skinparam component {
  BackgroundColor red
}
[A] --> [B]
@enduml
        `;

        const ast = await parsePlantUml(input);
        expect(ast.diagramType).toBe("deployment");
        expect(ast.statements.length).toBeGreaterThan(0);
    });
});



