import { IRDiagram, IREdge, IRNode, IRStatement, IRGroup, IRContainer, IRDivider, IRNote } from "../ir/types";
import { LayoutMap } from "./types";

export class Emitter {
    /**
     * Applies new layout positions to the original source text.
     */
    public emitPlantUml(originalText: string, ir: IRDiagram, layoutMap: LayoutMap): string {
        if (ir.type !== "Diagram") {
            throw new Error("Emitter expects a Diagram IR node");
        }

        const patches: Array<{ start: number; end: number; replacement: string }> = [];
        const syntax = ir.syntax || 'plantuml';

        // Recursive search helper to find all statements
        const findAll = (stmts: IRStatement[]): IRStatement[] => {
            let results: IRStatement[] = [];
            for (const s of stmts) {
                if (!s) continue;
                results.push(s);
                if (s.type === 'container') {
                    results = results.concat(findAll((s as IRContainer).statements));
                } else if (s.type === 'group') {
                    results = results.concat(findAll((s as IRGroup).sections.flatMap(sec => sec.statements)));
                }
            }
            return results;
        };

        const allStatements = findAll(ir.statements);

        for (const [id, layoutNode] of Object.entries(layoutMap.nodes)) {
            // Find corresponding participant/class declaration (now recursive)
            const matches = allStatements.filter((s: IRStatement) => 
                s && s.type === "node" && (s as IRNode).name === id
            );
            
            const withPos = matches.filter(s => s.offset?.layoutStart !== undefined);
            if (withPos.length > 0) {
                for (const s of withPos) {
                    const patch = this.createPatchContext(s, layoutNode.position, syntax);
                    if (patch) patches.push(patch);
                }
            } else if (matches.length > 0) {
                const patch = this.createPatchContext(matches[0], layoutNode.position, syntax);
                if (patch) patches.push(patch);
            } else {
                // Implicit node - auto-generate declaration for sequence diagrams
                if (ir.diagramType === 'sequence') {
                    const insertionPoint = this.findInsertionPoint(originalText, syntax);
                    const declaration = syntax === 'mermaid' 
                        ? `    participant ${id} %% @pos(${layoutNode.position.x}, ${layoutNode.position.y})\n`
                        : `participant ${id} /' @pos(${layoutNode.position.x}, ${layoutNode.position.y}) '/\n`;
                    
                    patches.push({
                        start: insertionPoint,
                        end: insertionPoint,
                        replacement: declaration
                    });
                }
            }
        }

        for (const conn of layoutMap.connections) {
            // Find corresponding connection (now recursive)
            const matches = allStatements.filter((s: IRStatement) => {
                if (!s || s.type !== "edge") return false;
                const edge = s as IREdge;
                if (edge.from !== conn.from || edge.to !== conn.to) return false;
                
                // Normalize labels for comparison (strip whitespace)
                const normIrLabel = (edge.label || "").replace(/\s+/g, "");
                const normLayoutLabel = (conn.label || "").replace(/\s+/g, "");
                return normIrLabel === normLayoutLabel;
            });
            
            const withPos = matches.filter(s => s.offset?.layoutStart !== undefined);
            if (withPos.length > 0) {
                for (const s of withPos) {
                    const patch = this.createPatchContext(s, conn.position!, syntax);
                    if (patch) patches.push(patch);
                }
            } else if (matches.length > 0 && conn.position) {
                const patch = this.createPatchContext(matches[0], conn.position, syntax);
                if (patch) patches.push(patch);
            }
        }

        for (const group of layoutMap.groups) {
             const matches = allStatements.filter((s: IRStatement) => {
                if (s.type === 'group') {
                    const g = s as IRGroup;
                    return (g.label || '') === group.label && g.keyword === group.keyword;
                }
                if (s.type === 'container') {
                    const c = s as IRContainer;
                    return (c.name || '') === group.label && c.keyword === group.keyword;
                }
                if (s.type === 'ref') {
                    const r = s as any;
                    return r.text === group.label && group.keyword === 'ref';
                }
                if (s.type === 'mainframe') {
                    const m = s as any;
                    return m.label === group.label && group.keyword === 'mainframe';
                }
                return false;
             });

            const withPos = matches.filter(s => s.offset?.layoutStart !== undefined);
            if (withPos.length > 0) {
                for (const s of withPos) {
                    const patch = this.createPatchContext(s, group.position, syntax);
                    if (patch) patches.push(patch);
                }
            } else if (matches.length > 0) {
                const patch = this.createPatchContext(matches[0], group.position, syntax);
                if (patch) patches.push(patch);
            }
        }

        if (layoutMap.dividers) {
            for (const div of layoutMap.dividers) {
                const irDiv = allStatements.find((s: IRStatement) => s.type === 'divider' && (s as IRDivider).label === div.label);
                if (irDiv && irDiv.offset && div.position) {
                    const patch = this.createPatchContext(irDiv, div.position, syntax);
                    if (patch) patches.push(patch);
                }
            }
        }

        for (const note of layoutMap.notes) {
            const irNote = allStatements.find((s: IRStatement) => s.type === 'note' && (s as IRNote).text === note.text);
            if (irNote && irNote.offset && note.position) {
                const patch = this.createPatchContext(irNote, note.position, syntax);
                if (patch) patches.push(patch);
            }
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

    private createPatchContext(statement: IRStatement, position: { x: number; y: number }, syntax: 'plantuml' | 'mermaid'): { start: number; end: number; replacement: string } | null {
        const offset = statement.offset;
        if (!offset || offset.start === undefined || offset.end === undefined || isNaN(offset.start) || isNaN(offset.end)) return null;

        const replacementStr = syntax === 'mermaid' 
            ? ` %% @pos(${position.x}, ${position.y})`
            : ` /' @pos(${position.x}, ${position.y}) '/`;

        if (offset.layoutStart !== undefined && offset.layoutEnd !== undefined) {
            // Update existing comment
            return {
                start: offset.layoutStart,
                end: offset.layoutEnd + 1,
                replacement: replacementStr.trim()
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

    private findInsertionPoint(originalText: string, syntax: 'plantuml' | 'mermaid'): number {
        if (syntax === 'mermaid') {
            const match = originalText.match(/sequenceDiagram/i);
            return match ? match.index! + match[0].length + 1 : 0;
        } else {
            const match = originalText.match(/@startuml/i);
            if (match) {
                const afterStart = match.index! + match[0].length;
                const nextNewline = originalText.indexOf('\n', afterStart);
                return nextNewline !== -1 ? nextNewline + 1 : afterStart;
            }
            return 0;
        }
    }
}
