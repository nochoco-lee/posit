import { DEFAULTS, LayoutConnection, LayoutMap, LayoutNode, LayoutNote, LayoutGroup } from "./types";
import { IRDiagram, IRNode, IREdge, IRStatement, IRNote, IRGroup, IRContainer } from "../ir/types";

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
        // Pass 1: Setup all explicit nodes
        this.processStatementsPass1(ir.statements);

        // Pass 1.5: Setup implicit nodes from connections
        this.processStatementsPass1_5(ir.statements);

        // Pass 2: Setup connections, notes, groups
        this.processStatementsPass2(ir.statements);

        return this.map;
    }

    private processStatementsPass1(statements: IRStatement[]) {
        statements.forEach((statement: any) => {
            if (!statement) return;
            if (statement.type === "node") {
                this.processNode(statement as IRNode);
            } else if (statement.type === "container") {
                this.processStatementsPass1((statement as IRContainer).statements);
            }
        });
    }

    private processStatementsPass1_5(statements: IRStatement[]) {
        statements.forEach((statement: any) => {
            if (!statement) return;
            if (statement.type === "edge") {
                const edge = statement as IREdge;
                if (!this.map.nodes[edge.from]) {
                    this.processNode({ type: 'node', name: edge.from, shape: 'class' } as IRNode);
                }
                if (!this.map.nodes[edge.to]) {
                    this.processNode({ type: 'node', name: edge.to, shape: 'class' } as IRNode);
                }
            } else if (statement.type === "container") {
                this.processStatementsPass1_5((statement as IRContainer).statements);
            }
        });
    }

    private processStatementsPass2(statements: IRStatement[]) {
        statements.forEach((statement: IRStatement) => {
            if (!statement) return;
            if (statement.type === "edge") {
                this.processConnection(statement as IREdge);
            } else if (statement.type === "note") {
                this.processNote(statement as IRNote);
            } else if (statement.type === "group") {
                this.processGroup(statement as IRGroup);
            } else if (statement.type === "container") {
                this.processContainer(statement as IRContainer);
            }
        });
    }

    private processContainer(container: IRContainer) {
        const layoutGroup: LayoutGroup = {
            type: "group",
            id: container.name || `group-${Math.random()}`,
            keyword: container.keyword,
            label: container.name || "",
            sections: [{ statements: container.statements }],
            position: { x: 50, y: this.currentClassY },
            size: { width: 450, height: 150 },
            dividerYs: []
        };

        this.map.groups.push(layoutGroup);
        this.currentClassY += 20;
        this.processStatementsPass2(container.statements);
        this.currentClassY += 170;
    }

    private processNode(node: IRNode) {
        const id = node.name;
        if (this.map.nodes[id] && node.members && node.members.length > 0) {
            // Update existing implicit node if we now have more info
            const existing = this.map.nodes[id];
            existing.members = node.members;
            const fields = node.members.filter(m => m.isField);
            const methods = node.members.filter(m => m.isMethod);
            let height = 30 + (node.members.length * 20) + 10;
            if (fields.length > 0 && methods.length > 0) height += 5;
            existing.size.height = height;
            return;
        }
        if (this.map.nodes[id]) return;
        
        let height = DEFAULTS.CLASS_HEIGHT;
        if (node.members && node.members.length > 0) {
            const fields = node.members.filter(m => m.isField);
            const methods = node.members.filter(m => m.isMethod);
            height = 30 + (node.members.length * 20) + 10;
            if (fields.length > 0 && methods.length > 0) height += 5;
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
            origName: node.origName || node.name,
            type: node.shape || 'class',
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
        let x = 100;
        let y = this.currentClassY;

        if (note.targets && note.targets.length > 0) {
            const firstTarget = this.map.nodes[note.targets[0]];
            if (firstTarget) {
                if (note.placement === "left" || note.placement === "left of") {
                    x = firstTarget.position.x - DEFAULTS.NOTE_WIDTH - 20;
                    y = firstTarget.position.y;
                } else if (note.placement === "right" || note.placement === "right of") {
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
