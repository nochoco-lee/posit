import { describe, it, expect } from 'vitest';
import { parsePlantUml } from '../src/parser';
import { Emitter } from '../src/layout/emitter';
import { ClassLayoutManager } from '../src/layout/class';

describe('Emitter @pos update for classes with body', () => {
    it('should NOT duplicate @pos comments when dragging multiple times', () => {
        const puml = `@startuml
class A {
    -id: int
}
@enduml`;
        const ast1 = parsePlantUml(puml);
        const layoutManager = new ClassLayoutManager();
        const map1 = layoutManager.process(ast1);
        
        // First drag
        map1.nodes['A'].position = { x: 100, y: 100 };
        const emitter = new Emitter();
        const puml2 = emitter.emitPlantUml(puml, ast1, map1);
        
        console.log('After 1st drag:', puml2);
        
        // Second drag
        const ast2 = parsePlantUml(puml2);
        const map2 = layoutManager.process(ast2);
        map2.nodes['A'].position = { x: 200, y: 200 };
        const puml3 = emitter.emitPlantUml(puml2, ast2, map2);
        
        console.log('After 2nd drag:', puml3);
        
        const matches = puml3.match(/@pos/g);
        expect(matches?.length).toBe(1);
        expect(puml3).toContain("@pos(200, 200)");
        expect(puml3).not.toContain("@pos(100, 100)");
    });
});
