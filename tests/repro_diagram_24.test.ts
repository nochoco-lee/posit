import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser/index";

describe("Diagram 24: footer and newpage", async () => {
    it("should parse diagram with footer and multiple newpages", async () => {
        const input = `@startuml
footer This is %page% of %lastpage%
Alice --> Bob : A1
newpage
Alice --> Bob : A2
newpage
Alice --> Bob : A3
newpage
Alice --> Bob : A4
@enduml`;
        const ast = await parsePlantUml(input);
        expect(ast.type).toBe("Diagram");
    });
});



