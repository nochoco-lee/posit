import { LayoutMap } from "./types";
import { IRDiagram } from "../ir/types";
import { SequenceLayoutManager } from "./sequence";
import { ClassLayoutManager } from "./class";
import { DeploymentLayoutManager } from "./deployment";

export class LayoutManager {
    public process(ir: IRDiagram): LayoutMap {
        if (ir.type !== "Diagram") {
            throw new Error("LayoutManager expects an IRDiagram node");
        }

        if (ir.diagramType === 'sequence') {
            const seqManager = new SequenceLayoutManager();
            return seqManager.process(ir);
        } else if (ir.diagramType === 'class') {
            const classManager = new ClassLayoutManager();
            return classManager.process(ir);
        } else if (ir.diagramType === 'deployment') {
            const deployManager = new DeploymentLayoutManager();
            return deployManager.process(ir);
        } else {
            // Default to sequence layout for unknown types (MVP behavior)
            const seqManager = new SequenceLayoutManager();
            return seqManager.process(ir);
        }
    }
}
