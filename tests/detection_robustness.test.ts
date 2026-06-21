import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser/index";

describe("Diagram Type Detection Robustness", async () => {
    it("should detect object diagram even without members", async () => {
        const puml = `
@startuml
object obj1
@enduml
`;
        const ast = await parsePlantUml(puml);
        expect(ast.diagramType).toBe('class');
    });

    it("should detect deployment diagram with many arrows and labels if node is present", async () => {
        const puml = `
@startuml
node server
database db
server -> db : connect
db -> server : ok
@enduml
`;
        const ast = await parsePlantUml(puml);
        expect(ast.diagramType).toBe('deployment');
    });

    it("should detect sequence diagram when 'autonumber' is used", async () => {
        const puml = `
@startuml
autonumber
A -> B
@enduml
`;
        const ast = await parsePlantUml(puml);
        expect(ast.diagramType).toBe('sequence');
    });
});



