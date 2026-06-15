import { IRDiagram, IREdge, IRNode, IRStatement } from "../ir/types";
import { LayoutMap } from "./types";

export class Emitter {
    /**
     * Applies new layout positions to the original PlantUML source text.
     */
    public emitPlantUml(originalText: string, ir: IRDiagram, layoutMap: LayoutMap): string {
        if (ir.type !== "Diagram") {
            throw new Error("Emitter expects a Diagram IR node");
        }

        const patches: Array<{ start: number; end: number; replacement: string }> = [];

        // Note: For MVP we use node name/id matching to find the AST statement
        const statements = ir.statements;

        for (const [id, layoutNode] of Object.entries(layoutMap.nodes)) {
            // Find corresponding participant/class declaration
            const nodeStatement = statements.find((s: IRStatement) => 
                s && s.type === "node" && (s as IRNode).name === id
            );
            if (nodeStatement && nodeStatement.offset) {
                const patch = this.createPatchContext(nodeStatement, layoutNode.position);
                if (patch) patches.push(patch);
            }
        }

        for (const conn of layoutMap.connections) {
            // Find corresponding connection
            const connStatement = statements.find((s: IRStatement) => {
                if (!s || s.type !== "edge") return false;
                const edge = s as IREdge;
                if (edge.from !== conn.from || edge.to !== conn.to) return false;
                
                // Normalize labels for comparison (strip whitespace)
                const normIrLabel = (edge.label || "").replace(/\s+/g, "");
                const normLayoutLabel = (conn.label || "").replace(/\s+/g, "");
                return normIrLabel === normLayoutLabel;
            });
            
            if (connStatement && connStatement.offset && conn.position) {
                const patch = this.createPatchContext(connStatement, conn.position);
                if (patch) patches.push(patch);
            }
            // If connection has no position in LayoutMap, it might have been deleted, or it's default auto-routed. 
            // We only emit where position is explicitly provided by the layout manager.
        }

        // Sort patches in reverse order by start index to avoid invalidating offsets!
        patches.sort((a, b) => b.start - a.start);

        let resultText = originalText;
        for (const patch of patches) {
            resultText = 
                resultText.substring(0, patch.start) + 
                patch.replacement + 
                resultText.substring(patch.end);
        }

        return resultText;
    }

    private createPatchContext(statement: IRStatement, position: { x: number; y: number }): { start: number; end: number; replacement: string } | null {
        const offset = statement.offset;
        if (!offset || offset.start === undefined || offset.end === undefined || isNaN(offset.start) || isNaN(offset.end)) return null;

        const replacementStr = ` /' @pos(${position.x}, ${position.y}) '/`;

        if (offset.layoutStart !== undefined && offset.layoutEnd !== undefined) {
            // Update existing comment layoutStart points to `/'` and layoutEnd points to `'/`
            // Chevrotain endOffset is inclusive, so we need + 1
            return {
                start: offset.layoutStart,
                end: offset.layoutEnd + 1,
                replacement: replacementStr.trim() // no leading space needed if we replace exact bounds
            };
        } else {
            // Inject new comment at the end of the statement (before newline)
            return {
                start: offset.end + 1,
                end: offset.end + 1,
                replacement: replacementStr
            };
        }
    }
}
