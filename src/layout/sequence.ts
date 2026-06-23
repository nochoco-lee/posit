import { DEFAULTS, LayoutConnection, LayoutMap, LayoutNode, LayoutNote, LayoutGroup, LayoutActivation, LayoutDivider, Position } from "./types";
import { IRDiagram, IRNode, IREdge, IRStatement, IRNote, IRGroup, IRActivation, IRReturn, IRAutoactivate, IRAutonumber, IRDivider, IRRef, IRDelay, IRContainer } from "../ir/types";
import { measureText, wrapText } from "../utils/text";

export class SequenceLayoutManager {
    private map: LayoutMap;
    private currentSeqX = DEFAULTS.SEQUENCE_START_X;
    private currentSequenceY = DEFAULTS.SEQUENCE_START_Y + 150;
    private lastConnectionY: number | null = null;
    private lastConnectionParticipants: string[] = [];
    private activeActivations: Record<string, LayoutActivation[]> = {};
    private activationStack: string[] = [];
    private autoactivate = false;
    private autonumberActive = false;
    private autonumberValue = 1;
    private autonumberStep = 1;
    private autonumberFormat = "";
    private groupDepth = 0;

    constructor() {
        this.map = {
            diagramType: 'sequence',
            nodes: {},
            connections: [],
            notes: [],
            groups: [],
            activations: [],
            dividers: [],
            delays: []
        };
    }

    public process(ir: IRDiagram): LayoutMap {
        const declaredNodes = new Set<string>();
        const orderedParticipants: string[] = [];
        this.activeActivations = {};
        this.activationStack = [];
        this.autoactivate = false;
        this.autonumberActive = false;
        this.autonumberValue = 1;
        this.autonumberStep = 1;
        this.autonumberFormat = "";
        this.groupDepth = 0;
        this.currentSeqX = DEFAULTS.SEQUENCE_START_X;
        this.currentSequenceY = DEFAULTS.SEQUENCE_START_Y + 150;
        this.lastConnectionY = null;
        this.lastConnectionParticipants = [];

        const collectDeclaredNodes = (statements: IRStatement[]) => {
            statements.forEach(s => {
                if (!s) return;
                if (s.type === "node") {
                    const node = s as IRNode;
                    if (!declaredNodes.has(node.name)) {
                        declaredNodes.add(node.name);
                        orderedParticipants.push(node.name);
                        this.processNode(node);
                    } else if (node.layout) {
                        // Update position if this statement has a @pos tag
                        const existing = this.map.nodes[node.name];
                        if (existing) {
                            existing.position = { x: node.layout.x, y: node.layout.y };
                            existing.lifelineX = existing.position.x + existing.size.width / 2;
                            existing.lifelineY = existing.position.y + existing.size.height;
                        }
                    }
                } else if (s.type === "group") {
                    const group = s as IRGroup;
                    group.sections.forEach(sec => collectDeclaredNodes(sec.statements));
                } else if (s.type === "container") {
                    const container = s as IRContainer;
                    collectDeclaredNodes(container.statements);
                }
            });
        };

        collectDeclaredNodes(ir.statements);
        this.processImplicitNodes(ir.statements, declaredNodes, orderedParticipants);

        const maxNodeHeight = Math.max(...Object.values(this.map.nodes).map(n => n.size.height), DEFAULTS.PARTICIPANT_HEIGHT);
        this.currentSequenceY = DEFAULTS.SEQUENCE_START_Y + maxNodeHeight + 100;

        ir.statements.forEach((statement: IRStatement) => {
            this.processStatement(statement);
        });

        this.currentSequenceY += 50; // Trailing space for lifelines
        (this.map as any).totalHeight = this.currentSequenceY;

        // Post-process: Set box heights and adjust nested groups
        this.map.groups.filter(g => g.keyword === 'box').forEach(g => {
            g.size.height = Math.max(g.size.height, this.currentSequenceY - g.position.y + g.pad.y);
        });

        return this.map;
    }

    private processImplicitNodes(statements: IRStatement[], declaredNodes: Set<string>, orderedParticipants: string[]) {
        statements.forEach((statement: IRStatement) => {
            if (!statement) return;
            if (statement.type === "node") {
                const node = statement as IRNode;
                if (!declaredNodes.has(node.name)) {
                    declaredNodes.add(node.name);
                    orderedParticipants.push(node.name);
                    this.processNode(node);
                }
            } else if (statement.type === "edge") {
                const edge = statement as IREdge;
                const isExternal = (id: string) => id === "[" || id === "]";
                if (!declaredNodes.has(edge.from) && !isExternal(edge.from)) {
                    declaredNodes.add(edge.from);
                    orderedParticipants.push(edge.from);
                    this.processNode({ type: "node", shape: "participant", name: edge.from });
                }
                if (!declaredNodes.has(edge.to) && !isExternal(edge.to)) {
                    declaredNodes.add(edge.to);
                    orderedParticipants.push(edge.to);
                    this.processNode({ type: "node", shape: "participant", name: edge.to });
                }
            } else if (statement.type === "group") {
                const group = statement as IRGroup;
                group.sections.forEach(section => {
                    this.processImplicitNodes(section.statements, declaredNodes, orderedParticipants);
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
        } else if (statement.type === "autonumber") {
            this.processAutonumber(statement as IRAutonumber);
        } else if (statement.type === "divider") {
            this.processDivider(statement as IRDivider);
        } else if (statement.type === "delay") {
            this.processDelay(statement as IRDelay);
        } else if (statement.type === "ref") {
            this.processRef(statement as IRRef);
        }
    }

    private processAutonumber(auto: IRAutonumber) {
        this.autonumberActive = true;
        if (auto.start !== undefined) this.autonumberValue = auto.start;
        if (auto.step !== undefined) this.autonumberStep = auto.step;
        if (auto.format !== undefined) this.autonumberFormat = auto.format;
    }

    private processDivider(div: IRDivider) {
        const nodes = Object.values(this.map.nodes);
        let width = 800;
        let x = 50;
        if (nodes.length > 0) {
            const minX = Math.min(...nodes.map(n => n.position.x));
            const maxX = Math.max(...nodes.map(n => n.position.x + n.size.width));
            x = Math.max(0, minX - 50);
            width = (maxX - x) + 50;
        }
        const layoutDiv: LayoutDivider = {
            type: "divider",
            label: div.label,
            position: { x, y: this.currentSequenceY },
            size: { width, height: DEFAULTS.DIVIDER_HEIGHT }
        };
        this.map.dividers!.push(layoutDiv);
        this.currentSequenceY += DEFAULTS.DIVIDER_HEIGHT + 20;
    }

    private processDelay(delay: IRDelay) {
        const nodes = Object.values(this.map.nodes);
        let x = 400;
        if (nodes.length > 0) {
            const minX = Math.min(...nodes.map(n => n.position.x + n.size.width / 2));
            const maxX = Math.max(...nodes.map(n => n.position.x + n.size.width / 2));
            x = (minX + maxX) / 2;
        }
        this.map.delays!.push({
            type: 'delay',
            text: delay.text,
            position: { x, y: this.currentSequenceY }
        });
        this.currentSequenceY += 40;
    }

    private processRef(ref: IRRef) {
        let x = 100;
        let width = 300;
        const targetNodes = ref.targets.map(t => this.map.nodes[t]).filter(Boolean);
        if (targetNodes.length > 0) {
            const minX = Math.min(...targetNodes.map(n => n.position.x));
            const maxX = Math.max(...targetNodes.map(n => n.position.x + n.size.width));
            x = minX + 5;
            width = Math.max(100, maxX - minX - 10);
        }
        const textSize = measureText(ref.text, 12, 'sans-serif');
        const height = Math.max(60, textSize.height + 40);
        const layoutGroup: LayoutGroup = {
            type: "group", id: `ref-${Math.random()}`, keyword: "ref", label: ref.text, sections: [],
            position: { x, y: this.currentSequenceY }, size: { width, height }, pad: { x: 5, y: 10 }, dividerYs: []
        };
        this.map.groups.push(layoutGroup);
        this.currentSequenceY += height + 20;
    }

    private processReturn(ret: IRReturn) {
        if (this.activationStack.length === 0) return;
        const currentTarget = this.activationStack[this.activationStack.length - 1];
        const activeList = this.activeActivations[currentTarget];
        if (activeList && activeList.length > 0) {
            const act = activeList[activeList.length - 1];
            if (act.startMessageIndex !== undefined) {
                const startMsg = this.map.connections[act.startMessageIndex];
                const source = startMsg.from;
                const returnConn: IREdge = { type: "edge", from: currentTarget, to: source, arrow: "-->", label: ret.label };
                this.processConnection(returnConn);
                this.endActivation(currentTarget, this.map.connections.length - 1);
            }
        }
    }

    private processNode(node: IRNode) {
        const id = node.name;
        const displayName = node.origName || node.name;
        const textSize = measureText(displayName, 14, 'sans-serif');
        const width = Math.max(DEFAULTS.PARTICIPANT_WIDTH, textSize.width + 40);
        const height = Math.max(DEFAULTS.PARTICIPANT_HEIGHT, textSize.height + 20);
        const size = { width, height };
        let position = { x: 0, y: 0 };
        if (node.layout) position = { x: node.layout.x, y: node.layout.y };
        else { position = { x: this.currentSeqX, y: DEFAULTS.SEQUENCE_START_Y }; this.currentSeqX += width + 50; }
        
        // Mermaid 'create' support: if isCreate, we don't start at the top
        let lifelineY = position.y + size.height;
        if ((node as any).isCreate) {
            lifelineY = this.currentSequenceY; 
            position.y = this.currentSequenceY;
        }

        const layoutNode: LayoutNode = { 
            id, 
            origName: displayName, 
            type: node.shape, 
            position, 
            size, 
            lifelineX: position.x + size.width / 2, 
            lifelineY,
            isCreate: (node as any).isCreate,
            isDestroy: (node as any).isDestroy
        };
        this.map.nodes[id] = layoutNode;
    }

    private processConnection(conn: IREdge) {
        let calculatedY: number;
        let position: Position | null = null;
        const originNode = this.map.nodes[conn.from];
        const targetNode = this.map.nodes[conn.to];
        const fromExternal = conn.from === '[' || conn.from === ']';
        const toExternal = conn.to === '[' || conn.to === ']';

        // If target was created by this message (create participant Carl)
        if (targetNode && (targetNode as any).isCreate && targetNode.position.y === DEFAULTS.SEQUENCE_START_Y) {
            targetNode.position.y = this.currentSequenceY;
            targetNode.lifelineY = this.currentSequenceY + targetNode.size.height;
        }
        
        let labelHeight = 0;
        let finalLabel = conn.label ?? null;
        if ((originNode || fromExternal) && (targetNode || toExternal) && conn.label) {
            const isSelfMessage = conn.from === conn.to;
            const originX = fromExternal ? (targetNode?.position.x || 0) : (originNode!.position.x + originNode!.size.width / 2);
            const targetX = toExternal ? (originNode?.position.x || 0) : (targetNode!.position.x + targetNode!.size.width / 2);
            const availableWidth = isSelfMessage ? 150 : Math.max(100, Math.abs(targetX - originX) - 20);
            const textSize = measureText(conn.label, 12, 'sans-serif');
            if (textSize.width > availableWidth) {
                finalLabel = wrapText(conn.label, availableWidth, 12, 'sans-serif');
                const wrappedSize = measureText(finalLabel!, 12, 'sans-serif');
                labelHeight = wrappedSize.height;
            } else labelHeight = textSize.height;
        }
        if (conn.layout) { 
            calculatedY = Math.max(conn.layout.y, this.currentSequenceY); 
            position = { x: conn.layout.x, y: calculatedY }; 
            this.currentSequenceY = calculatedY + DEFAULTS.SEQUENCE_MIN_Y_GAP; 
        }
        else { 
            const step = Math.max(DEFAULTS.SEQUENCE_DEFAULT_Y_STEP, labelHeight + 20); 
            calculatedY = this.currentSequenceY; 
            this.currentSequenceY = calculatedY + step; 
        }
        let autonumberStr: string | undefined = undefined;
        if (this.autonumberActive) { autonumberStr = this.autonumberValue.toString(); this.autonumberValue += this.autonumberStep; }
        const layoutConn: LayoutConnection = { from: conn.from, fromLabel: conn.fromLabel, to: conn.to, toLabel: conn.toLabel, type: conn.arrow, label: finalLabel, number: autonumberStr, position, calculatedY };
        this.lastConnectionY = calculatedY;
        this.lastConnectionParticipants = [conn.from, conn.to];
        const connIndex = this.map.connections.length;
        this.map.connections.push(layoutConn);
        
        const isDashed = conn.arrow.includes('--') || conn.arrow.includes('..');

        if (conn.arrow.includes('++') || conn.isCreation || (targetNode && (targetNode as any).isCreate && targetNode.position.y === calculatedY)) {
            this.startActivation(conn.to, connIndex);
        } else if (conn.arrow.includes('--') || conn.isDeletion || (originNode && (originNode as any).isDestroy)) {
            this.endActivation(conn.from, connIndex, originNode && (originNode as any).isDestroy);
        } else if (this.autoactivate) {
             if (isDashed) {
                 // Check if this is a return message ending an auto-activation
                 if (this.activationStack.length > 0) {
                     const currentActive = this.activationStack[this.activationStack.length - 1];
                     if (conn.from === currentActive) {
                         this.endActivation(conn.from, connIndex);
                     }
                 }
             } else {
                 this.startActivation(conn.to, connIndex);
             }
        }
    }

    private processNote(note: IRNote) {
        let x = 100; let y = this.currentSequenceY; let width = DEFAULTS.NOTE_WIDTH;
        if ((note.placement === "right" || note.placement === "left") && this.lastConnectionY !== null) {
            y = this.lastConnectionY - 10;
        }

        const targets = (note.targets && note.targets.length > 0) ? note.targets : this.lastConnectionParticipants;
        
        if (targets.length > 0) {
            if (note.placement === "over") {
                const targetNodes = targets.map(t => this.map.nodes[t]).filter(Boolean);
                if (targetNodes.length > 0) { 
                    const minX = Math.min(...targetNodes.map(n => n.position.x + n.size.width / 2)); 
                    const maxX = Math.max(...targetNodes.map(n => n.position.x + n.size.width / 2)); 
                    x = minX - width / 2;
                    if (targetNodes.length > 1) {
                         const actualMinX = Math.min(...targetNodes.map(n => n.position.x));
                         const actualMaxX = Math.max(...targetNodes.map(n => n.position.x + n.size.width));
                         width = Math.max(DEFAULTS.NOTE_WIDTH, actualMaxX - actualMinX);
                         x = actualMinX;
                    }
                }
            } else {
                // Determine boundaries based on current map state
                const getRightBoundary = (id: string, yPos: number): number => {
                    const node = this.map.nodes[id];
                    if (!node) return 0;
                    const centerX = node.position.x + node.size.width / 2;
                    const activations = this.map.activations?.filter(a => a.nodeId === id) || [];
                    const activeAtY = activations.filter(a => {
                        const startY = a.startPosition.y;
                        const endY = startY + a.size.height;
                        return yPos >= startY && yPos <= endY;
                    });
                    if (activeAtY.length === 0) return centerX;
                    const maxDepth = Math.max(...activeAtY.map(a => a.depth || 0));
                    return centerX + 5 + (maxDepth * 5); // 5 is half actWidth
                };

                const getLeftBoundary = (id: string, yPos: number): number => {
                    const node = this.map.nodes[id];
                    if (!node) return 0;
                    const centerX = node.position.x + node.size.width / 2;
                    const activations = this.map.activations?.filter(a => a.nodeId === id) || [];
                    const activeAtY = activations.filter(a => {
                        const startY = a.startPosition.y;
                        const endY = startY + a.size.height;
                        return yPos >= startY && yPos <= endY;
                    });
                    if (activeAtY.length === 0) return centerX;
                    return centerX - 5;
                };

                const padding = 5; // Reduced padding
                if (note.placement === "right") {
                    // Rightmost of all targets
                    const maxX = Math.max(...targets.map(t => getRightBoundary(t, y)));
                    x = maxX + padding;
                } else if (note.placement === "left") {
                    // Leftmost of all targets
                    const minX = Math.min(...targets.map(t => getLeftBoundary(t, y)));
                    x = minX - width - padding;
                } else {
                    const targetNode = this.map.nodes[targets[0]];
                    if (targetNode) x = targetNode.position.x;
                }
            }
        }
        const textSize = measureText(note.text, 12, 'sans-serif');
        let finalNoteText = note.text; let height = DEFAULTS.NOTE_HEIGHT;
        if (textSize.width > width - 10) { finalNoteText = wrapText(note.text, width - 10, 12, 'sans-serif'); const wrappedSize = measureText(finalNoteText, 12, 'sans-serif'); height = Math.max(DEFAULTS.NOTE_HEIGHT, wrappedSize.height + 15); }
        else height = Math.max(DEFAULTS.NOTE_HEIGHT, textSize.height + 15);
        const layoutNote: LayoutNote = { type: "note", placement: note.placement, targets, text: finalNoteText, position: { x, y }, size: { width, height } };
        if (y === this.currentSequenceY) this.currentSequenceY += layoutNote.size.height + 20;
        else this.currentSequenceY = Math.max(this.currentSequenceY, y + layoutNote.size.height + 20);
        this.map.notes.push(layoutNote);
    }

    private processGroup(group: IRGroup) {
        this.groupDepth++;
        const isBox = group.keyword === 'box';
        const contentStartY = isBox ? DEFAULTS.SEQUENCE_START_Y - 20 : this.currentSequenceY;
        const startY = contentStartY;
        const dividerYs: number[] = [];
        if (!isBox) this.currentSequenceY += 40;
        
        const noteCountBefore = this.map.notes.length;

        const participantsInGroup = new Set<string>();
        const collectParticipants = (statements: IRStatement[]) => {
            statements.forEach(s => {
                if (!s) return;
                if (s.type === "edge") { 
                    const edge = s as IREdge;
                    if (edge.from !== '[' && edge.from !== ']') participantsInGroup.add(edge.from); 
                    if (edge.to !== '[' && edge.to !== ']') participantsInGroup.add(edge.to); 
                }
                else if (s.type === "node") participantsInGroup.add((s as IRNode).name);
                else if (s.type === "note") (s as IRNote).targets?.forEach(t => { if (t !== '[' && t !== ']') participantsInGroup.add(t); });
                else if (s.type === "group") (s as IRGroup).sections.forEach(sec => collectParticipants(sec.statements));
            });
        };
        group.sections.forEach(section => collectParticipants(section.statements));

        const contentStartYActual = this.currentSequenceY;

        group.sections.forEach((section, index) => {
            section.statements.forEach(s => this.processStatement(s));
            if (!isBox) { 
                if (index < group.sections.length - 1) { 
                    this.currentSequenceY += 30; // More space for else labels
                    dividerYs.push(this.currentSequenceY - 15); 
                } else this.currentSequenceY += 20; 
            }
        });
        let endY = this.currentSequenceY;

        // Compute pad.x from participant bounds
        let padX = isBox ? 20 : Math.max(10, 40 - (this.groupDepth * 10));
        let minParticipantX = Infinity;
        let maxParticipantRight = -Infinity;
        if (participantsInGroup.size > 0) {
            const nodes = Array.from(participantsInGroup).map(id => this.map.nodes[id]).filter(Boolean);
            if (nodes.length > 0) { 
                minParticipantX = Math.min(...nodes.map(n => n.position.x));
                maxParticipantRight = Math.max(...nodes.map(n => n.position.x + n.size.width));
            }
        }

        // Include notes in horizontal bounds
        const groupNotes = this.map.notes.slice(noteCountBefore);
        if (groupNotes.length > 0) {
            const notePadding = isBox ? 20 : 10;
            const noteMinX = Math.min(...groupNotes.map(n => n.position.x)) - notePadding;
            const noteMaxX = Math.max(...groupNotes.map(n => n.position.x + n.size.width)) + notePadding;
            if (noteMinX < minParticipantX) minParticipantX = noteMinX;
            if (noteMaxX > maxParticipantRight) maxParticipantRight = noteMaxX;
        }

        // Compute pad.y from message content bounds
        const contentHeight = Math.max(0, endY - contentStartYActual);
        let padY: number;
        if (isBox) {
            // Box: top is fixed, pad.y is bottom gap only
            padY = 20;
        } else {
            // Non-box: pad.y is gap above first message
            padY = 40;
        }

        // Derive position and size from pad + content bounds
        const x = minParticipantX !== Infinity ? minParticipantX - padX : 50;
        const width = minParticipantX !== Infinity ? Math.max(100, (maxParticipantRight - minParticipantX) + 2 * padX) : 500;
        let y: number;
        let height: number;
        if (isBox) {
            y = contentStartY;
            height = Math.max(50, (endY - contentStartY) + padY);
        } else {
            y = contentStartYActual - padY;
            height = Math.max(50, contentHeight + 2 * padY);
        }

        const layoutGroup: LayoutGroup = { 
            type: "group", 
            id: group.label || `group-${Math.random()}`, 
            keyword: group.keyword, 
            label: group.label || "", 
            sections: group.sections, 
            position: { x, y }, 
            size: { width, height },
            pad: { x: padX, y: padY },
            contentStartY: contentStartYActual,
            dividerYs, 
            color: group.color,
            participants: Array.from(participantsInGroup)
        };
        this.map.groups.push(layoutGroup);
        if (!isBox) this.currentSequenceY += 20;
        this.groupDepth--;
    }

    private processActivation(activation: IRActivation) {
        const lastConnIndex = this.map.connections.length - 1;
        if (activation.action === 'activate') this.startActivation(activation.target, lastConnIndex >= 0 ? lastConnIndex : undefined);
        else if (activation.action === 'deactivate') this.endActivation(activation.target, lastConnIndex >= 0 ? lastConnIndex : undefined);
        else if (activation.action === 'destroy') this.endActivation(activation.target, lastConnIndex >= 0 ? lastConnIndex : undefined, true);
    }

    private startActivation(nodeId: string, messageIndex?: number) {
        const targetNode = this.map.nodes[nodeId];
        if (!targetNode) return;
        if (!this.activeActivations[nodeId]) this.activeActivations[nodeId] = [];
        const depth = this.activeActivations[nodeId].length;
        const layoutAct: LayoutActivation = {
            type: 'activation', nodeId, startPosition: {
                x: targetNode.position.x + targetNode.size.width / 2 - 5 + (depth * 5),
                y: messageIndex !== undefined ? this.map.connections[messageIndex].calculatedY! : this.currentSequenceY
            },
            size: { width: 10, height: 20 }, startMessageIndex: messageIndex, depth
        };
        this.map.activations!.push(layoutAct);
        this.activeActivations[nodeId].push(layoutAct);
        this.activationStack.push(nodeId);
    }

    private endActivation(nodeId: string, messageIndex?: number, isDestroy?: boolean) {
        const activeList = this.activeActivations[nodeId];
        if (activeList && activeList.length > 0) {
            const act = activeList.pop()!;
            act.endMessageIndex = messageIndex;
            if (isDestroy) act.isDestroy = true;
            const startY = act.startPosition.y;
            const endY = messageIndex !== undefined ? this.map.connections[messageIndex].calculatedY! : this.currentSequenceY;
            act.size.height = Math.max(20, endY - startY);
            const stackIdx = this.activationStack.lastIndexOf(nodeId);
            if (stackIdx !== -1) this.activationStack.splice(stackIdx, 1);
        }
    }
}
