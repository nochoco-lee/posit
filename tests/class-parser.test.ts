import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser/index";
import * as fs from "fs";
import * as path from "path";

describe("Class Diagram Parser", async () => {
    it("should parse classes and interfaces with layout metadata", async () => {
        const input = `
@startuml
class User /' @pos(100, 200) '/
interface OrderHandler
User <|-- OrderHandler : implements /' @pos(150, 250) '/
User *-- Order
@enduml
    `;

        const ast = await parsePlantUml(input);

        expect(ast.type).toBe("Diagram");
        expect(ast.statements.length).toBe(4);

        // Assert Class
        expect(ast.statements[0]).toMatchObject({
            type: "node",
            shape: "class",
            name: "User",
            layout: { x: 100, y: 200 }
        });

        // Assert Interface
        expect(ast.statements[1]).toMatchObject({
            type: "node",
            shape: "interface",
            name: "OrderHandler"
        });

        // Assert Relation 1
        expect(ast.statements[2]).toMatchObject({
            type: "edge",
            from: "OrderHandler",
            to: "User",
            arrow: "--|>",
            label: "implements",
            layout: { x: 150, y: 250 }
        });

        // Assert Relation 2
        expect(ast.statements[3]).toMatchObject({
            type: "edge",
            from: "User",
            to: "Order",
            arrow: "*--",
            label: undefined
        });
    });

    it("should parse diagram_20 with correct note and class counts", async () => {
        const text = fs.readFileSync(path.join(__dirname, '../test_scripts/plantuml_class/diagram_20.puml'), 'utf8');
        const ast = await parsePlantUml(text);
        const nodes = ast.statements.filter((s: any) => s.type === 'node' && s.shape === 'class');
        const notes = ast.statements.filter((s: any) => s.type === 'note');
        expect(notes.length).toBe(4);
        expect(notes.map((n: any) => n.name)).toContain('N1');
        expect(notes.map((n: any) => n.name)).toContain('N2');
        expect(notes.find((n: any) => n.text?.includes('In java'))).toBeTruthy();
        expect(notes.find((n: any) => n.text?.includes('On last defined'))).toBeTruthy();
    });
});



