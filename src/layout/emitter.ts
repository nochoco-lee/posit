import { IRDiagram, IREdge, IRNode, IRStatement, IRGroup, IRContainer, IRDivider, IRNote } from "../ir/types";
import { LayoutMap } from "./types";
import { formatPosComment } from "../ir/constants";

export class Emitter {
    /**
     * Applies new layout positions to the original source text.
     */
    public emitPlantUml(originalText: string, ir: IRDiagram, layoutMap: LayoutMap): string {
        if (ir.type !== "Diagram") {
            throw new Error("Emitter expects a Diagram IR node");
        }

        const patches: { start: number; end: number; replacement: string }[] = [];
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

        const addPatch = (patch: { start: number; end: number; replacement: string } | null) => {
            if (!patch) return;
            patches.push(patch);
        };

        // Process Nodes
        for (const [id, layoutNode] of Object.entries(layoutMap.nodes)) {
            const matches = allStatements.filter((s: IRStatement) => 
                s && s.type === "node" && (s as IRNode).name === id
            );
            
            if (matches.length > 0) {
                const target = matches[0];
                addPatch(this.createPatchContext(originalText, target, layoutNode.position, syntax));
            } else if (ir.diagramType === 'sequence') {
                const insertionPoint = this.findInsertionPoint(originalText, syntax);
                const prefix = syntax === 'mermaid' ? '    ' : '';
                const declaration = `${prefix}participant ${id}${formatPosComment(layoutNode.position.x, layoutNode.position.y, syntax)}\n`;
                
                addPatch({
                    start: insertionPoint,
                    end: insertionPoint,
                    replacement: declaration
                });
            }
        }
// Process Connections
for (const conn of layoutMap.connections) {
    const matches = allStatements.filter((s: IRStatement) => {
        if (!s || s.type !== "edge") return false;
        const edge = s as IREdge;
        if (edge.from !== conn.from || edge.to !== conn.to) return false;
        const normIrLabel = (edge.label || "").replace(/\s+/g, "");
        const normLayoutLabel = (conn.label || "").replace(/\s+/g, "");
        return normIrLabel === normLayoutLabel;
    });
    if (matches.length > 0 && conn.position) {
        const target = matches[0];
        addPatch(this.createPatchContext(originalText, target, conn.position, syntax));
    }
}

        // Process Groups/Containers
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

            if (matches.length > 0) {
                addPatch(this.createPatchContext(originalText, matches[0], group.position, syntax));
            }
        }

        // Process Dividers
        if (layoutMap.dividers) {
            for (const div of layoutMap.dividers) {
                const irDiv = allStatements.find((s: IRStatement) => s.type === 'divider' && (s as IRDivider).label === div.label);
                if (irDiv && div.position) {
                    addPatch(this.createPatchContext(originalText, irDiv, div.position, syntax));
                }
            }
        }

        // Process Notes
        for (const note of layoutMap.notes) {
            const irNote = allStatements.find((s: IRStatement) => s.type === 'note' && (s as IRNote).text === note.text);
            if (irNote && note.position) {
                addPatch(this.createPatchContext(originalText, irNote, note.position, syntax));
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

    private createPatchContext(originalText: string, statement: IRStatement, position: { x: number; y: number }, syntax: 'plantuml' | 'mermaid'): { start: number; end: number; replacement: string } | null {
        const offset = statement.offset;
        if (!offset || offset.start === undefined || offset.end === undefined || isNaN(offset.start) || isNaN(offset.end)) return null;

        const replacementStr = formatPosComment(position.x, position.y, syntax);

        const posRegex = syntax === 'mermaid' 
            ? /%%\s*@pos\s*\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/g
            : /\/'\s*@pos[\s\S]*?'\//g;

        // Use the end of the statement (ignoring trailing newlines) to find "the line"
        let anchor = Math.max(0, offset.end - 1);
        while (anchor > 0 && (originalText[anchor] === '\n' || originalText[anchor] === '\r')) {
            anchor--;
        }
        
        const lineStart = originalText.lastIndexOf('\n', anchor) + 1;
        const lineEndMatch = originalText.indexOf('\n', anchor);
        const lineEnd = lineEndMatch === -1 ? originalText.length : lineEndMatch;
        const lineText = originalText.substring(lineStart, lineEnd);

        if (lineText.match(posRegex)) {
             // User's requested behavior: clean the whole line of any @pos tags and add the new one.
             const cleanedLine = lineText.replace(posRegex, '').trim();
             return {
                 start: lineStart,
                 end: lineEnd,
                 replacement: (cleanedLine ? cleanedLine + " " : "") + replacementStr.trim()
             };
        }


        // No @pos found on this line, just append to the statement end (before trailing newlines).
        return {
            start: anchor + 1,
            end: anchor + 1,
            replacement: replacementStr
        };
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
