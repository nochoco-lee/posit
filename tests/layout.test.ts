import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser/index";
import { LayoutManager } from "../src/layout/engine";
import { DEFAULTS } from "../src/layout/types";
import { IRDiagram } from "../src/ir/types";

describe("Layout Manager", () => {
    it("should assign default horizontal layout to unpositioned sequence actors", () => {
        const ast: IRDiagram = parsePlantUml(`
@startuml
participant A
participant B
@enduml
    `);

        const layout = new LayoutManager().process(ast);
        const nodes = layout.nodes;

        expect(nodes["A"].position).toEqual({ x: DEFAULTS.SEQUENCE_START_X, y: DEFAULTS.SEQUENCE_START_Y });
        expect(nodes["B"].position).toEqual({ x: DEFAULTS.SEQUENCE_START_X + DEFAULTS.ACTOR_PADDING_X, y: DEFAULTS.SEQUENCE_START_Y });
    });

    it("should respect manually locked positions via @pos metadata", () => {
        const ast = parsePlantUml(`
@startuml
participant LockedObject /' @pos(500, 600) '/
@enduml
    `);

        const layout = new LayoutManager().process(ast);
        expect(layout.nodes["LockedObject"].position).toEqual({ x: 500, y: 600 });
    });

    it("should process default class layouts vertically", () => {
        const ast = parsePlantUml(`
@startuml
class Database
class Server
@enduml
    `);

        const layout = new LayoutManager().process(ast);
        const nodes = layout.nodes;

        expect(nodes["Database"].position).toEqual({ x: DEFAULTS.CLASS_START_X, y: DEFAULTS.CLASS_START_Y });
        // Default height 80 + 50 padding = 130. 100 + 130 = 230
        expect(nodes["Server"].position).toEqual({ x: DEFAULTS.CLASS_START_X, y: 100 + 130 });
    });

    it("should assign dynamic height to classes with members", () => {
        const ast = parsePlantUml(`
@startuml
class User {
    + name
    + age
}
@enduml
    `);

        const layout = new LayoutManager().process(ast);
        const userNode = layout.nodes["User"];
        
        // height = 30 (header) + (2 * 20) (members) + 10 (padding) = 80
        expect(userNode.size.height).toBe(80);
        expect(userNode.members?.length).toBe(2);
    });

    it("should capture cardinality in connections", () => {
        const ast = parsePlantUml(`
@startuml
User "1" *-- "many" Order
@enduml
    `);

        const layout = new LayoutManager().process(ast);
        const conn = layout.connections[0];
        
        expect(conn.fromLabel).toBe("1");
        expect(conn.toLabel).toBe("many");
    });

    it("should assign initial Y distance to the first sequence message", () => {
        const ast = parsePlantUml(`
@startuml
A -> B : Hello
@enduml
    `);

        const layout = new LayoutManager().process(ast);
        const conn = layout.connections[0];
        
        // DEFAULTS.SEQUENCE_START_Y (100) + 150 = 250
        expect(conn.calculatedY).toBe(250);
    });
});
