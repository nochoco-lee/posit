import { describe, it, expect } from 'vitest';
import { parsePlantUml } from '../src/parser';
import { Emitter } from '../src/layout/emitter';
import { ClassLayoutManager } from '../src/layout/class';

describe('Emitter @pos update', () => {
    it('should replace existing @pos comment instead of appending', () => {
        const puml = `@startuml
class A /' @pos(10, 10) '/
@enduml`;
        const ast = parsePlantUml(puml);
        const layoutManager = new ClassLayoutManager();
        const map = layoutManager.process(ast);
        
        // Simulate move
        map.nodes['A'].position = { x: 100, y: 100 };
        
        const emitter = new Emitter();
        const updatedPuml = emitter.emitPlantUml(puml, ast, map);
        
        // Count occurrences of @pos
        const matches = updatedPuml.match(/@pos/g);
        expect(matches?.length).toBe(1);
        expect(updatedPuml).toContain("@pos(100, 100)");
        expect(updatedPuml).not.toContain("@pos(10, 10)");
    });
});
