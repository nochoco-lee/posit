import { describe, it, expect } from 'vitest';
import { parsePlantUml } from '../src/parser';
import { ClassLayoutManager } from '../src/layout/class';

describe('Diagram 2 Layout Reproduction', async () => {
    it('should layout independent pairs horizontally', async () => {
        const puml = `@startuml
Class01 <|-- Class02
Class03 *-- Class04
Class05 o-- Class06
Class07 .. Class08
Class09 -- Class10
@enduml`;
        const ast = await parsePlantUml(puml);
        const layoutManager = new ClassLayoutManager();
        const map = layoutManager.process(ast);

        // Class01, 03, 05, 07, 09 should be at the same Y (Rank 0)
        const y0 = map.nodes['Class01'].position.y;
        expect(map.nodes['Class03'].position.y).toBe(y0);
        expect(map.nodes['Class05'].position.y).toBe(y0);
        expect(map.nodes['Class07'].position.y).toBe(y0);
        expect(map.nodes['Class09'].position.y).toBe(y0);

        // Class01, 03, 05, 07, 09 should have increasing X
        expect(map.nodes['Class03'].position.x).toBeGreaterThan(map.nodes['Class01'].position.x);
        expect(map.nodes['Class05'].position.x).toBeGreaterThan(map.nodes['Class03'].position.x);

        // Class02, 04, 06, 08, 10 should be at a lower Y (Rank 1)
        const y1 = map.nodes['Class02'].position.y;
        expect(y1).toBeGreaterThan(y0);
        expect(map.nodes['Class04'].position.y).toBe(y1);
        expect(map.nodes['Class06'].position.y).toBe(y1);
        expect(map.nodes['Class08'].position.y).toBe(y1);
        expect(map.nodes['Class10'].position.y).toBe(y1);

        // Class02 should be directly below Class01 (same X)
        expect(map.nodes['Class02'].position.x).toBe(map.nodes['Class01'].position.x);
        expect(map.nodes['Class04'].position.x).toBe(map.nodes['Class03'].position.x);
    });
});



