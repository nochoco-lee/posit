import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser/index";

describe("Sequence Diagram Parser - Diagram 2", () => {
    it("should parse diagram_2.puml with various participant types", () => {
        const input = `
@startuml
participant Participant as Foo
actor       Actor       as Foo1
boundary    Boundary    as Foo2
control     Control     as Foo3
entity      Entity      as Foo4
database    Database    as Foo5
collections Collections as Foo6
queue       Queue       as Foo7
Foo -> Foo1 : To actor 
Foo -> Foo2 : To boundary
Foo -> Foo3 : To control
Foo -> Foo4 : To entity
Foo -> Foo5 : To database
Foo -> Foo6 : To collections
Foo -> Foo7: To queue
@enduml
`;
        const ast = parsePlantUml(input);
        expect(ast.type).toBe("Diagram");
        
        const validStatements = ast.statements.filter(s => s !== null);
        expect(validStatements.length).toBe(15);

        // Participants
        expect(validStatements[0]).toMatchObject({ type: "node", shape: "participant", name: "Foo", origName: "Participant" });
        expect(validStatements[1]).toMatchObject({ type: "node", shape: "actor", name: "Foo1", origName: "Actor" });
        expect(validStatements[2]).toMatchObject({ type: "node", shape: "boundary", name: "Foo2", origName: "Boundary" });
        expect(validStatements[3]).toMatchObject({ type: "node", shape: "control", name: "Foo3", origName: "Control" });
        expect(validStatements[4]).toMatchObject({ type: "node", shape: "entity", name: "Foo4", origName: "Entity" });
        expect(validStatements[5]).toMatchObject({ type: "node", shape: "database", name: "Foo5", origName: "Database" });
        expect(validStatements[6]).toMatchObject({ type: "node", shape: "collections", name: "Foo6", origName: "Collections" });
        expect(validStatements[7]).toMatchObject({ type: "node", shape: "queue", name: "Foo7", origName: "Queue" });

        // Edges
        expect(validStatements[8]).toMatchObject({ type: "edge", from: "Foo", to: "Foo1", label: "To actor" });
        expect(validStatements[9]).toMatchObject({ type: "edge", from: "Foo", to: "Foo2", label: "To boundary" });
    });
});
