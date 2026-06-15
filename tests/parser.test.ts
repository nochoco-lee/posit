import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser/index";

describe("Sequence Diagram Parser", () => {
    it("should parse a simple sequence diagram with layout metadata", () => {
        const input = `
@startuml
participant Alice /' @pos(100, 200) '/
actor Bob
Alice -> Bob : Authentication Request /' @pos(150, 250) '/
Bob --> Alice : Authentication Response
@enduml
    `;

        const ast = parsePlantUml(input);

        expect(ast.type).toBe("Diagram");
        expect(ast.statements.length).toBe(4);

        // Assert Alice
        expect(ast.statements[0]).toMatchObject({
            type: "node",
            shape: "participant",
            name: "Alice",
            layout: { x: 100, y: 200 }
        });

        // Assert Bob
        expect(ast.statements[1]).toMatchObject({
            type: "node",
            shape: "actor",
            name: "Bob",
            layout: undefined
        });

        // Assert Message 1
        expect(ast.statements[2]).toMatchObject({
            type: "edge",
            from: "Alice",
            to: "Bob",
            label: "Authentication Request",
            layout: { x: 150, y: 250 }
        });

        // Assert Message 2
        expect(ast.statements[3]).toMatchObject({
            type: "edge",
            from: "Bob",
            to: "Alice",
            label: "Authentication Response",
            layout: undefined
        });
    });

    it("should parse quoted labels with spaces and newlines", () => {
        const input = `
@startuml
Alice -> Bob : "Authentication\\nRequest"
Bob --> Alice : "Authentication Response"
@enduml
    `;

        const ast = parsePlantUml(input);

        expect(ast.statements[0]).toMatchObject({
            type: "edge",
            label: "Authentication\nRequest"
        });

        expect(ast.statements[1]).toMatchObject({
            type: "edge",
            label: "Authentication Response"
        });
    });

    it("should parse quoted participant labels in connections", () => {
        const input = `
@startuml
"User" -> Alice : Hello
Alice -> "Web Server" : Request
@enduml
    `;
        const ast = parsePlantUml(input);
        expect(ast.statements[0]).toMatchObject({
            type: "edge",
            from: "User",
            fromLabel: "",
            to: "Alice"
        });
        expect(ast.statements[1]).toMatchObject({
            type: "edge",
            from: "Alice",
            to: "Web Server",
            toLabel: ""
        });
    });

    it("should parse participant aliases", () => {
        const input = `
@startuml
participant "External User" as EU
EU -> Alice : Hello
@enduml
    `;
        const ast = parsePlantUml(input);
        expect(ast.statements[0]).toMatchObject({
            type: "node",
            name: "EU",
            origName: "External User"
        });
        expect(ast.statements[1]).toMatchObject({
            type: "edge",
            from: "EU",
            to: "Alice"
        });
    });

    it("should parse quoted participant names in connections", () => {
        const input = `
@startuml
Bob -> "Uncle Tom" : abc
@enduml
    `;
        const ast = parsePlantUml(input);
        expect(ast.statements[0]).toMatchObject({
            type: "edge",
            from: "Bob",
            to: "Uncle Tom"
        });
    });

    it("should parse unquoted labels with spaces and keywords", () => {
        const input = `
@startuml
Foo -> Foo1 : To actor
@enduml
    `;
        const ast = parsePlantUml(input);
        expect(ast.statements[0]).toMatchObject({
            type: "edge",
            label: "To actor"
        });
    });

    it("should parse unquoted labels with \\n for multiline text", () => {
        const input = `
@startuml
Alice -> Alice: This is a signal to self.\\nIt also demonstrates\\nmultiline \\ntext
@enduml
    `;
        const ast = parsePlantUml(input);
        expect(ast.statements[0]).toMatchObject({
            type: "edge",
            label: "This is a signal to self.\nIt also demonstrates\nmultiline \ntext"
        });
    });

    it("should ignore single-line comments starting with '", () => {
        const input = `
@startuml
' This is a comment
Alice -> Bob : Hello
' Another comment
@enduml
    `;
        const ast = parsePlantUml(input);
        expect(ast.statements.length).toBe(1);
        expect(ast.statements[0]).toMatchObject({
            type: "edge",
            from: "Alice",
            to: "Bob"
        });
    });

    it("should ignore multi-line comments starting with /' and ending with '/", () => {
        const input = `
@startuml
/' 
   This is a
   multi-line comment
'/
Alice -> Bob : Hello
/' Another multi-line comment '/
@enduml
    `;
        const ast = parsePlantUml(input);
        expect(ast.statements.length).toBe(1);
        expect(ast.statements[0]).toMatchObject({
            type: "edge",
            from: "Alice",
            to: "Bob"
        });
    });

    it("should ignore skinparam and hide statements", () => {
        const input = `
@startuml
skinparam handwritten true
hide footbox
Alice -> Bob : Hello
skinparam backgroundColor #EEE
@enduml
    `;
        const ast = parsePlantUml(input);
        // statements[0] is null from visitor for ignoredStatement
        // Let's filter out nulls if we want to be clean, but currently AST has them
        const validStatements = ast.statements.filter(s => s !== null);
        expect(validStatements.length).toBe(1);
        expect(validStatements[0]).toMatchObject({
            type: "edge",
            from: "Alice",
            to: "Bob"
        });
    });

    it("should not throw error when hide statement is at the end", () => {
        const input = `
@startuml
actor Alice
actor Bob
Alice -> Bob : hello
hide footbox
@enduml
`;
        const ast = parsePlantUml(input);
        expect(ast).toBeDefined();
        // This input used to cause "Cannot read properties of null (reading 'type')"
    });

    it("should throw on invalid syntax", () => {
        const input = `
@startuml
badsyntax
@enduml
    `;
        expect(() => parsePlantUml(input)).toThrow(/Parsing errors/);
    });
});
