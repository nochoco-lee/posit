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
        // more pixels than the viewport requires.
        window.addEventListener('resize', () => {
            this.stage.width(container.clientWidth);
            this.stage.height(container.clientHeight);
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

