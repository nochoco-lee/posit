/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import Konva from 'konva';
import { SequenceRenderer } from '../src/renderer/sequence';
import { LayoutMap } from '../src/layout/types';

describe('SequenceRenderer Arrowheads', async () => {
    let stage: Konva.Stage;
    let layer: Konva.Layer;
    let renderer: SequenceRenderer;

    beforeEach(() => {
        stage = new Konva.Stage({
            container: document.createElement('div'),
            width: 1000,
            height: 1000,
        });
        layer = new Konva.Layer();
        stage.add(layer);
        renderer = new SequenceRenderer(stage, layer);
    });

    it('should render ->> as an open arrow shape', async () => {
        const map: LayoutMap = {
            diagramType: 'sequence',
            nodes: {
                'Alice': { id: 'Alice', type: 'participant', origName: 'Alice', position: { x: 100, y: 100 }, size: { width: 100, height: 50 } },
                'Bob': { id: 'Bob', type: 'participant', origName: 'Bob', position: { x: 300, y: 100 }, size: { width: 100, height: 50 } },
            },
            connections: [
                { from: 'Alice', to: 'Bob', type: '->>', label: 'test', position: null, calculatedY: 200 }
            ],
            notes: [],
            groups: []
        };

        renderer.render(map);

        const heads = layer.find('.arrow-head');
        expect(heads.length).toBe(1);
        const head = heads[0] as Konva.Shape;
        
        // Open arrows should NOT have a fill
        expect(head.fill()).toBeUndefined();
        expect(head.stroke()).toBe('#A80036');
    });

    it('should render -> as a filled arrow shape', async () => {
        const map: LayoutMap = {
            diagramType: 'sequence',
            nodes: {
                'Alice': { id: 'Alice', type: 'participant', origName: 'Alice', position: { x: 100, y: 100 }, size: { width: 100, height: 50 } },
                'Bob': { id: 'Bob', type: 'participant', origName: 'Bob', position: { x: 300, y: 100 }, size: { width: 100, height: 50 } },
            },
            connections: [
                { from: 'Alice', to: 'Bob', type: '->', label: 'test', position: null, calculatedY: 200 }
            ],
            notes: [],
            groups: []
        };

        renderer.render(map);

        const heads = layer.find('.arrow-head');
        expect(heads.length).toBe(1);
        const head = heads[0] as Konva.Shape;
        
        // Filled arrows should have a fill
        expect(head.fill()).toBe('#A80036');
    });

    it('should render ->x as a lost message (cross)', async () => {
        const map: LayoutMap = {
            diagramType: 'sequence',
            nodes: {
                'Alice': { id: 'Alice', type: 'participant', origName: 'Alice', position: { x: 100, y: 100 }, size: { width: 100, height: 50 } },
                'Bob': { id: 'Bob', type: 'participant', origName: 'Bob', position: { x: 300, y: 100 }, size: { width: 100, height: 50 } },
            },
            connections: [
                { from: 'Alice', to: 'Bob', type: '->x', label: 'test', position: null, calculatedY: 200 }
            ],
            notes: [],
            groups: []
        };

        renderer.render(map);

        const heads = layer.find('.arrow-head');
        expect(heads.length).toBe(1);
        const head = heads[0] as Konva.Shape;
        expect(head.fill()).toBeUndefined();
    });

    it('should update arrowhead position when node is moved', async () => {
        const map: LayoutMap = {
            diagramType: 'sequence',
            nodes: {
                'Alice': { id: 'Alice', type: 'participant', origName: 'Alice', position: { x: 100, y: 100 }, size: { width: 100, height: 50 } },
                'Bob': { id: 'Bob', type: 'participant', origName: 'Bob', position: { x: 300, y: 100 }, size: { width: 100, height: 50 } },
            },
            connections: [
                { from: 'Alice', to: 'Bob', type: '->', label: 'test', position: null, calculatedY: 200 }
            ],
            notes: [],
            groups: []
        };

        renderer.render(map);

        const aliceGroup = layer.findOne('#Alice') as Konva.Group;
        const bobGroup = layer.findOne('#Bob') as Konva.Group;
        const heads = layer.find('.arrow-head');
        const head = heads[0] as Konva.Shape;

        const initialHeadX = head.x();

        // Move Bob to the right
        bobGroup.x(500);
        // Trigger dragmove logic manually or via events
        bobGroup.fire('dragmove');

        expect(head.x()).toBeGreaterThan(initialHeadX);
    });
});



