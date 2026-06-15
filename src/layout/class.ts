import { DEFAULTS, LayoutConnection, LayoutMap, LayoutNode, LayoutNote, LayoutGroup } from "./types";
import { IRDiagram, IRNode, IREdge, IRStatement, IRNote, IRGroup } from "../ir/types";

export class ClassLayoutManager {
    private map: LayoutMap;
    private currentClassY = DEFAULTS.CLASS_START_Y;

    constructor() {
        this.map = {
            diagramType: 'class',
            nodes: {},
            connections: [],
            notes: [],
            groups: []
        };
    }

    public process(ir: IRDiagram): LayoutMap {
        // Pass 1: Setup all nodes
        ir.statements.filter(s => s && s.type === "node").forEach((statement: any) => {
            this.processNode(statement as IRNode);
        });

        // Pass 2: Setup connections, notes, groups (which may depend on node positions)
        ir.statements.forEach((statement: IRStatement) => {
            if (!statement) return;
            if (statement.type === "edge") {
                this.processConnection(statement as IREdge);
            } else if (statement.type === "note") {
                this.processNote(statement as IRNote);
            } else if (statement.type === "group") {
                this.processGroup(statement as IRGroup);
            }
        });

        return this.map;
    }

    private processNode(node: IRNode) {
        const id = node.name;
        
        let height = DEFAULTS.CLASS_HEIGHT;
        if (node.members && node.members.length > 0) {
            height = 30 + (node.members.length * 20) + 10;
        }

        const size = {
            width: DEFAULTS.CLASS_WIDTH,
            height: height,
        };

        let position = { x: 0, y: 0 };
        if (node.layout) {
            position = { x: node.layout.x, y: node.layout.y };
        } else {
            position = { x: DEFAULTS.CLASS_START_X, y: this.currentClassY };
            this.currentClassY += (size.height + 50); 
        }

        const layoutNode: LayoutNode = {
            id,
            origName: node.name,
            type: node.shape,
            position,
            size,
            members: node.members
        };

        this.map.nodes[id] = layoutNode;
    }

    private processConnection(conn: IREdge) {
        let position = null;
        if (conn.layout) {
            position = { x: conn.layout.x, y: conn.layout.y };
        }

        const layoutConn: LayoutConnection = {
            from: conn.from,
            fromLabel: conn.fromLabel,
            to: conn.to,
            toLabel: conn.toLabel,
            type: conn.arrow, 
            label: conn.label || null,
            position
        };

        this.map.connections.push(layoutConn);
    }

    private processNote(note: IRNote) {
        // ... similar logic conceptually, but for classes ...
        // MVP naive note placement near last class
        let x = 100;
        let y = this.currentClassY;

        if (note.targets && note.targets.length > 0) {
            const firstTarget = this.map.nodes[note.targets[0]];
            if (firstTarget) {
                if (note.placement === "left") {
                    x = firstTarget.position.x - DEFAULTS.NOTE_WIDTH - 20;
                    y = firstTarget.position.y;
                } else if (note.placement === "right") {
                    x = firstTarget.position.x + firstTarget.size.width + 20;
                    y = firstTarget.position.y;
                } else {
                    x = firstTarget.position.x;
                    y = firstTarget.position.y - DEFAULTS.NOTE_HEIGHT - 20;
                }
            }
        }

        const layoutNote: LayoutNote = {
            type: "note",
            placement: note.placement,
            targets: note.targets || [],
            text: note.text,
            position: { x, y },
            size: { width: DEFAULTS.NOTE_WIDTH, height: DEFAULTS.NOTE_HEIGHT }
        };

        this.currentClassY += layoutNote.size.height + 20;
        this.map.notes.push(layoutNote);
    }

    private processGroup(group: IRGroup) {
        // Grouping in class diagrams corresponds to "package" or "namespace"
        const layoutGroup: LayoutGroup = {
            type: "group",
            id: group.label || `group-${Math.random()}`,
            keyword: group.keyword,
            label: group.label || "",
            sections: group.sections,
            position: { x: 50, y: this.currentClassY },
            size: { width: 400, height: 100 },
            dividerYs: []
        };

        this.currentClassY += 120;
        this.map.groups.push(layoutGroup);
    }
}
