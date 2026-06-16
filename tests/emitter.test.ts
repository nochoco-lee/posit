import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser/index";
import { Emitter } from "../src/layout/emitter";
import { LayoutMap } from "../src/layout/types";

describe("Emitter Two-Way Sync", () => {
    it("should inject new @pos comments into unpositioned nodes", () => {
        const input = `
@startuml
participant Alice
actor Bob
@enduml
`;
        const ast = parsePlantUml(input);
        const layoutMap: LayoutMap = {
            diagramType: "unknown",
            nodes: {
                "Alice": { id: "Alice", type: "participant", origName: "Alice", position: { x: 100, y: 200 }, size: { width: 100, height: 50 } },
                "Bob": { id: "Bob", type: "actor", origName: "Bob", position: { x: 300, y: 200 }, size: { width: 100, height: 50 } }
            },
            connections: [],
            notes: [],
            groups: []
        };

        const emitter = new Emitter();
        const output = emitter.emitPlantUml(input, ast, layoutMap);

        expect(output).toContain("participant Alice /' @pos(100, 200) '/");
        expect(output).toContain("actor Bob /' @pos(300, 200) '/");
    });

    it("should update existing @pos comments", () => {
        const input = `
@startuml
class User /' @pos(10, 20) '/
@enduml
`;
        const ast = parsePlantUml(input);
        const layoutMap: LayoutMap = {
            diagramType: "unknown",
            nodes: {
                "User": { id: "User", type: "class", origName: "User", position: { x: 500, y: 600 }, size: { width: 100, height: 50 } }
            },
            connections: [],
            notes: [],
            groups: []
        };

        const emitter = new Emitter();
        const output = emitter.emitPlantUml(input, ast, layoutMap);

        expect(output).toContain("class User /' @pos(500, 600) '/");
        expect(output).not.toContain("10, 20");
    });

    it("should inject and update @pos comments on connections", () => {
        const input = `
@startuml
participant A
participant B
participant C
participant D
A -> B : message /' @pos(50, 50) '/
C *-- D
@enduml
`;
        const ast = parsePlantUml(input);
        const layoutMap: LayoutMap = {
            diagramType: "sequence",
            nodes: {},
            connections: [
                { from: "A", to: "B", type: "->", label: "message", position: { x: 100, y: 100 } },
                { from: "C", to: "D", type: "*--", label: null, position: { x: 200, y: 200 } }
            ],
            notes: [],
            groups: []
        };

        const emitter = new Emitter();
        const output = emitter.emitPlantUml(input, ast, layoutMap);

        expect(output).toContain("A -> B : message /' @pos(100, 100) '/");
        expect(output).toContain("C *-- D /' @pos(200, 200) '/");
    });

    it("should inject @pos comments after class braces", () => {
        const input = `
@startuml
class User {
    + id
}
@enduml
`;
        const ast = parsePlantUml(input);
        const layoutMap: LayoutMap = {
            diagramType: "unknown",
            nodes: {
                "User": { id: "User", type: "class", origName: "User", position: { x: 50, y: 50 }, size: { width: 100, height: 50 } }
            },
            connections: [],
            notes: [],
            groups: []
        };

        const emitter = new Emitter();
        const output = emitter.emitPlantUml(input, ast, layoutMap);

        expect(output).toContain("class User {\n    + id\n} /' @pos(50, 50) '/");
    });

    it("should handle quoted labels with newlines in emitter", () => {
        const input = `
@startuml
A -> B : "Auth\\nRequest"
@enduml
`;
        const ast = parsePlantUml(input);
        const layoutMap: LayoutMap = {
            diagramType: "unknown",
            nodes: {},
            connections: [
                { from: "A", to: "B", type: "->", label: "Auth\nRequest", position: { x: 100, y: 100 } }
            ],
            notes: [],
            groups: []
        };

        const emitter = new Emitter();
        const output = emitter.emitPlantUml(input, ast, layoutMap);

        expect(output).toContain("A -> B : \"Auth\\nRequest\" /' @pos(100, 100) '/");
    });
});
