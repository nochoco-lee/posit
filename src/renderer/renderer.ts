import Konva from 'konva';
import { LayoutMap } from "../layout/types";
import { SequenceRenderer } from './sequence';
import { ClassRenderer } from './class';
import { DeploymentRenderer } from './deployment';

export class LayoutPumlRenderer {
    public stage: Konva.Stage;
    private layer: Konva.Layer;
    private onNodeMoveCallback?: (id: string, newX: number, newY: number) => void;

    private sequenceRenderer: SequenceRenderer;
    private classRenderer: ClassRenderer;
    private deploymentRenderer: DeploymentRenderer;

    private contentWidth: number = 0;
    private contentHeight: number = 0;

    constructor(containerId: string) {
        const container = document.getElementById(containerId)!;
        const w = container.clientWidth || 1200;
        const h = container.clientHeight || 800;

        this.stage = new Konva.Stage({
            container: containerId,
            width: w,
            height: h,
        });

        this.layer = new Konva.Layer();
        this.stage.add(this.layer);

        this.sequenceRenderer = new SequenceRenderer(this.stage, this.layer);
        this.classRenderer = new ClassRenderer(this.stage, this.layer);
        this.deploymentRenderer = new DeploymentRenderer(this.stage, this.layer);

        // Resize the stage when the window resizes so we never paint
        // more pixels than the viewport requires, but don't shrink below content.
        window.addEventListener('resize', () => {
            const w = container.clientWidth;
            const h = container.clientHeight;
            this.stage.width(Math.max(w, this.contentWidth));
            this.stage.height(Math.max(h, this.contentHeight));
        });
    }

    public onDragEnd(callback: (id: string, newX: number, newY: number) => void) {
        this.onNodeMoveCallback = callback;
        this.sequenceRenderer.setOnDragEnd(callback);
        this.classRenderer.setOnDragEnd(callback);
        this.deploymentRenderer.setOnDragEnd(callback);
    }

    public render(map: LayoutMap) {
        if (map.diagramType === 'sequence') {
            this.sequenceRenderer.render(map);
        } else if (map.diagramType === 'class') {
            this.classRenderer.render(map);
        } else if (map.diagramType === 'deployment') {
            this.deploymentRenderer.render(map);
        } else {
            // Default to sequence for unknown
            this.sequenceRenderer.render(map);
        }

        this.fitStageToContent(map);
    }

    private fitStageToContent(map: LayoutMap) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        const nodes = Object.values(map.nodes);
        if (nodes.length === 0 && (!map.notes || map.notes.length === 0) && (!map.groups || map.groups.length === 0)) return;

        nodes.forEach(n => {
            minX = Math.min(minX, n.position.x);
            minY = Math.min(minY, n.position.y);
            maxX = Math.max(maxX, n.position.x + n.size.width);
            maxY = Math.max(maxY, n.position.y + n.size.height);
        });
        if (map.notes) map.notes.forEach(n => {
            minX = Math.min(minX, n.position.x);
            minY = Math.min(minY, n.position.y);
            maxX = Math.max(maxX, n.position.x + n.size.width);
            maxY = Math.max(maxY, n.position.y + n.size.height);
        });
        if (map.groups) map.groups.forEach(g => {
            minX = Math.min(minX, g.position.x);
            minY = Math.min(minY, g.position.y);
            maxX = Math.max(maxX, g.position.x + g.size.width);
            maxY = Math.max(maxY, g.position.y + g.size.height);
        });
        map.connections.forEach(c => {
            if (c.position) {
                maxX = Math.max(maxX, c.position.x + 200);
                maxY = Math.max(maxY, c.position.y + 20);
            }
            if (c.calculatedY !== undefined) {
                maxY = Math.max(maxY, c.calculatedY + 20);
            }
        });

        const padding = 40;
        this.contentWidth = maxX - minX + padding * 2;
        this.contentHeight = maxY - minY + padding * 2;
        const container = this.stage.container();
        const containerW = container.clientWidth || 1200;
        const containerH = container.clientHeight || 800;

        this.stage.width(Math.max(this.contentWidth, containerW));
        this.stage.height(Math.max(this.contentHeight, containerH));
        this.stage.offsetX(minX > 0 ? 0 : -minX + padding);
        this.stage.offsetY(minY > 0 ? 0 : -minY + padding);
    }

    public syncPositions(map: LayoutMap) {
        if (map.diagramType === 'sequence' || map.diagramType === 'unknown') {
            this.sequenceRenderer.syncPositions(map);
        } else if (map.diagramType === 'class') {
            this.classRenderer.syncPositions(map);
        } else if (map.diagramType === 'deployment') {
            this.deploymentRenderer.syncPositions(map);
        }
    }

    /** Called by main.ts to toggle shadow rendering off during drag for performance */
    public setDragging(isDragging: boolean) {
        this.sequenceRenderer.setDragging(isDragging);
        this.classRenderer.setDragging(isDragging);
        this.deploymentRenderer.setDragging(isDragging);
    }
}

