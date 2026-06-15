import { describe, it, expect } from 'vitest';
import { parsePlantUml } from '../src/parser';
import { Emitter } from '../src/layout/emitter';
import { SequenceLayoutManager } from '../src/layout/sequence';

describe('Emitter implicit participant auto-generation', () => {
    it('should generate participant tags for implicit participants', () => {
        const puml = `@startuml
A -> B
@enduml`;
        const ast = parsePlantUml(puml);
        const layoutManager = new SequenceLayoutManager();
        const map = layoutManager.process(ast);
        
        // Move A and B
        map.nodes['A'].position = { x: 100, y: 100 };
        map.nodes['B'].position = { x: 300, y: 100 };
        
        const emitter = new Emitter();
        const updatedPuml = emitter.emitPlantUml(puml, ast, map);
        
        expect(updatedPuml).toContain("participant A /' @pos(100, 100) '/");
        expect(updatedPuml).toContain("participant B /' @pos(300, 100) '/");
        expect(updatedPuml).toContain("A -> B");
    });

    it('should generate participant tags for implicit participants in Mermaid', () => {
        const mermaid = `sequenceDiagram
A->>B: hi`;
        const ast = {
            type: "Diagram",
            syntax: "mermaid",
            diagramType: "sequence",
            statements: [
                { type: "edge", from: "A", to: "B", arrow: "->>", label: "hi", offset: { start: 16, end: 25 } }
            ]
        };
        const layoutMap = {
            diagramType: 'sequence',
            nodes: {
                'A': { id: 'A', type: 'participant', position: { x: 100, y: 100 }, size: { width: 100, height: 50 } },
                'B': { id: 'B', type: 'participant', position: { x: 300, y: 100 }, size: { width: 100, height: 50 } }
            },
            connections: [],
            groups: [],
            notes: []
        };
        
        const emitter = new Emitter();
        const updatedMermaid = emitter.emitPlantUml(mermaid, ast as any, layoutMap as any);
        
        expect(updatedMermaid).toContain("participant A %% @pos(100, 100)");
        expect(updatedMermaid).toContain("participant B %% @pos(300, 100)");
        expect(updatedMermaid).toContain("A->>B: hi");
    });

    it('should update auto-generated participant tags on subsequent moves', () => {
        const puml = `@startuml
A -> B
@enduml`;
        const ast1 = parsePlantUml(puml);
        const layoutManager = new SequenceLayoutManager();
        const map1 = layoutManager.process(ast1);
        
        // Move A
        map1.nodes['A'].position = { x: 100, y: 100 };
        
        const emitter = new Emitter();
        const puml2 = emitter.emitPlantUml(puml, ast1, map1);
        
        expect(puml2).toContain("participant A /' @pos(100, 100) '/");
        
        // Second move
        const ast2 = parsePlantUml(puml2);
        const map2 = layoutManager.process(ast2);
        map2.nodes['A'].position = { x: 200, y: 200 };
        
        const puml3 = emitter.emitPlantUml(puml2, ast2, map2);
        
        expect(puml3).toContain("participant A /' @pos(200, 200) '/");
        expect(puml3).not.toContain("@pos(100, 100)");
        // Count @pos
        const matches = puml3.match(/@pos/g);
        expect(matches?.length).toBe(2);
    });
});
