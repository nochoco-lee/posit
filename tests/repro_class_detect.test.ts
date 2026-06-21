import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser/index";

describe("Diagram Type Detection", async () => {
    it("should detect class diagram when 'class' keyword is used", async () => {
        const puml = `
@startuml
class AuthService
class ABC
@enduml
`;
        const ast = await parsePlantUml(puml);
        expect(ast.diagramType).toBe('class');
    });

    it("should detect sequence diagram when 'participant' is used", async () => {
        const puml = `
@startuml
participant Alice
@enduml
`;
        const ast = await parsePlantUml(puml);
        expect(ast.diagramType).toBe('sequence');
    });

    it("should detect sequence diagram when arrows are used without class keywords", async () => {
        const puml = `
@startuml
Alice -> Bob: hello
@enduml
`;
        const ast = await parsePlantUml(puml);
        expect(ast.diagramType).toBe('sequence');
    });

    it("should detect sequence diagram when 'class' is used as a participant shape but arrows are sequence-style", async () => {
        const puml = `
@startuml
class A
A ->> B: message
@enduml
`;
        const ast = await parsePlantUml(puml);
        expect(ast.diagramType).toBe('sequence');
    });
});



