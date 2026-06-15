import { DEFAULTS, LayoutConnection, LayoutMap, LayoutNode, LayoutNote, LayoutGroup } from "./types";
import { IRDiagram, IRNode, IREdge, IRStatement, IRNote, IRGroup, IRContainer } from "../ir/types";

export class ClassLayoutManager {
    private map: LayoutMap;
    private currentClassY = DEFAULTS.CLASS_START_Y;
    private edges: IREdge[] = [];
    private rowOccupancy = new Map<number, number>();
    private nodeRanks = new Map<string, number>();
    private containerStartY: number | null = null;

    constructor() {
        this.map = {
            diagramType: 'class',
            nodes: {},
            connections: [],
            notes: [],
            groups: []
        };
    }

    private nodesByRow = new Map<number, string[]>();
    private rowInfo = new Map<number, {startX: number, baseY: number}>();

    public process(ir: IRDiagram): LayoutMap {
        this.edges = [];
        this.nodeRanks.clear();
        this.rowOccupancy.clear();
        this.nodesByRow.clear();
        this.rowInfo.clear();
        this.currentClassY = DEFAULTS.CLASS_START_Y;

        // Pass 0: Collect all edges for layout hints
        this.collectEdges(ir.statements);
        
        // Pass 0.5: Calculate ranks
        this.calculateRanks(ir.statements);

        // Pass 1: Setup all nodes (explicit and implicit) and groups/containers
        this.processStatementsPass1(ir.statements, DEFAULTS.CLASS_START_X);

        // Pass 1.5: Center nodes
        this.applyCentering();

        // Pass 2: Setup connections, notes
        this.processStatementsPass2(ir.statements);

        return this.map;
    }

    private calculateRanks(statements: IRStatement[]) {
        const allNodes = new Set<string>();
        const collectNodes = (stmts: IRStatement[]) => {
            stmts.forEach((s: any) => {
                if (!s) return;
                if (s.type === 'node') allNodes.add(s.name);
                else if (s.type === 'edge') { allNodes.add(s.from); allNodes.add(s.to); }
                else if (s.type === 'container') collectNodes(s.statements);
                else if (s.type === 'group') s.sections.forEach((sec: any) => collectNodes(sec.statements));
            });
        };
        collectNodes(statements);

        allNodes.forEach(n => this.nodeRanks.set(n, 0));

        const maxIter = Math.max(allNodes.size, 100);
        for (let i = 0; i < maxIter; i++) {
            let changed = false;
            this.edges.forEach(edge => {
                const rFrom = this.nodeRanks.get(edge.from);
                const rTo = this.nodeRanks.get(edge.to);
                if (rFrom === undefined || rTo === undefined) return;

                if (this.isHorizontal(edge.arrow)) {
                    if (rFrom !== rTo) {
                        const m = Math.max(rFrom, rTo);
                        this.nodeRanks.set(edge.from, m);
                        this.nodeRanks.set(edge.to, m);
                        changed = true;
                    }
                } else {
                    // Vertical
                    let head = edge.from;
                    let tail = edge.to;
                    
                    // Heuristic: determine which node is "above"
                    if (edge.arrow.includes('|>' )) {
                        // Inheritance: parent is above
                        head = edge.to;
                        tail = edge.from;
                    } else if (edge.arrow.startsWith('<|')) {
                        // Reverse inheritance: parent is above
                        head = edge.from;
                        tail = edge.to;
                    } else if (edge.arrow.endsWith('>') || edge.arrow.endsWith(')')) {
                        // Regular arrow: source is above
                        head = edge.from;
                        tail = edge.to;
                    } else if (edge.arrow.startsWith('<') || edge.arrow.startsWith('(')) {
                        // Reverse regular arrow: source is above
                        head = edge.to;
                        tail = edge.from;
                    }

                    const rh = this.nodeRanks.get(head)!;
                    const rt = this.nodeRanks.get(tail)!;
                    if (rt < rh + 1) {
                        this.nodeRanks.set(tail, rh + 1);
                        changed = true;
                    }
                }
            });
            if (!changed) break;
        }
    }

    private collectEdges(statements: IRStatement[]) {
        statements.forEach((s: any) => {
            if (!s) return;
            if (s.type === 'edge') {
                this.edges.push(s as IREdge);
            } else if (s.type === 'container') {
                this.collectEdges((s as IRContainer).statements);
            } else if (s.type === 'group') {
                (s as IRGroup).sections.forEach(sec => this.collectEdges(sec.statements));
            }
        });
    }

    private isHorizontal(arrow: string): boolean {
        if (arrow.includes('left') || arrow.includes('right') || arrow.includes('horizontal')) return true;
        if (arrow.includes('up') || arrow.includes('down') || arrow.includes('vertical')) return false;

        const match = arrow.match(/([-=.~]{1,4})/);
        if (match) {
            return match[1].length === 1;
        }
        return false;
    }

    private processStatementsPass1(statements: IRStatement[], x: number) {
        const oldContainerY = this.containerStartY;
        this.containerStartY = this.currentClassY;

        statements.forEach((statement: any) => {
            if (!statement) return;
            if (statement.type === "node") {
                this.processNode(statement as IRNode, x);
            } else if (statement.type === "edge") {
                const edge = statement as IREdge;
                if (!this.map.nodes[edge.from]) {
                    this.processNode({ type: 'node', name: edge.from, shape: 'class' } as IRNode, x);
                }
                if (!this.map.nodes[edge.to]) {
                    this.processNode({ type: 'node', name: edge.to, shape: 'class' } as IRNode, x);
                }
            } else if (statement.type === "container") {
                this.processContainerPass1(statement as IRContainer, x);
            } else if (statement.type === "group") {
                this.processGroupPass1(statement as IRGroup, x);
            }
        });

        this.containerStartY = oldContainerY;
    }

    private processContainerPass1(container: IRContainer, x: number) {
        const startY = this.currentClassY;
        const layoutGroup: LayoutGroup = {
            type: "group",
            id: container.name || `group-${Math.random()}`,
            keyword: container.keyword,
            label: container.name || "",
            sections: [{ statements: container.statements }],
            position: { x, y: startY },
            size: { width: 450, height: 0 },
            dividerYs: []
        };
        const groupIndex = this.map.groups.length;
        this.map.groups.push(layoutGroup);

        const oldY = this.currentClassY;
        this.currentClassY += 40; // Header padding
        this.processStatementsPass1(container.statements, x + 20);
        
        const endY = this.currentClassY;
        this.map.groups[groupIndex].size.height = Math.max(100, endY - startY);
        this.currentClassY += 20;
    }

    private processGroupPass1(group: IRGroup, x: number) {
        const startY = this.currentClassY;
        const layoutGroup: LayoutGroup = {
            type: "group",
            id: group.label || `group-${Math.random()}`,
            keyword: group.keyword,
            label: group.label || "",
            sections: group.sections,
            position: { x, y: startY },
            size: { width: 450, height: 0 },
            dividerYs: []
        };
        const groupIndex = this.map.groups.length;
        this.map.groups.push(layoutGroup);

        this.currentClassY += 40;
        group.sections.forEach(section => {
            this.processStatementsPass1(section.statements, x + 20);
        });

        const endY = this.currentClassY;
        this.map.groups[groupIndex].size.height = Math.max(100, endY - startY);
        this.currentClassY += 20;
    }

    private processStatementsPass2(statements: IRStatement[]) {
        statements.forEach((statement: IRStatement) => {
            if (!statement) return;
            if (statement.type === "edge") {
                this.processConnection(statement as IREdge);
            } else if (statement.type === "note") {
                this.processNote(statement as IRNote);
            } else if (statement.type === "container") {
                this.processStatementsPass2((statement as IRContainer).statements);
            } else if (statement.type === "group") {
                (statement as IRGroup).sections.forEach(sec => this.processStatementsPass2(sec.statements));
            }
        });
    }

    private processNode(node: IRNode, x: number) {
        const id = node.name;
        if (this.map.nodes[id]) {
            // Update existing node (explicit or implicit)
            const existing = this.map.nodes[id];
            if (node.members && node.members.length > 0) {
                existing.members = [...(existing.members || []), ...node.members];
            }
            if (node.shape && node.shape !== 'class') existing.type = node.shape;
            
            // Re-calculate height based on all members
            const allMembers = existing.members || [];
            const fields = allMembers.filter(m => m.isField);
            const methods = allMembers.filter(m => m.isMethod);
            const fieldsHeight = Math.max(20, fields.length * 20);
            const methodsHeight = Math.max(20, methods.length * 20);
            existing.size.height = 30 + fieldsHeight + 5 + methodsHeight + 5;
            return;
        }
        
        const fields = (node.members || []).filter(m => m.isField);
        const methods = (node.members || []).filter(m => m.isMethod);
        const fieldsHeight = Math.max(20, fields.length * 20);
        const methodsHeight = Math.max(20, methods.length * 20);
        const height = 30 + fieldsHeight + 5 + methodsHeight + 5;

        const size = {
            width: DEFAULTS.CLASS_WIDTH,
            height: height,
        };

        let position = { x: 0, y: 0 };
        if (node.layout) {
            position = { x: node.layout.x, y: node.layout.y };
        } else {
            const rank = this.nodeRanks.get(id) || 0;
            const baseY = this.containerStartY || DEFAULTS.CLASS_START_Y;
            
            // Determine Y based on rank. We use 200px as a rough row height.
            const targetY = baseY + (rank * 200);
            
            const currentX = this.rowOccupancy.get(targetY) || x;
            position = { x: currentX, y: targetY };
            this.rowOccupancy.set(targetY, currentX + size.width + 100);

            // Record for centering
            if (!this.nodesByRow.has(targetY)) {
                this.nodesByRow.set(targetY, []);
                this.rowInfo.set(targetY, { startX: x, baseY });
            }
            this.nodesByRow.get(targetY)!.push(id);
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
        this.currentClassY = Math.max(this.currentClassY, position.y + size.height + 50);
    }

    private applyCentering() {
        const levels = new Map<string, number[]>(); // key: "startX,baseY", value: list of targetYs
        this.rowInfo.forEach((info, targetY) => {
            const key = `${info.startX},${info.baseY}`;
            if (!levels.has(key)) levels.set(key, []);
            levels.get(key)!.push(targetY);
        });

        levels.forEach((targetYs, key) => {
            const [startXStr, baseYStr] = key.split(',');
            const startX = parseInt(startXStr);

            let maxWidth = 0;
            const rowWidths = new Map<number, number>();

            targetYs.forEach(targetY => {
                const nodeIds = this.nodesByRow.get(targetY) || [];
                let width = 0;
                nodeIds.forEach((id, index) => {
                    const node = this.map.nodes[id];
                    width += node.size.width;
                    if (index < nodeIds.length - 1) width += 100; // Gap
                });
                rowWidths.set(targetY, width);
                if (width > maxWidth) maxWidth = width;
            });

            targetYs.forEach(targetY => {
                const nodeIds = this.nodesByRow.get(targetY) || [];
                const rowWidth = rowWidths.get(targetY)!;
                const offset = (maxWidth - rowWidth) / 2;
                
                let currentX = startX + offset;
                nodeIds.forEach(id => {
                    const node = this.map.nodes[id];
                    node.position.x = currentX;
                    currentX += node.size.width + 100;
                });
            });
        });
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
            let targetId = note.targets[0];
            let memberName = undefined;
            if (targetId.includes("::")) {
                const parts = targetId.split("::");
                targetId = parts[0];
                memberName = parts[1];
            }

            const firstTarget = this.map.nodes[targetId];
            if (firstTarget) {
                // If it's a member-specific note, we can try to offset Y
                let yOffset = 0;
                if (memberName && firstTarget.members) {
                    const memberIndex = firstTarget.members.findIndex(m => m.name === memberName);
                    if (memberIndex !== -1) {
                        yOffset = 35 + (memberIndex * 20);
                    }
                }

                if (note.placement === "left" || note.placement === "left of") {
                    x = firstTarget.position.x - DEFAULTS.NOTE_WIDTH - 20;
                    y = firstTarget.position.y + yOffset;
                } else if (note.placement === "right" || note.placement === "right of") {
                    x = firstTarget.position.x + firstTarget.size.width + 20;
                    y = firstTarget.position.y + yOffset;
                } else {
                    x = firstTarget.position.x;
                    y = firstTarget.position.y - DEFAULTS.NOTE_HEIGHT - 20;
                }

                // Avoid overlap with existing notes at same position
                while (this.map.notes.some(n => Math.abs(n.position.x - x) < 5 && Math.abs(n.position.y - y) < 5)) {
                    y += (DEFAULTS.NOTE_HEIGHT + 10);
                }
            }
        } else {
            this.currentClassY += DEFAULTS.NOTE_HEIGHT + 20;
        }

        const layoutNote: LayoutNote = {
            type: "note",
            placement: note.placement,
            targets: note.targets || [],
            text: note.text,
            position: { x, y },
            size: { width: DEFAULTS.NOTE_WIDTH, height: DEFAULTS.NOTE_HEIGHT }
        };

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
