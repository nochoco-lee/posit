import { describe, it, expect } from "vitest";
import { parsePlantUml } from "../src/parser/index";

describe("Diagram 3 Reproduction", () => {
    it("should parse sequence diagram_3 with HTML entities and color", () => {
        const input = `@startuml
actor Bob #red
' The only difference between actor
'and participant is the drawing
participant Alice
participant &#34;I have a really\\nlong name&#34; as L #99FF99
/' You can also declare:
   participant L as &#34;I have a really\\nlong name&#34;  #99FF99
  '/

Alice->Bob: Authentication Request
Bob->Alice: Authentication Response
Bob->L: Log transaction
@enduml`;
        const ast = parsePlantUml(input);
        expect(ast.type).toBe("Diagram");
    });

    it("should parse class diagram_3 with HTML entities and complex arrows", () => {
        const input = `@startuml
Class11 &lt;|.. Class12
Class13 --&gt; Class14
Class15 ..&gt; Class16
Class17 ..|&gt; Class18
Class19 &lt;--* Class20
@enduml`;
        const ast = parsePlantUml(input);
        expect(ast.type).toBe("Diagram");
    });
});
