import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser/index";
import { LayoutManager } from "../src/layout/engine";
import { DEFAULTS } from "../src/layout/types";
import { IRDiagram } from "../src/ir/types";

describe("Layout Manager", async () => {
    it("should assign default horizontal layout to unpositioned sequence actors", async () => {
        const ast: IRDiagram = await parsePlantUml(`
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

    it("should respect manually locked positions via @pos metadata", async () => {
        const ast = await parsePlantUml(`
@startuml
participant LockedObject /' @pos(500, 600) '/
@enduml
    `);

        const layout = new LayoutManager().process(ast);
        expect(layout.nodes["LockedObject"].position).toEqual({ x: 500, y: 600 });
    });

    it("should process default class layouts horizontally for independent classes", async () => {
        const ast = await parsePlantUml(`
@startuml
class Database
class Server
@enduml
    `);

        const layout = new LayoutManager().process(ast);
        const nodes = layout.nodes;

        expect(nodes["Database"].position).toEqual({ x: DEFAULTS.CLASS_START_X, y: DEFAULTS.CLASS_START_Y });
        // They should be on the same line now
        expect(nodes["Server"].position).toEqual({ x: DEFAULTS.CLASS_START_X + DEFAULTS.CLASS_WIDTH + 100, y: DEFAULTS.CLASS_START_Y });
    });

    it("should assign dynamic height to classes with members", async () => {
        const ast = await parsePlantUml(`
@startuml
class User {
    + name
    + age
}
@enduml
    `);

        const layout = new LayoutManager().process(ast);
        const userNode = layout.nodes["User"];
        
        // height = 30 (header) + 40 (fields) + 5 (sep) + 20 (methods) + 5 (padding) = 100
        expect(userNode.size.height).toBe(100);
        expect(userNode.members?.length).toBe(2);
    });

    it("should capture cardinality in connections", async () => {
        const ast = await parsePlantUml(`
@startuml
User "1" *-- "many" Order
@enduml
    `);

        const layout = new LayoutManager().process(ast);
        const conn = layout.connections[0];
        
        expect(conn.fromLabel).toBe("1");
        expect(conn.toLabel).toBe("many");
    });

    it("should assign initial Y distance to the first sequence message", async () => {
        const ast = await parsePlantUml(`
@startuml
A -> B : Hello
@enduml
    `);

        const layout = new LayoutManager().process(ast);
        const conn = layout.connections[0];
        
        // DEFAULTS.SEQUENCE_START_Y (100) + 150 = 250
        expect(conn.calculatedY).toBe(250);
    });

    it("should center a single top-level class over multiple bottom-level classes", async () => {
        const puml = `
@startuml
class Aaa
class Factory
class Entry
class Parent
Aaa --> Factory
Aaa --> Entry
Aaa --> Parent
@enduml
`;
        const ast = await parsePlantUml(puml);
        const layout = new LayoutManager().process(ast);
        const nodes = layout.nodes;

        const aaa = nodes["Aaa"];
        const factory = nodes["Factory"];
        const entry = nodes["Entry"];
        const parent = nodes["Parent"];

        // Factory, Entry, Parent should be on the same Y
        expect(factory.position.y).toBe(entry.position.y);
        expect(entry.position.y).toBe(parent.position.y);

        // Calculate expected centering
        const row1Xs = [factory.position.x, entry.position.x, parent.position.x].sort((a, b) => a - b);
        const row1MinX = row1Xs[0];
        const row1MaxX = row1Xs[2] + nodes["Parent"].size.width;
        const row1MidX = (row1MinX + row1MaxX) / 2;
        
        const aaaMidX = aaa.position.x + aaa.size.width / 2;
        expect(aaaMidX).toBeCloseTo(row1MidX, 1);
    });
});



