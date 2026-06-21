import { describe, it, expect } from 'vitest';
import { parsePlantUml } from '../src/parser/index';

describe('Reproduction: diagram_38.puml', async () => {
    it('should parse class with generic containing ? and extends', async () => {
        const puml = `
@startuml
class Foo<? extends Element> {
  int size()
}
Foo *- Element
@enduml
`;
        const ast = await parsePlantUml(puml);
        expect(ast.type).toBe("Diagram");
    });
});



