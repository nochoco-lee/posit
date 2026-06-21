import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser/index";
import { IRNode, IREdge } from "../src/ir/types";

describe("Class Diagram Expansion", async () => {
    it("should parse class members (fields and methods)", async () => {
        const input = `
@startuml
class User {
    - id : string
    + name : string
    # role : string
    ~ internal : bool
    {static} + create() : User
    {abstract} # update(id: string) : void
}
@enduml
    `;
        const ast = await parsePlantUml(input);
        expect(ast.statements.length).toBe(1);

        const userClass = ast.statements[0] as IRNode;
        expect(userClass.name).toBe("User");
        expect(userClass.members?.length).toBe(6);

        expect(userClass.members?.[0]).toMatchObject({
            visibility: "-",
            name: "id",
            type: "string"
        });

        expect(userClass.members?.[4]).toMatchObject({
            visibility: "+",
            isStatic: true,
            name: "create",
            type: "User",
            parameters: []
        });

        expect(userClass.members?.[5]).toMatchObject({
            visibility: "#",
            isAbstract: true,
            name: "update",
            type: "void",
            parameters: ["id: string"]
        });
    });

    it("should parse generics", async () => {
        const input = `
@startuml
class List~T~ {
    + add(item: T)
}
@enduml
    `;
        const ast = await parsePlantUml(input);
        expect(ast.statements.length).toBe(1);

        const listClass = ast.statements[0] as IRNode;
        expect(listClass.name).toBe("List~T~");
        expect(listClass.members?.[0].name).toBe("add");
    });

    it("should parse cardinality", async () => {
        const input = `
@startuml
User "1" *-- "many" Order
@enduml
    `;
        const ast = await parsePlantUml(input);
        expect(ast.statements.length).toBe(1);

        const edge = ast.statements[0] as IREdge;
        expect(edge.from).toBe("User");
        expect(edge.fromLabel).toBe("1");
        expect(edge.to).toBe("Order");
        expect(edge.toLabel).toBe("many");
        expect(edge.arrow).toBe("*--");
    });
});



