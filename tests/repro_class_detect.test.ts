import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser/index";

describe("Diagram Type Detection", () => {
    it("should detect class diagram when 'class' keyword is used", () => {
        const puml = `
@startuml
class AuthService
class ABC
@enduml
`;
        const ast = parsePlantUml(puml);
        expect(ast.diagramType).toBe('class');
    });

    it("should detect sequence diagram when 'participant' is used", () => {
        const puml = `
@startuml
participant Alice
@enduml
`;
        const ast = parsePlantUml(puml);
        expect(ast.diagramType).toBe('sequence');
    });

    it("should detect sequence diagram when arrows are used without class keywords", () => {
        const puml = `
@startuml
Alice -> Bob: hello
@enduml
`;
        const ast = parsePlantUml(puml);
        expect(ast.diagramType).toBe('sequence');
    });

    it("should detect sequence diagram when 'class' is used as a participant shape but arrows are sequence-style", () => {
        const puml = `
@startuml
class A
A ->> B: message
@enduml
`;
        const ast = parsePlantUml(puml);
        expect(ast.diagramType).toBe('sequence');
    });
});
