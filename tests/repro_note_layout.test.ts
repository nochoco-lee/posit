
import { describe, it, expect } from "vitest";
import { ClassLayoutManager } from "../src/layout/class";
import { parsePlantUml } from "../src/parser/index";

describe("Class Diagram Note Layout", () => {
    it("should position 'note left' next to the last defined class when no target is specified", () => {
        const input = `
@startuml
class Foo
note left: On last defined class
@enduml
`;
        const ir = parsePlantUml(input);

        const layoutManager = new ClassLayoutManager();
        const layout = layoutManager.process(ir);

        const fooNode = layout.nodes["Foo"];
        const note = layout.notes.find(n => n.text === "On last defined class");

        expect(fooNode).toBeDefined();
        expect(note).toBeDefined();
        
        // Note should be to the left of Foo
        expect(note!.position.x).toBeLessThan(fooNode!.position.x);
        // Note should be at roughly the same Y as Foo
        expect(Math.abs(note!.position.y - fooNode!.position.y)).toBeLessThan(50);
    });

    it("should position 'note right' next to the last defined class", () => {
        const input = `
@startuml
class Foo
note right: On last defined class
@enduml
`;
        const ir = parsePlantUml(input);
        const layoutManager = new ClassLayoutManager();
        const layout = layoutManager.process(ir);

        const fooNode = layout.nodes["Foo"];
        const note = layout.notes.find(n => n.text === "On last defined class");

        expect(note!.position.x).toBeGreaterThan(fooNode!.position.x);
        expect(Math.abs(note!.position.y - fooNode!.position.y)).toBeLessThan(50);
    });

    it("should position 'note top' above the last defined class", () => {
        const input = `
@startuml
class Foo
note top: On last defined class
@enduml
`;
        const ir = parsePlantUml(input);
        const layoutManager = new ClassLayoutManager();
        const layout = layoutManager.process(ir);

        const fooNode = layout.nodes["Foo"];
        const note = layout.notes.find(n => n.text === "On last defined class");

        expect(note!.position.y).toBeLessThan(fooNode!.position.y);
        expect(Math.abs(note!.position.x - fooNode!.position.x)).toBeLessThan(50);
    });

    it("should position 'note bottom' below the last defined class", () => {
        const input = `
@startuml
class Foo
note bottom: On last defined class
@enduml
`;
        const ir = parsePlantUml(input);
        const layoutManager = new ClassLayoutManager();
        const layout = layoutManager.process(ir);

        const fooNode = layout.nodes["Foo"];
        const note = layout.notes.find(n => n.text === "On last defined class");

        expect(note!.position.y).toBeGreaterThan(fooNode!.position.y);
        expect(Math.abs(note!.position.x - fooNode!.position.x)).toBeLessThan(50);
    });
});
