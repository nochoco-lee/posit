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
        this.stage = new Konva.Stage({
            container: containerId,
            width: window.innerWidth - 400, // Subtract editor width
            height: window.innerHeight,
        });

        this.layer = new Konva.Layer();
        this.stage.add(this.layer);

        this.sequenceRenderer = new SequenceRenderer(this.stage, this.layer);
        this.classRenderer = new ClassRenderer(this.stage, this.layer);
        this.deploymentRenderer = new DeploymentRenderer(this.stage, this.layer);

        // Handle window resize
        window.addEventListener('resize', () => {
            this.stage.width(window.innerWidth - 400);
            this.stage.height(window.innerHeight);
        });
    }

    public onMove(callback: (id: string, newX: number, newY: number) => void) {
        this.onNodeMoveCallback = callback;
        this.sequenceRenderer.setOnNodeMove(callback);
        this.classRenderer.setOnNodeMove(callback);
        this.deploymentRenderer.setOnNodeMove(callback);
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
        }
        // ClassRenderer sync could be added later if needed
    }
}
