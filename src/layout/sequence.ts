import { DEFAULTS, LayoutConnection, LayoutMap, LayoutNode, LayoutNote, LayoutGroup, LayoutActivation, Position } from "./types";
import { IRDiagram, IRNode, IREdge, IRStatement, IRNote, IRGroup, IRActivation, IRReturn, IRAutoactivate } from "../ir/types";

export class SequenceLayoutManager {
    private map: LayoutMap;
    private currentSeqX = DEFAULTS.SEQUENCE_START_X;
    private currentSequenceY = DEFAULTS.SEQUENCE_START_Y + 150; // Start below participant boxes
    private activeActivations: Record<string, LayoutActivation[]> = {};
    private activationStack: string[] = [];
    private autoactivate = false;

    constructor() {
        this.map = {
            diagramType: 'sequence',
            nodes: {},
            connections: [],
            notes: [],
            groups: [],
            activations: []
        };
    }

    public process(ir: IRDiagram): LayoutMap {
        const declaredNodes = new Set<string>();
        this.activeActivations = {};
        this.activationStack = [];
        this.autoactivate = false;

        // Pass 1: Setup all nodes (Participants/Actors)
        ir.statements.filter(s => s && s.type === "node").forEach((statement: any) => {
            declaredNodes.add((statement as IRNode).name);
            this.processNode(statement as IRNode);
        });

        // Pass 1.5: Setup implicit nodes from edges
        this.processImplicitNodes(ir.statements, declaredNodes);

        // Pass 2: Setup connections, notes, groups, activations
        ir.statements.forEach((statement: IRStatement) => {
            this.processStatement(statement);
        });

        return this.map;
    }

    private processImplicitNodes(statements: IRStatement[], declaredNodes: Set<string>) {
        statements.forEach((statement: IRStatement) => {
            if (!statement) return;
            if (statement.type === "edge") {
                const edge = statement as IREdge;
                if (!declaredNodes.has(edge.from)) {
                    declaredNodes.add(edge.from);
                    this.processNode({ type: "node", shape: "participant", name: edge.from });
                }
                if (!declaredNodes.has(edge.to)) {
                    declaredNodes.add(edge.to);
                    this.processNode({ type: "node", shape: "participant", name: edge.to });
                }
            } else if (statement.type === "group") {
                const group = statement as IRGroup;
                group.sections.forEach(section => {
                    this.processImplicitNodes(section.statements, declaredNodes);
                });
            }
        });
    }

    private processStatement(statement: IRStatement) {
        if (!statement) return;
        if (statement.type === "edge") {
            this.processConnection(statement as IREdge);
        } else if (statement.type === "note") {
            this.processNote(statement as IRNote);
        } else if (statement.type === "group") {
            this.processGroup(statement as IRGroup);
        } else if (statement.type === "activation") {
            this.processActivation(statement as IRActivation);
        } else if (statement.type === "return") {
            this.processReturn(statement as IRReturn);
        } else if (statement.type === "autoactivate") {
            this.autoactivate = (statement as IRAutoactivate).value;
        }
    }

    private processReturn(ret: IRReturn) {
        // Find the most recently activated node using the stack
        if (this.activationStack.length === 0) return;
        
        const currentTarget = this.activationStack[this.activationStack.length - 1];
        
        // Find the activation for this target
        const activeList = this.activeActivations[currentTarget];
        if (activeList && activeList.length > 0) {
            const act = activeList[activeList.length - 1];
            // The return goes from currentTarget back to the source of the activation's start message
            if (act.startMessageIndex !== undefined) {
                const startMsg = this.map.connections[act.startMessageIndex];
                const source = startMsg.from;
                
                // Create a return connection
                const returnConn: IREdge = {
                    type: "edge",
                    from: currentTarget,
                    to: source,
                    arrow: "-->",
                    label: ret.label
                };
                
                this.processConnection(returnConn);
                
                // Automatically end the activation
                this.endActivation(currentTarget, this.map.connections.length - 1);
            }
        }
    }

    private processNode(node: IRNode) {
        const id = node.name;
        const size = {
            width: DEFAULTS.PARTICIPANT_WIDTH,
            height: DEFAULTS.PARTICIPANT_HEIGHT,
        };

        let position = { x: 0, y: 0 };
        if (node.layout) {
            position = { x: node.layout.x, y: node.layout.y };
        } else {
            position = { x: this.currentSeqX, y: DEFAULTS.SEQUENCE_START_Y };
            this.currentSeqX += DEFAULTS.ACTOR_PADDING_X;
        }

        const layoutNode: LayoutNode = {
            id,
            origName: node.origName || node.name,
            type: node.shape,
            position,
            size,
            // For sequence diagrams we need coordinates for the vertical lifeline
            lifelineX: position.x + size.width / 2,
            lifelineY: position.y + size.height
        };

        this.map.nodes[id] = layoutNode;
    }

    private processConnection(conn: IREdge) {
        let calculatedY: number;
        let position: Position | null = null;

        if (conn.layout) {
            // Respect order: must be at least currentSequenceY
            calculatedY = Math.max(conn.layout.y, this.currentSequenceY);
            position = { x: conn.layout.x, y: calculatedY };
            // Next minimum threshold is +MIN_Y_GAP
            this.currentSequenceY = calculatedY + DEFAULTS.SEQUENCE_MIN_Y_GAP;
        } else {
            // Use default step for messages without explicit position
            calculatedY = this.currentSequenceY;
            this.currentSequenceY = calculatedY + DEFAULTS.SEQUENCE_DEFAULT_Y_STEP;
        }

        const layoutConn: LayoutConnection = {
            from: conn.from,
            fromLabel: conn.fromLabel,
            to: conn.to,
            toLabel: conn.toLabel,
            type: conn.arrow, 
            label: conn.label || null,
            position,
            calculatedY
        };

        const connIndex = this.map.connections.length;
        this.map.connections.push(layoutConn);

        // Handle implicit activation from arrow shortcuts like ++
        if (conn.arrow.includes('++')) {
            this.startActivation(conn.to, connIndex);
        } else if (conn.arrow.includes('--')) {
            this.endActivation(conn.from, connIndex);
        } else if (this.autoactivate && !conn.arrow.includes('..') && !conn.arrow.includes('--')) {
            // Synchronous arrows start activation
            this.startActivation(conn.to, connIndex);
        }
    }

    private processNote(note: IRNote) {
        let x = 100;
        let y = this.currentSequenceY;

        if (note.targets && note.targets.length > 0) {
            const firstTarget = this.map.nodes[note.targets[0]];
            if (firstTarget) {
                if (note.placement === "left") {
                    x = firstTarget.position.x - DEFAULTS.NOTE_WIDTH - 20;
                } else if (note.placement === "right") {
                    x = firstTarget.position.x + firstTarget.size.width + 20;
                } else {
                    x = firstTarget.position.x;
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

        this.currentSequenceY += layoutNote.size.height + 20;
        this.map.notes.push(layoutNote);
    }

    private processGroup(group: IRGroup) {
        const startY = this.currentSequenceY;
        const dividerYs: number[] = [];
        // Group header takes some space
        this.currentSequenceY += 40;

        // Process all statements in all sections (alt/else)
        group.sections.forEach((section, index) => {
            section.statements.forEach(s => this.processStatement(s));
            
            // If this isn't the last section, record the divider position
            if (index < group.sections.length - 1) {
                this.currentSequenceY += 10;
                dividerYs.push(this.currentSequenceY);
                this.currentSequenceY += 10;
            } else {
                this.currentSequenceY += 20;
            }
        });

        const endY = this.currentSequenceY;
        const layoutGroup: LayoutGroup = {
            type: "group",
            id: group.label || `group-${Math.random()}`,
            keyword: group.keyword,
            label: group.label || "",
            sections: group.sections,
            position: { x: 50, y: startY },
            size: { width: 500, height: Math.max(100, endY - startY) },
            dividerYs,
            color: group.color
        };

        this.map.groups.push(layoutGroup);
        this.currentSequenceY += 20;
    }

    private processActivation(activation: IRActivation) {
        // Find the index of the message that immediately preceded this activation
        const lastConnIndex = this.map.connections.length - 1;
        
        if (activation.action === 'activate') {
            this.startActivation(activation.target, lastConnIndex >= 0 ? lastConnIndex : undefined);
        } else if (activation.action === 'deactivate') {
            this.endActivation(activation.target, lastConnIndex >= 0 ? lastConnIndex : undefined);
        } else if (activation.action === 'destroy') {
            this.endActivation(activation.target, lastConnIndex >= 0 ? lastConnIndex : undefined, true);
        }
    }

    private startActivation(nodeId: string, messageIndex?: number) {
        const targetNode = this.map.nodes[nodeId];
        if (!targetNode) return;

        const layoutAct: LayoutActivation = {
            type: 'activation',
            nodeId,
            startPosition: {
                x: targetNode.position.x + targetNode.size.width / 2 - 5,
                y: messageIndex !== undefined ? this.map.connections[messageIndex].calculatedY! : this.currentSequenceY
            },
            size: { width: 10, height: 20 }, // Minimal height, will be expanded
            startMessageIndex: messageIndex
        };

        this.map.activations!.push(layoutAct);
        if (!this.activeActivations[nodeId]) this.activeActivations[nodeId] = [];
        this.activeActivations[nodeId].push(layoutAct);
        this.activationStack.push(nodeId);
    }

    private endActivation(nodeId: string, messageIndex?: number, isDestroy?: boolean) {
        const activeList = this.activeActivations[nodeId];
        if (activeList && activeList.length > 0) {
            const act = activeList.pop()!;
            act.endMessageIndex = messageIndex;
            if (isDestroy) act.isDestroy = true;
            
            // Calculate static height for fallback
            const startY = act.startPosition.y;
            const endY = messageIndex !== undefined ? this.map.connections[messageIndex].calculatedY! : this.currentSequenceY;
            act.size.height = Math.max(20, endY - startY);

            // Remove from activation stack
            const stackIdx = this.activationStack.lastIndexOf(nodeId);
            if (stackIdx !== -1) {
                this.activationStack.splice(stackIdx, 1);
            }
        }
    }
}
