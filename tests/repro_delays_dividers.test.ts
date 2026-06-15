import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser/index";

describe("Sequence Diagram Delays and Dividers", () => {
    it("should parse delays and dividers", () => {
        const input = `
@startuml
Alice -> Bob : hello
... time passes ...
Bob -> Alice : ok
== Authentication ==
Alice -> Bob : login
@enduml
        `;

        const ast = parsePlantUml(input);
        expect(ast.diagramType).toBe("sequence");
        
        const delay = ast.statements.find(s => s.type === 'delay') as any;
        expect(delay).toBeDefined();
        expect(delay.text).toBe("time passes");

        const divider = ast.statements.find(s => s.type === 'divider') as any;
        expect(divider).toBeDefined();
        expect(divider.label).toBe("Authentication");
    });
});
