import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser/index";

describe("Diagram Type Detection Robustness", () => {
    it("should detect object diagram even without members", () => {
        const puml = `
@startuml
object obj1
@enduml
`;
        const ast = parsePlantUml(puml);
        expect(ast.diagramType).toBe('class');
    });

    it("should detect deployment diagram with many arrows and labels if node is present", () => {
        const puml = `
@startuml
node server
database db
server -> db : connect
db -> server : ok
@enduml
`;
        const ast = parsePlantUml(puml);
        expect(ast.diagramType).toBe('deployment');
    });

    it("should detect sequence diagram when 'autonumber' is used", () => {
        const puml = `
@startuml
autonumber
A -> B
@enduml
`;
        const ast = parsePlantUml(puml);
        expect(ast.diagramType).toBe('sequence');
    });
});
