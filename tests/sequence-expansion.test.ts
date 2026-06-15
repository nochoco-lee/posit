import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser/index";
import { IRGroup, IRNote, IRActivation, IREdge } from "../src/ir/types";
import { LayoutManager } from "../src/layout/engine";

describe("Sequence Diagram Expansion", () => {
    it("should parse expanded message types and activation shortcuts", () => {
        const input = `
@startuml
A ->> B : Head 1
B -->> A : Head 2
A ->+ B : Activate shortcut
B -->- A : Deactivate shortcut
A -x B : Lost
B x--x A : Both lost
A ->o B : Open circle
@enduml
    `;
        const ast = parsePlantUml(input);
        expect(ast.statements.length).toBe(7);

        expect((ast.statements[0] as IREdge).arrow).toBe("->>");
        expect((ast.statements[1] as IREdge).arrow).toBe("-->>");
        expect((ast.statements[2] as IREdge).arrow).toBe("->+");
        expect((ast.statements[3] as IREdge).arrow).toBe("-->-");
        expect((ast.statements[4] as IREdge).arrow).toBe("-x");
        expect((ast.statements[5] as IREdge).arrow).toBe("x--x");
        expect((ast.statements[6] as IREdge).arrow).toBe("->o");
    });

    it("should parse expanded diagram_14 arrow types", () => {
        const input = `
@startuml
Bob ->x Alice
Bob -> Alice
Bob ->> Alice
Bob -\\ Alice
Bob \\\\- Alice
Bob //-- Alice

Bob ->o Alice
Bob o\\\\-- Alice

Bob <-> Alice
Bob <->o Alice
@enduml
        `;
        const ast = parsePlantUml(input);
        expect(ast.statements.length).toBe(10);

        const layoutManager = new LayoutManager();
        layoutManager.process(ast);
    });

    it("should parse expanded diagram_15 colored arrows", () => {
        const input = `
@startuml
Bob -[#red]> Alice : hello
Alice -[#0000FF]->Bob : ok
@enduml
        `;
        const ast = parsePlantUml(input);
        expect(ast.statements.length).toBe(2);

        const layoutManager = new LayoutManager();
        layoutManager.process(ast);
    });

    it("should parse grouping blocks (alt, else, opt, loop)", () => {
        const input = `
@startuml
alt success
    A -> B : ok
else failure
    A -> B : error
end
opt maybe
    A -> C : optional
end
loop 10 times
    B -> C : repeat
end
@enduml
    `;
        const ast = parsePlantUml(input);
        expect(ast.statements.length).toBe(3);

        const altGroup = ast.statements[0] as IRGroup;
        expect(altGroup.type).toBe("group");
        expect(altGroup.keyword).toBe("alt");
        expect(altGroup.sections.length).toBe(2);
        expect(altGroup.sections[0].label).toBe("success");
        expect(altGroup.sections[1].label).toBe("failure");

        const optGroup = ast.statements[1] as IRGroup;
        expect(optGroup.keyword).toBe("opt");
        expect(optGroup.label).toBe("maybe");

        const loopGroup = ast.statements[2] as IRGroup;
        expect(loopGroup.keyword).toBe("loop");
        expect(loopGroup.label).toBe("10 times");
    });

    it("should parse notes", () => {
        const input = `
@startuml
note left of Alice : hello
note right of Bob : hi
note over Alice, Bob : together
note across : everyone
@enduml
    `;
        const ast = parsePlantUml(input);
        expect(ast.statements.length).toBe(4);

        expect((ast.statements[0] as IRNote).placement).toBe("left");
        expect((ast.statements[0] as IRNote).targets).toContain("Alice");
        expect((ast.statements[0] as IRNote).text).toBe("hello");

        expect((ast.statements[1] as IRNote).placement).toBe("right");
        expect((ast.statements[1] as IRNote).targets).toContain("Bob");

        expect((ast.statements[2] as IRNote).placement).toBe("over");
        expect((ast.statements[2] as IRNote).targets).toContain("Alice");
        expect((ast.statements[2] as IRNote).targets).toContain("Bob");

        expect((ast.statements[3] as IRNote).placement).toBe("across");
    });

    it("should parse activation commands", () => {
        const input = `
@startuml
activate Alice
deactivate Alice
destroy Bob
@enduml
    `;
        const ast = parsePlantUml(input);
        expect(ast.statements.length).toBe(3);

        expect((ast.statements[0] as IRActivation).action).toBe("activate");
        expect((ast.statements[0] as IRActivation).target).toBe("Alice");

        expect((ast.statements[1] as IRActivation).action).toBe("deactivate");
        expect((ast.statements[2] as IRActivation).action).toBe("destroy");
    });
});
