import Konva from 'konva';
import { LayoutMap, LayoutNode, LayoutConnection, LayoutGroup, LayoutNote, LayoutActivation, LayoutDivider, DEFAULTS } from "../layout/types";

export class SequenceRenderer {
    protected layer: Konva.Layer;
    protected stage: Konva.Stage;
    protected map: LayoutMap | null = null;
    protected onNodeMove?: (id: string, newX: number, newY: number) => void;
    protected nodeGroups: Record<string, Konva.Group> = {};
    protected connectionArrows: { 
        originId: string, 
        targetId: string, 
        konvaObj: Konva.Arrow | Konva.Line, 
        labelObj?: Konva.Text,
        group: Konva.Group 
    }[] = [];
    protected lifelines: Record<string, Konva.Line> = {};
    protected activationRects: Record<string, { rect: Konva.Rect, def: LayoutActivation }[]> = {};
    protected groupVisuals: { group: Konva.Group, rect: Konva.Rect, dividers: Konva.Line[], labels: Konva.Text[], def: LayoutGroup }[] = [];
    protected participantOrder: string[] = [];

    constructor(stage: Konva.Stage, layer: Konva.Layer) {
        this.stage = stage;
        this.layer = layer;
    }

    public setOnNodeMove(callback: (id: string, newX: number, newY: number) => void) {
        this.onNodeMove = callback;
    }

    public render(map: LayoutMap) {
        this.map = map;
        this.layer.destroyChildren();
        this.nodeGroups = {};
        this.connectionArrows = [];
        this.lifelines = {};
        this.activationRects = {};
        this.groupVisuals = [];
        const sortedNodes = Object.values(map.nodes).filter(n => n.type === 'participant' || n.type === 'actor').sort((a, b) => a.position.x - b.position.x);
        this.participantOrder = sortedNodes.map(n => n.id);
        Object.values(map.nodes).forEach(node => { this.drawLifeline(node); this.drawNode(node); });
        map.groups.forEach(group => this.drawGroup(group));
        if (map.activations) map.activations.forEach(act => this.drawActivation(act));
        map.connections.forEach(conn => this.drawConnection(conn));
        if (map.dividers) map.dividers.forEach(div => this.drawDivider(div));
        if ((map as any).delays) (map as any).delays.forEach((delay: any) => this.drawDelay(delay));
        map.notes.forEach(note => this.drawNote(note));
        this.layer.draw();
    }

    public syncPositions(map: LayoutMap) {
        this.map = map;
        map.connections.forEach((conn, index) => {
            const visual = this.connectionArrows[index];
            if (visual && conn.calculatedY !== undefined) visual.group.y(conn.calculatedY);
        });
        Object.values(map.nodes).forEach(node => {
            const group = this.nodeGroups[node.id];
            if (group) {
                group.position(node.position);
                const lifeline = this.lifelines[node.id];
                if (lifeline) {
                    const centerX = node.position.x + node.size.width / 2;
                    const points = lifeline.points();
                    points[0] = centerX; points[2] = centerX;
                    lifeline.points(points);
                }
            }
        });
        Object.values(this.activationRects).forEach(rectList => {
            rectList.forEach(item => {
                const { rect, def } = item;
                let startY = rect.y(); let endY = rect.y() + rect.height();
                if (def.startMessageIndex !== undefined && this.connectionArrows[def.startMessageIndex]) startY = this.connectionArrows[def.startMessageIndex].group.y();
                if (def.endMessageIndex !== undefined && this.connectionArrows[def.endMessageIndex]) endY = this.connectionArrows[def.endMessageIndex].group.y();
                rect.y(startY); rect.height(Math.max(5, endY - startY));
            });
        });
        // Sync Groups
        this.groupVisuals.forEach(visual => {
            const { group, rect, def } = visual;
            group.position(def.position);
            rect.size(def.size);
            // Optionally update labels/dividers if they changed in map, 
            // but for now we assume only position/size change via dragging
        });
        this.layer.batchDraw();
    }

    private drawLifeline(nodeDef: LayoutNode) {
        if (!nodeDef.lifelineX || !nodeDef.lifelineY) return;
        let maxY = (this.map as any).totalHeight || 2000;
        if (this.map?.activations) {
            const destroyAct = this.map.activations.find(act => act.nodeId === nodeDef.id && act.isDestroy);
            if (destroyAct) maxY = destroyAct.startPosition.y + destroyAct.size.height;
        }
        const line = new Konva.Line({ points: [nodeDef.lifelineX, nodeDef.lifelineY, nodeDef.lifelineX, maxY], stroke: '#A80036', strokeWidth: 1, dash: [5, 5] });
        this.lifelines[nodeDef.id] = line;
        this.layer.add(line);
    }

    private drawActivation(act: LayoutActivation) {
        const rect = new Konva.Rect({ x: act.startPosition.x, y: act.startPosition.y, width: act.size.width, height: act.size.height, fill: '#E2E2F0', stroke: '#A80036', strokeWidth: 1 });
        if (!this.activationRects[act.nodeId]) this.activationRects[act.nodeId] = [];
        this.activationRects[act.nodeId].push({ rect, def: act });
        this.layer.add(rect);
        if (act.isDestroy) {
            const centerX = act.startPosition.x + act.size.width / 2; const endY = act.startPosition.y + act.size.height;
            const size = 20; const x1 = centerX - size / 2; const x2 = centerX + size / 2; const y1 = endY - size / 2; const y2 = endY + size / 2;
            const line1 = new Konva.Line({ points: [x1, y1, x2, y2], stroke: '#A80036', strokeWidth: 4 });
            const line2 = new Konva.Line({ points: [x2, y1, x1, y2], stroke: '#A80036', strokeWidth: 4 });
            this.layer.add(line1); this.layer.add(line2);
        }
    }

    private drawNode(nodeDef: LayoutNode) {
        const group = new Konva.Group({
            x: nodeDef.position.x, y: nodeDef.position.y, draggable: true, id: nodeDef.id,
            dragBoundFunc: (pos) => {
                const nodeIndex = this.participantOrder.indexOf(nodeDef.id);
                let minX = 10; let maxX = 5000;
                if (nodeIndex > 0) {
                    const prevNodeId = this.participantOrder[nodeIndex - 1];
                    const prevGroup = this.nodeGroups[prevNodeId];
                    if (prevGroup) minX = prevGroup.x() + this.map!.nodes[prevNodeId].size.width + 10;
                }
                if (nodeIndex < this.participantOrder.length - 1) {
                    const nextNodeId = this.participantOrder[nodeIndex + 1];
                    const nextGroup = this.nodeGroups[nextNodeId];
                    if (nextGroup) maxX = nextGroup.x() - nodeDef.size.width - 10;
                }
                return { x: Math.max(minX, Math.min(maxX, pos.x)), y: nodeDef.position.y };
            }
        });
        group.on('mouseenter', () => { this.stage.container().style.cursor = 'move'; });
        group.on('mouseleave', () => { this.stage.container().style.cursor = 'default'; });
        group.on('dragend', (e: any) => {
            const newX = Math.round(e.target.x()); const newY = Math.round(e.target.y());
            if (this.onNodeMove) this.onNodeMove(nodeDef.id, newX, newY);
        });
        group.on('dragmove', () => { this.updateConnections(nodeDef.id); });
        if (nodeDef.type === 'actor') {
            const centerX = nodeDef.size.width / 2; const headRadius = 10; const headY = headRadius;
            const head = new Konva.Circle({ x: centerX, y: headY, radius: headRadius, stroke: '#A80036', strokeWidth: 2, fill: '#E2E2F0' });
            const body = new Konva.Line({ points: [centerX, headY + headRadius, centerX, headY + headRadius + 20], stroke: '#A80036', strokeWidth: 2 });
            const arms = new Konva.Line({ points: [centerX - 15, headY + headRadius + 5, centerX + 15, headY + headRadius + 5], stroke: '#A80036', strokeWidth: 2 });
            const legs = new Konva.Line({ points: [centerX - 10, headY + headRadius + 35, centerX, headY + headRadius + 20, centerX + 10, headY + headRadius + 35], stroke: '#A80036', strokeWidth: 2 });
            group.add(head); group.add(body); group.add(arms); group.add(legs);
            const text = new Konva.Text({
                text: nodeDef.origName + (nodeDef.stereotype ? `\n${nodeDef.stereotype}` : ""),
                fontSize: 14, fontFamily: 'sans-serif', fill: 'black', width: nodeDef.size.width, y: headY + headRadius + 40, align: 'center',
            });
            group.add(text);
        } else {
            const rect = new Konva.Rect({ width: nodeDef.size.width, height: nodeDef.size.height, fill: '#E2E2F0', stroke: '#A80036', strokeWidth: 1.5, cornerRadius: 5, shadowColor: 'black', shadowBlur: 5, shadowOffset: { x: 2, y: 2 }, shadowOpacity: 0.2, });
            const text = new Konva.Text({
                text: nodeDef.origName + (nodeDef.stereotype ? `\n${nodeDef.stereotype}` : ""),
                fontSize: 14, fontFamily: 'sans-serif', fill: 'black', width: nodeDef.size.width, height: nodeDef.size.height, align: 'center', verticalAlign: 'middle',
            });
            group.add(rect); group.add(text);
        }
        this.nodeGroups[nodeDef.id] = group; this.layer.add(group);
    }

    private drawConnection(conn: LayoutConnection) {
        if (!this.map) return;
        const fromExternal = conn.from === '[' || conn.from === ']';
        const toExternal = conn.to === '[' || conn.to === ']';
        const originNode = this.map.nodes[conn.from];
        const targetNode = this.map.nodes[conn.to];
        if ((!originNode && !fromExternal) || (!targetNode && !toExternal)) return;

        const isSelfMessage = conn.from === conn.to;
        const yPos = conn.position ? conn.position.y : (conn.calculatedY || 200);

        // Helper to get X coordinate adjusted for activations
        const getAdjustedX = (nodeId: string, isOrigin: boolean, otherX: number) => {
            const node = this.map!.nodes[nodeId];
            if (!node) return 0;
            const centerX = node.position.x + node.size.width / 2;
            const activations = this.map!.activations?.filter(a => a.nodeId === nodeId) || [];
            const activeAtY = activations.filter(a => {
                let startY = a.startPosition.y;
                let endY = startY + a.size.height;
                // Sync with actual rendered Y if possible
                const startMsg = a.startMessageIndex !== undefined ? this.map!.connections[a.startMessageIndex] : null;
                const endMsg = a.endMessageIndex !== undefined ? this.map!.connections[a.endMessageIndex] : null;
                if (startMsg) startY = startMsg.calculatedY || startY;
                if (endMsg) endY = endMsg.calculatedY || endY;
                return yPos >= startY && yPos <= endY;
            });

            if (activeAtY.length === 0) return centerX;

            // Find the outermost activation
            const maxDepth = Math.max(...activeAtY.map(a => a.depth || 0));
            const actWidth = 10;
            const leftEdge = centerX - actWidth / 2;
            const rightEdge = centerX + actWidth / 2 + (maxDepth * 5);
            
            if (isSelfMessage) return centerX + 5; // Self messages usually start/end at the right edge of activation

            if (otherX > centerX) return rightEdge; // Other node is to the right
            return leftEdge; // Other node is to the left
        };

        let originX = fromExternal ? (this.map.nodes[conn.to]?.position.x || 100) - 50 : (originNode.position.x + originNode.size.width / 2);
        let targetX = toExternal ? (this.map.nodes[conn.from]?.position.x || 100) + (this.map.nodes[conn.from]?.size.width || 0) + 50 : (targetNode.position.x + targetNode.size.width / 2);

        if (!fromExternal && !isSelfMessage) {
            originX = getAdjustedX(conn.from, true, targetX);
        }
        if (!toExternal && !isSelfMessage) {
            targetX = getAdjustedX(conn.to, false, originX);
        }

        if (fromExternal && !toExternal) {
             const targetCenter = (targetNode.position.x + targetNode.size.width / 2);
             originX = conn.from === '[' ? targetCenter - 100 : targetCenter + 100;
        } else if (toExternal && !fromExternal) {
             const originCenter = (originNode.position.x + originNode.size.width / 2);
             targetX = conn.to === ']' ? originCenter + 100 : originCenter - 100;
        }

        const isDashed = conn.type.includes('--') || conn.type.includes('..');
        const isOpenArrow = conn.type.includes('>>') || conn.type.includes('\\') || conn.type.includes('/'); 
        const isBidirectional = conn.type.includes('<->') || (conn.type.startsWith('<') && conn.type.endsWith('>'));
        const connIndex = this.map.connections.indexOf(conn);
        const connGroup = new Konva.Group({ x: 0, y: yPos, draggable: true, id: `conn-${conn.from}-${conn.to}-${conn.label || ''}` });
        
        connGroup.dragBoundFunc((pos: {x: number, y: number}): {x: number, y: number} => {
            const absoluteX = connGroup.getAbsolutePosition().x;
            let participantsBottom = DEFAULTS.SEQUENCE_START_Y + DEFAULTS.PARTICIPANT_HEIGHT;
            if (this.map) {
                const bottoms = Object.values(this.map.nodes).map(n => n.position.y + n.size.height);
                if (bottoms.length > 0) participantsBottom = Math.max(...bottoms);
            }
            let minY = participantsBottom + 10; let maxY = 5000;
            if (connIndex > 0) {
                const prevGroup = this.connectionArrows[connIndex - 1]?.group;
                if (prevGroup) { minY = Math.max(minY, prevGroup.y() + 10); if (this.map!.connections[connIndex - 1].from === this.map!.connections[connIndex - 1].to) minY += 20; }
            }
            if (connIndex < this.map!.connections.length - 1) {
                const nextGroup = this.connectionArrows[connIndex + 1]?.group;
                if (nextGroup) maxY = nextGroup.y() - 10;
            }
            return { x: absoluteX, y: Math.max(minY, Math.min(maxY, pos.y)) };
        });

        connGroup.on('dragmove', () => { this.updateAllActivations(); });
        connGroup.on('dragend', (e: any) => { if (this.onNodeMove) { const newY = Math.round(e.target.y()); this.onNodeMove(connGroup.id(), 0, newY); } });

        let visualArrow: Konva.Arrow;
        if (isSelfMessage) {
            const actShift = getAdjustedX(conn.from, true, originX) - originX;
            visualArrow = new Konva.Arrow({ points: [originX + actShift, 0, originX + 30 + actShift, 0, originX + 30 + actShift, 20, originX + 7 + actShift, 20], stroke: '#A80036', strokeWidth: 2, hitStrokeWidth: 10, dash: isDashed ? [5, 5] : undefined, pointerLength: 8, pointerWidth: 8, fill: isOpenArrow ? 'rgba(0,0,0,0)' : '#A80036' });
        } else {
            visualArrow = new Konva.Arrow({ points: [originX, 0, targetX, 0], pointerLength: 10, pointerWidth: 10, fill: isOpenArrow ? 'rgba(0,0,0,0)' : '#A80036', stroke: '#A80036', strokeWidth: 2, hitStrokeWidth: 10, dash: isDashed ? [5, 5] : undefined, pointerAtBeginning: isBidirectional });
        }

        connGroup.on('mouseenter', () => { this.stage.container().style.cursor = 'move'; });
        connGroup.on('mouseleave', () => { this.stage.container().style.cursor = 'default'; });
        connGroup.add(visualArrow);

        let labelTextObj: Konva.Text | undefined;
        if (conn.label || conn.number) {
            const midX = isSelfMessage ? originX + 15 : ((originX + targetX) / 2);
            const displayText = (conn.number ? `(${conn.number}) ` : "") + (conn.label || "");
            const textWidth = isSelfMessage ? 150 : Math.max(50, Math.abs(targetX - originX) - 10);
            labelTextObj = new Konva.Text({ x: midX, text: displayText, fontSize: 12, fill: '#000', fontFamily: 'sans-serif', align: 'center', width: textWidth });
            labelTextObj.y(-labelTextObj.height() - 5); labelTextObj.offsetX(labelTextObj.width() / 2);
            connGroup.add(labelTextObj);
        }
        this.layer.add(connGroup);
        this.connectionArrows.push({ originId: conn.from, targetId: conn.to, konvaObj: visualArrow, labelObj: labelTextObj, group: connGroup });
    }

    private drawDivider(div: LayoutDivider) {
        const divIndex = this.map?.dividers?.indexOf(div) ?? -1;
        let minY = DEFAULTS.SEQUENCE_START_Y + DEFAULTS.PARTICIPANT_HEIGHT + 10;
        let maxY = 5000;

        const group = new Konva.Group({ 
            x: div.position.x, 
            y: div.position.y,
            draggable: true,
            id: `div-${div.label}`,
            dragBoundFunc: (pos) => {
                return { x: div.position.x, y: Math.max(minY, Math.min(maxY, pos.y)) };
            }
        });

        group.on('dragstart', () => {
            minY = DEFAULTS.SEQUENCE_START_Y + DEFAULTS.PARTICIPANT_HEIGHT + 10;
            maxY = 5000;
            if (this.map && divIndex !== -1) {
                const otherDividers = (this.map.dividers || []).filter(d => d !== div);
                const connections = this.map.connections || [];
                
                const predecessors = [
                    ...otherDividers.filter(d => d.position.y < div.position.y).map(d => d.position.y),
                    ...connections.filter(c => (c.calculatedY || 0) < div.position.y).map(c => (c.calculatedY || 0))
                ];
                if (predecessors.length > 0) {
                    minY = Math.max(minY, Math.max(...predecessors) + 10);
                }

                const successors = [
                    ...otherDividers.filter(d => d.position.y > div.position.y).map(d => d.position.y),
                    ...connections.filter(c => (c.calculatedY || 0) > div.position.y).map(c => (c.calculatedY || 0))
                ];
                if (successors.length > 0) {
                    maxY = Math.min(maxY, Math.min(...successors) - 10);
                }
            }
        });

        group.on('mouseenter', () => { this.stage.container().style.cursor = 'move'; });
        group.on('mouseleave', () => { this.stage.container().style.cursor = 'default'; });
        group.on('dragend', (e: any) => {
            if (this.onNodeMove) this.onNodeMove(`div-${div.label}`, Math.round(e.target.x()), Math.round(e.target.y()));
        });
        const text = new Konva.Text({ text: div.label, fontSize: 14, fontStyle: 'bold', width: div.size.width, align: 'center', fill: '#A80036', padding: 10 });

        // Measure text to leave a gap
        const textWidth = text.getTextWidth() + 20;
        const midX = div.size.width / 2;
        const gap = textWidth / 2;
        
        const isInitialization = div.label.toLowerCase().includes('initialization');
        if (isInitialization) {
            const boxWidth = textWidth;
            const boxHeight = text.height();
            const boxX = midX - boxWidth/2;
            const rect = new Konva.Rect({ x: boxX, y: 0, width: boxWidth, height: boxHeight, stroke: '#A80036', strokeWidth: 1, fill: '#EEEEEE' });
            group.add(rect);
        }

        const lineY = text.height() / 2;
        const lineLeft = new Konva.Line({ points: [0, lineY, midX - gap, lineY], stroke: '#A80036', strokeWidth: 2 });
        const lineRight = new Konva.Line({ points: [midX + gap, lineY, div.size.width, lineY], stroke: '#A80036', strokeWidth: 2 });
        
        if (isInitialization) {
             const doubleLineLeft = new Konva.Line({ points: [0, lineY - 3, midX - gap, lineY - 3], stroke: '#A80036', strokeWidth: 2 });
             const doubleLineRight = new Konva.Line({ points: [midX + gap, lineY - 3, div.size.width, lineY - 3], stroke: '#A80036', strokeWidth: 2 });
             const doubleLineLeft2 = new Konva.Line({ points: [0, lineY + 3, midX - gap, lineY + 3], stroke: '#A80036', strokeWidth: 2 });
             const doubleLineRight2 = new Konva.Line({ points: [midX + gap, lineY + 3, div.size.width, lineY + 3], stroke: '#A80036', strokeWidth: 2 });
             group.add(doubleLineLeft); group.add(doubleLineRight);
             group.add(doubleLineLeft2); group.add(doubleLineRight2);
        } else {
             group.add(lineLeft); group.add(lineRight);
        }
        group.add(text); this.layer.add(group);
    }

    private drawDelay(delay: any) {
        const group = new Konva.Group({ x: 400, y: delay.position.y });
        for (let i = 0; i < 3; i++) { group.add(new Konva.Circle({ x: 0, y: i * 10, radius: 2, fill: '#A80036' })); }
        this.layer.add(group);
    }

    private updateConnections(nodeId: string) {
        if (!this.map) return;
        const draggedGroup = this.nodeGroups[nodeId];
        const draggedNodeBase = this.map.nodes[nodeId];
        if (!draggedGroup || !draggedNodeBase) return;
        
        const draggedCenterX = draggedGroup.x() + (draggedNodeBase.size.width / 2);
        const lifeline = this.lifelines[nodeId];
        if (lifeline) {
            const points = lifeline.points();
            points[0] = draggedCenterX;
            points[2] = draggedCenterX;
            lifeline.points(points);
        }
        this.updateActivationsForNode(nodeId);

        // Helper to get X coordinate adjusted for activations (local to updateConnections)
        const getAdjustedX = (targetId: string, otherX: number, yPos: number, isSelf: boolean) => {
            const node = this.map!.nodes[targetId];
            if (!node) return 0;
            const nodeGroup = this.nodeGroups[targetId];
            const centerX = (nodeGroup ? nodeGroup.x() : node.position.x) + node.size.width / 2;
            
            const entries = this.activationRects[targetId] || [];
            const activeAtY = entries.filter(entry => {
                const a = entry.def;
                let startY = a.startPosition.y;
                let endY = startY + a.size.height;
                if (a.startMessageIndex !== undefined && this.connectionArrows[a.startMessageIndex]) {
                    startY = this.connectionArrows[a.startMessageIndex].group.y();
                }
                if (a.endMessageIndex !== undefined && this.connectionArrows[a.endMessageIndex]) {
                    endY = this.connectionArrows[a.endMessageIndex].group.y();
                }
                return yPos >= startY && yPos <= endY;
            });

            if (activeAtY.length === 0) return centerX;
            let maxDepth = 0;
            for (const entry of activeAtY) {
                if ((entry.def.depth || 0) > maxDepth) maxDepth = entry.def.depth!;
            }
            const actWidth = 10;
            const leftEdge = centerX - actWidth / 2;
            const rightEdge = centerX + actWidth / 2 + (maxDepth * 5);
            if (isSelf) return centerX + 5;
            if (otherX > centerX) return rightEdge;
            return leftEdge;
        };

        const movedMessageIndices = new Set<number>();
        this.connectionArrows.forEach((conn, index) => {
            if (conn.originId === nodeId || conn.targetId === nodeId) {
                movedMessageIndices.add(index);
                const isSelfMessage = conn.originId === conn.targetId;
                const yPos = conn.group.y();
                if (isSelfMessage) {
                    const adjX = getAdjustedX(nodeId, draggedCenterX, yPos, true);
                    conn.konvaObj.points([adjX, 0, adjX + 30, 0, adjX + 30, 20, adjX + 7, 20]);
                    if (conn.labelObj) {
                        conn.labelObj.width(150);
                        conn.labelObj.offsetX(conn.labelObj.width() / 2);
                        conn.labelObj.position({ x: adjX + 15, y: -conn.labelObj.height() - 5 });
                    }
                } else {
                    const originBase = this.map!.nodes[conn.originId];
                    const originGroup = this.nodeGroups[conn.originId];
                    const targetBase = this.map!.nodes[conn.targetId];
                    const targetGroup = this.nodeGroups[conn.targetId];
                    const fromExternal = conn.originId === '[' || conn.originId === ']';
                    const toExternal = conn.targetId === '[' || conn.targetId === ']';
                    
                    let rawOriginX = fromExternal ? (targetGroup?.x() || 100) + (targetBase?.size.width || 0) / 2 - 100 : (originGroup!.x() + originBase!.size.width / 2);
                    let rawTargetX = toExternal ? (originGroup?.x() || 100) + (originBase?.size.width || 0) / 2 + 100 : (targetGroup!.x() + targetBase!.size.width / 2);
                    
                    let originX = fromExternal ? rawOriginX : getAdjustedX(conn.originId, rawTargetX, yPos, false);
                    let targetX = toExternal ? rawTargetX : getAdjustedX(conn.targetId, rawOriginX, yPos, false);

                    if (fromExternal && targetGroup) {
                        const targetCenter = targetGroup.x() + targetBase.size.width / 2;
                        originX = conn.originId === '[' ? targetCenter - 100 : targetCenter + 100;
                    } else if (toExternal && originGroup) {
                        const originCenter = originGroup.x() + originBase.size.width / 2;
                        targetX = conn.targetId === ']' ? originCenter + 100 : originCenter - 100;
                    }
                    conn.konvaObj.points([originX, 0, targetX, 0]);
                    if (conn.labelObj) { 
                        const midX = (originX + targetX) / 2; 
                        const textWidth = Math.max(50, Math.abs(targetX - originX) - 10);
                        conn.labelObj.width(textWidth); 
                        conn.labelObj.offsetX(conn.labelObj.width() / 2); 
                        conn.labelObj.position({ x: midX, y: -conn.labelObj.height() - 5 }); 
                    }
                }
            }
        });

        // Update Groups
        this.groupVisuals.forEach(visual => {
            const { group, rect, def } = visual;
            if (def.participants && def.participants.indexOf(nodeId) !== -1) {
                const nodes = def.participants.map(pId => ({
                    group: this.nodeGroups[pId],
                    base: this.map!.nodes[pId]
                })).filter(n => n.group && n.base);

                if (nodes.length > 0) {
                    const padding = def.keyword === 'box' ? 20 : 10;
                    let minX = Infinity;
                    let maxX = -Infinity;
                    for (const n of nodes) {
                        const x = n.group.x();
                        if (x < minX) minX = x;
                        const right = x + n.base.size.width;
                        if (right > maxX) maxX = right;
                    }
                    minX -= padding;
                    maxX += padding;

                    group.x(minX);
                    rect.width(Math.max(100, maxX - minX));

                    const children = group.getChildren();
                    for (let i = 0; i < children.length; i++) {
                        const child = children[i];
                        if (child instanceof Konva.Text) {
                            if (child.align() === 'center') child.width(rect.width());
                        } else if (child instanceof Konva.Line && child !== rect) {
                            const points = child.points();
                            points[2] = rect.width();
                            child.points(points);
                        }
                    }
                }
            }
        });

        // Update Activation Y positions
        for (const nodeIdKey in this.activationRects) {
            const rectList = this.activationRects[nodeIdKey];
            for (let i = 0; i < rectList.length; i++) {
                const { rect, def } = rectList[i];
                const startIdx = def.startMessageIndex;
                const endIdx = def.endMessageIndex;
                if ((startIdx !== undefined && movedMessageIndices.has(startIdx)) || (endIdx !== undefined && movedMessageIndices.has(endIdx))) {
                    let startY = rect.y();
                    let endY = startY + rect.height();
                    if (startIdx !== undefined && this.connectionArrows[startIdx]) startY = this.connectionArrows[startIdx].group.y();
                    if (endIdx !== undefined && this.connectionArrows[endIdx]) endY = this.connectionArrows[endIdx].group.y();
                    rect.y(startY);
                    rect.height(Math.max(5, endY - startY));
                }
            }
        }
    }
private drawGroup(groupDef: LayoutGroup) {
    const group = new Konva.Group({ 
        x: groupDef.position.x, 
        y: groupDef.position.y,
        draggable: true,
        id: groupDef.id
    });
    const isBox = groupDef.keyword === 'box';
    const isRef = groupDef.keyword === 'ref';

    group.on('mouseenter', () => { this.stage.container().style.cursor = 'move'; });
    group.on('mouseleave', () => { this.stage.container().style.cursor = 'default'; });
    group.on('dragend', (e: any) => {
        const newX = Math.round(e.target.x());
        const newY = Math.round(e.target.y());
        if (this.onNodeMove) this.onNodeMove(groupDef.id, newX, newY);
    });

    const rect = new Konva.Rect({ 
            width: groupDef.size.width, 
            height: groupDef.size.height, 
            stroke: groupDef.color || '#A80036', 
            strokeWidth: 2, 
            dash: isBox ? undefined : [], // Solid lines for alt, loop, etc.
            fill: groupDef.color ? groupDef.color : (isBox ? '#DDDDDD' : undefined), 
            fillOpacity: groupDef.color ? 0.1 : (isBox ? 0.3 : 0) 
        });
        
        group.add(rect);

        if (!isBox) {
            const keyword = groupDef.keyword === 'group' ? 'alt' : groupDef.keyword; // Default to alt for unnamed groups
            const keywordText = new Konva.Text({ text: isRef ? 'ref' : keyword, fontSize: 12, fontStyle: 'bold', padding: 5, fill: 'black' });
            const keywordRect = new Konva.Rect({ width: keywordText.width(), height: keywordText.height(), fill: '#EEEEEE', stroke: groupDef.color || '#A80036', strokeWidth: 1 });
            group.add(keywordRect); group.add(keywordText);

            if (isRef) {
                const label = new Konva.Text({ 
                    x: 0, y: groupDef.size.height / 2 - 10, 
                    text: groupDef.label || '', 
                    fontSize: 12, fontStyle: 'bold', 
                    width: groupDef.size.width, align: 'center',
                    fill: 'black' 
                });
                group.add(label);
            } else {
                const label = new Konva.Text({ x: keywordRect.width() + 5, y: 5, text: groupDef.label ? `[${groupDef.label}]` : '', fontSize: 12, fontStyle: 'bold', fill: groupDef.color || '#A80036' });
                group.add(label);
            }
        } else {
            const label = new Konva.Text({ x: 0, y: 5, text: groupDef.label || '', width: groupDef.size.width, align: 'center', fontSize: 14, fontStyle: 'bold', fill: 'black' });
            group.add(label);
        }

        const dividers: Konva.Line[] = []; const labels: Konva.Text[] = [];
        if (groupDef.dividerYs) {
            groupDef.dividerYs.forEach((dividerY, index) => {
                const relativeY = dividerY - groupDef.position.y;
                const divider = new Konva.Line({ points: [0, relativeY, groupDef.size.width, relativeY], stroke: groupDef.color || '#A80036', strokeWidth: 1, dash: [5, 5] });
                group.add(divider); dividers.push(divider);
                const nextSection = groupDef.sections[index + 1];
                if (nextSection && nextSection.label) { 
                    const sectionLabel = new Konva.Text({ x: 5, y: relativeY + 10, text: `[${nextSection.label}]`, fontSize: 11, fontStyle: 'italic', fill: groupDef.color || '#A80036' }); 
                    group.add(sectionLabel); labels.push(sectionLabel); 
                }
            });
        }
        this.groupVisuals.push({ group, rect, dividers, labels, def: groupDef }); this.layer.add(group);
    }

    private drawNote(noteDef: LayoutNote) {
        const group = new Konva.Group({ 
            x: noteDef.position.x, 
            y: noteDef.position.y,
            draggable: true,
            id: `note-${noteDef.text.substring(0, 10)}` // Simple ID
        });
        group.on('mouseenter', () => { this.stage.container().style.cursor = 'move'; });
        group.on('mouseleave', () => { this.stage.container().style.cursor = 'default'; });
        group.on('dragend', (e: any) => {
            if (this.onNodeMove) this.onNodeMove(group.id(), Math.round(e.target.x()), Math.round(e.target.y()));
        });
        const rect = new Konva.Rect({ width: noteDef.size.width, height: noteDef.size.height, fill: '#FBFB77', stroke: '#A80036', strokeWidth: 1 });
        const text = new Konva.Text({ text: noteDef.text, width: noteDef.size.width, padding: 5, fontSize: 12, align: 'center' });
        group.add(rect); group.add(text); this.layer.add(group);
    }

    private updateAllActivations() { if (!this.map) return; Object.keys(this.activationRects).forEach(nodeId => { this.updateActivationsForNode(nodeId); }); }

    private updateActivationsForNode(nodeId: string) {
        const entries = this.activationRects[nodeId]; const nodeDef = this.map?.nodes[nodeId];
        if (!entries || !nodeDef) return;
        const nodeGroup = this.nodeGroups[nodeId]; const centerX = (nodeGroup ? nodeGroup.x() : nodeDef.position.x) + (nodeDef.size.width / 2);
        entries.forEach(({ rect, def }) => {
            rect.x(centerX - rect.width() / 2 + (def.depth || 0) * 5);
            let startY = def.startPosition.y; let endY = startY + def.size.height;
            if (def.startMessageIndex !== undefined && this.connectionArrows[def.startMessageIndex]) startY = this.connectionArrows[def.startMessageIndex].group.y();
            if (def.endMessageIndex !== undefined && this.connectionArrows[def.endMessageIndex]) endY = this.connectionArrows[def.endMessageIndex].group.y();
            rect.y(startY); rect.height(Math.max(5, endY - startY));
        });
    }
}
