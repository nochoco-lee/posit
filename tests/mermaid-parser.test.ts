import { describe, it, expect } from "vitest";
import { parseMermaid } from "../src/mermaid/index";

describe("Mermaid JS Parser", async () => {
    it("should parse sequence diagrams with layout metadata", async () => {
        const input = `
sequenceDiagram
participant Alice
actor Bob %% @pos(300, 200)
Alice->>Bob: Hello %% @pos(150, 250)
        `;

        const ast = await parseMermaid(input);

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

    it("should parse class diagrams", async () => {
        const input = `
classDiagram
class User
interface Builder
User *-- Builder
        `;

        const ast = await parseMermaid(input);
        expect(ast.type).toBe("Diagram");
        expect(ast.statements.length).toBe(3);
    });

    it("should parse floating layout comments", async () => {
        const input = `
sequenceDiagram
%% @pos(10, 20)
        `;
        const ast = await parseMermaid(input);
        expect(ast.type).toBe("Diagram");
        expect(ast.statements.length).toBe(0); // Assuming we ignore standalone comments for MVP
    });

    it("should convert <br/> to newline in flowchart bracket labels", async () => {
        const input = `
flowchart LR
    A[First<br/>Second]
        `;
        const ast = await parseMermaid(input);
        const nodeA = ast.statements.find((s: any) => s.type === 'node' && s.name === 'A');
        expect(nodeA).toBeDefined();
        expect(nodeA.origName).toBe("First\nSecond");
    });

    it("should convert <br> to newline in flowchart bracket labels", async () => {
        const input = `
flowchart LR
    A[First<br>Second]
        `;
        const ast = await parseMermaid(input);
        const nodeA = ast.statements.find((s: any) => s.type === 'node' && s.name === 'A');
        expect(nodeA).toBeDefined();
        expect(nodeA.origName).toBe("First\nSecond");
    });

    it("should convert <br/> to newline in flowchart paren labels", async () => {
        const input = `
flowchart LR
    A(First<br/>Second)
        `;
        const ast = await parseMermaid(input);
        const nodeA = ast.statements.find((s: any) => s.type === 'node' && s.name === 'A');
        expect(nodeA).toBeDefined();
        expect(nodeA.origName).toBe("First\nSecond");
    });

    it("should convert <br/> to newline in flowchart edge labels", async () => {
        const input = `
flowchart LR
    A -->|First<br/>Second| B
        `;
        const ast = await parseMermaid(input);
        const edge = ast.statements.find((s: any) => s.type === 'edge');
        expect(edge).toBeDefined();
        expect(edge.label).toBe("First\nSecond");
    });

    it("should convert <br/> to newline in sequence diagram messages", async () => {
        const input = `
sequenceDiagram
    Alice->>Bob: Hello<br/>World
        `;
        const ast = await parseMermaid(input);
        const msg = ast.statements.find((s: any) => s.type === 'edge');
        expect(msg).toBeDefined();
        expect(msg.label).toBe("Hello\nWorld");
    });

    it("should convert <br/> to newline in sequence diagram participant aliases", async () => {
        const input = `
sequenceDiagram
    participant Alice as Alice<br/>Johnson
        `;
        const ast = await parseMermaid(input);
        const alice = ast.statements.find((s: any) => s.type === 'node' && s.origName === 'Alice\nJohnson');
        expect(alice).toBeDefined();
        expect(alice.name).toBe("Alice\nJohnson");
        expect(alice.origName).toBe("Alice\nJohnson");
    });
});



