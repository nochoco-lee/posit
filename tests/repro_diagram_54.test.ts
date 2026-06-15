import { it, expect } from "vitest";
import { parsePlantUml } from "../src/parser/index";

it("should parse diagram_54.puml content", () => {
    const puml = `@startuml
?-> Alice    : ""?->""\\n**short** to actor1
[-> Alice    : ""[->""\\n**from start** to actor1
[-> Bob      : ""[->""\\n**from start** to actor2
?-> Bob      : ""?->""\\n**short** to actor2
Alice ->]    : ""->]""\\nfrom actor1 **to end**
Alice ->?    : ""->?""\\n**short** from actor1
Alice -> Bob : ""->"" \\nfrom actor1 to actor2
@enduml`;
    expect(() => parsePlantUml(puml)).not.toThrow();
});
