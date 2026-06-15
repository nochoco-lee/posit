import { describe, it, expect } from "vitest";
import { parseMermaid } from "../src/mermaid/index";

describe("Mermaid JS Parser", () => {
    it("should parse sequence diagrams with layout metadata", () => {
        const input = `
sequenceDiagram
participant Alice
actor Bob %% @pos(300, 200)
Alice->>Bob: Hello %% @pos(150, 250)
        `;

        const ast = parseMermaid(input);

        expect(ast.type).toBe("Diagram");
        expect(ast.statements.length).toBe(3);

        const alice = ast.statements[0];
        expect(alice).toMatchObject({
            type: "node",
            shape: "participant",
            name: "Alice",
            layout: undefined
        });

        const bob = ast.statements[1];
        expect(bob).toMatchObject({
            type: "node",
            shape: "actor",
            name: "Bob",
            layout: { x: 300, y: 200 }
        });

        const msg = ast.statements[2];
        expect(msg).toMatchObject({
            type: "edge",
            from: "Alice",
            to: "Bob",
            arrow: "->>",
            label: "Hello",
            layout: { x: 150, y: 250 }
        });
    });

    it("should parse class diagrams", () => {
        const input = `
classDiagram
class User
interface Builder
User *-- Builder
        `;

        const ast = parseMermaid(input);
        expect(ast.type).toBe("Diagram");
        expect(ast.statements.length).toBe(3);
    });

    it("should parse floating layout comments", () => {
        const input = `
sequenceDiagram
%% @pos(10, 20)
        `;
        const ast = parseMermaid(input);
        expect(ast.type).toBe("Diagram");
        expect(ast.statements.length).toBe(0); // Assuming we ignore standalone comments for MVP
    });
});
