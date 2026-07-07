import Konva from 'konva';
import { LayoutMap, LayoutNode, LayoutConnection, LayoutGroup, LayoutNote, LayoutActivation, LayoutDivider, DEFAULTS } from "../layout/types";
import { THEME } from "./primitives";

/** Sanitize IDs for use in Konva selectors (avoid CSS special chars like / " ' etc.) */
function safeId(id: string): string {
    return id.replace(/[^a-zA-Z0-9_-]/g, '_');
}

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
        group: Konva.Group,
        headObj?: Konva.Shape,
        startHeadObj?: Konva.Shape,
        selfMessageWidth?: number
    }[] = [];
    protected lifelines: Record<string, Konva.Line> = {};
    protected activationRects: Record<string, { rect: Konva.Rect, def: LayoutActivation, destroyX1?: Konva.Line, destroyX2?: Konva.Line }[]> = {};
    protected groupVisuals: { group: Konva.Group, rect: Konva.Rect, dividers: Konva.Line[], labels: Konva.Text[], def: LayoutGroup }[] = [];
    protected dividerVisuals: { group: Konva.Group, rect: Konva.Rect, doubleLines: Konva.Line[], text: Konva.Text, def: LayoutDivider }[] = [];
    protected noteVisuals: { group: Konva.Group, rect: Konva.Rect, text: Konva.Text, def: LayoutNote }[] = [];
    protected participantOrder: string[] = [];

    protected participantRects: Konva.Rect[] = [];  // tracked for shadow toggling during drag

    constructor(stage: Konva.Stage, layer: Konva.Layer) {
        this.stage = stage;
        this.layer = layer;
    }

    public setOnDragEnd(callback: (id: string, newX: number, newY: number) => void) {
        this.onNodeMove = callback;
    }

    /**
     * Toggle shadows on participant boxes on/off during drag.
     * Canvas shadowBlur is extremely expensive — disabling it during drag
     * reduces per-frame repaint cost significantly.
     */
    public setDragging(isDragging: boolean) {
        for (const rect of this.participantRects) {
            rect.shadowEnabled(!isDragging);
        }
    }

    public render(map: LayoutMap) {
        this.map = map;
        this.layer.destroyChildren();
        this.nodeGroups = {};
        this.connectionArrows = [];
        this.lifelines = {};
        this.activationRects = {};
        this.groupVisuals = [];
        this.dividerVisuals = [];
        this.noteVisuals = [];
        this.participantRects = [];
        const sortedNodes = Object.values(map.nodes).filter(n => n.type === 'participant' || n.type === 'actor').sort((a, b) => a.position.x - b.position.x);
        this.participantOrder = sortedNodes.map(n => n.id);
        map.groups.forEach(group => this.drawGroup(group));
        Object.values(map.nodes).forEach(node => { this.drawLifeline(node); this.drawNode(node); });
        if (map.activations) map.activations.forEach(act => this.drawActivation(act));
        map.connections.forEach(conn => this.drawConnection(conn));
        if (map.dividers) map.dividers.forEach(div => this.drawDivider(div));
        if (map.delays) map.delays.forEach(delay => this.drawDelay(delay));
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
        this.updateAllActivations();
        // Sync Groups
        this.groupVisuals.forEach(visual => {
            const { group, rect, def } = visual;
            group.position(def.position);
            rect.size(def.size);
        });
        // Sync Dividers
        this.dividerVisuals.forEach(visual => {
            const { group, rect, def } = visual;
            group.position(def.position);
            rect.width(def.size.width);
        });
        // Sync Notes
        this.noteVisuals.forEach(visual => {
            const { group, rect, def } = visual;
            group.position(def.position);
            rect.size(def.size);
        });
        this.layer.batchDraw();
    }

    private drawLifeline(nodeDef: LayoutNode) {
        if (!nodeDef.lifelineX || !nodeDef.lifelineY) return;
        let maxY = (this.map as any).totalHeight || 2000;
        maxY += 30;
        if (this.map?.activations) {
            const destroyAct = this.map.activations.find(act => act.nodeId === nodeDef.id && act.isDestroy);
            if (destroyAct) maxY = destroyAct.startPosition.y + destroyAct.size.height;
        }
        const line = new Konva.Line({ points: [nodeDef.lifelineX, nodeDef.lifelineY, nodeDef.lifelineX, maxY], stroke: THEME.stroke, strokeWidth: THEME.strokeWidth, dash: THEME.lifelineDash });
        this.lifelines[nodeDef.id] = line;
        this.layer.add(line);
    }

    private drawActivation(act: LayoutActivation) {
        const rect = new Konva.Rect({ x: act.startPosition.x, y: act.startPosition.y, width: act.size.width, height: act.size.height, fill: THEME.activationFill, stroke: THEME.stroke, strokeWidth: THEME.strokeWidth });
        const activationGroup = new Konva.Group();
        activationGroup.add(rect);
        if (!this.activationRects[act.nodeId]) this.activationRects[act.nodeId] = [];
        
        let destroyX1: Konva.Line | undefined;
        let destroyX2: Konva.Line | undefined;

        if (act.isDestroy) {
            const centerX = act.startPosition.x + act.size.width / 2; const endY = act.startPosition.y + act.size.height;
            const size = 20; const x1 = centerX - size / 2; const x2 = centerX + size / 2; const y1 = endY - size / 2; const y2 = endY + size / 2;
            destroyX1 = new Konva.Line({ points: [x1, y1, x2, y2], stroke: THEME.stroke, strokeWidth: 4 });
            destroyX2 = new Konva.Line({ points: [x2, y1, x1, y2], stroke: THEME.stroke, strokeWidth: 4 });
            activationGroup.add(destroyX1); activationGroup.add(destroyX2);
        }
        this.activationRects[act.nodeId].push({ rect, def: act, destroyX1, destroyX2 });
        this.layer.add(activationGroup);
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
        group.on('dragstart', () => { this.setDragging(true); });
        group.on('dragend', (e: any) => {
            this.setDragging(false);
            const newX = Math.round(e.target.x()); const newY = Math.round(e.target.y());
            if (this.onNodeMove) this.onNodeMove(nodeDef.id, newX, newY);
        });
        group.on('dragmove', () => { this.updateConnections(nodeDef.id); });
        if (nodeDef.type === 'actor') {
            const centerX = nodeDef.size.width / 2; const headRadius = 10; const headY = headRadius;
            const head = new Konva.Circle({ x: centerX, y: headY, radius: headRadius, stroke: THEME.stroke, strokeWidth: THEME.actorStrokeWidth, fill: THEME.sequenceFill });
            const body = new Konva.Line({ points: [centerX, headY + headRadius, centerX, headY + headRadius + 20], stroke: THEME.stroke, strokeWidth: THEME.actorStrokeWidth });
            const arms = new Konva.Line({ points: [centerX - 15, headY + headRadius + 5, centerX + 15, headY + headRadius + 5], stroke: THEME.stroke, strokeWidth: THEME.actorStrokeWidth });
            const legs = new Konva.Line({ points: [centerX - 10, headY + headRadius + 35, centerX, headY + headRadius + 20, centerX + 10, headY + headRadius + 35], stroke: THEME.stroke, strokeWidth: THEME.actorStrokeWidth });
            group.add(head); group.add(body); group.add(arms); group.add(legs);
            const text = new Konva.Text({
                text: nodeDef.origName + (nodeDef.stereotype ? `\n${nodeDef.stereotype}` : ""),
                fontSize: THEME.fontSize, fontFamily: THEME.fontFamily, fill: THEME.text, width: nodeDef.size.width, y: headY + headRadius + 40, align: 'center',
                fontStyle: THEME.fontWeightHeader,
            });
            group.add(text);
        } else {
            const rect = new Konva.Rect({ width: nodeDef.size.width, height: nodeDef.size.height, fill: THEME.sequenceFill, stroke: THEME.stroke, strokeWidth: THEME.strokeWidth, cornerRadius: THEME.nodeRadius, dash: THEME.nodeBorderDash, shadowColor: THEME.shadowColor, shadowBlur: THEME.shadowBlur, shadowOffset: { x: THEME.shadowOffsetX, y: THEME.shadowOffsetY }, shadowOpacity: THEME.shadowOpacity, });
            this.participantRects.push(rect);
            const text = new Konva.Text({
                text: nodeDef.origName + (nodeDef.stereotype ? `\n${nodeDef.stereotype}` : ""),
                fontSize: THEME.fontSize, fontFamily: THEME.fontFamily, fill: THEME.text, width: nodeDef.size.width, height: nodeDef.size.height, align: 'center', verticalAlign: 'middle',
                fontStyle: THEME.fontWeightHeader,
            });
            group.add(rect); group.add(text);
        }
        this.nodeGroups[nodeDef.id] = group; this.layer.add(group);
    }

    private getArrowHeadType(type: string) {
        const isDashed = type.includes('--') || type.includes('..');
        const isBidirectional = type.includes('<->') || (type.startsWith('<') && type.endsWith('>'));
        
        const getHead = (s: string) => {
            if (s.includes('x')) return 'lost';
            if (s.includes('o')) return 'found';
            if (s.includes('>>')) return 'open';
            if (s.includes('\\')) return 'half-top';
            if (s.includes('/')) return 'half-bottom';
            if (s.includes('>')) return 'filled';
            if (s.includes('<')) return 'filled';
            return 'none';
        };
        
        const parts = type.split(/[-.=]+/);
        const startHead = getHead(parts[0]);
        const endHead = getHead(parts[parts.length - 1]);
        
        return { isDashed, isBidirectional, startHead, endHead };
    }

    private createArrowHead(type: string, color: string): Konva.Shape | undefined {
        if (type === 'none') return undefined;
        
        return new Konva.Shape({
            name: 'arrow-head',
            sceneFunc: (context, shape) => {
                const length = 10;
                const width = 10;
                context.beginPath();
                if (type === 'lost') {
                    context.moveTo(-5, -5); context.lineTo(5, 5);
                    context.moveTo(5, -5); context.lineTo(-5, 5);
                } else if (type === 'found') {
                    context.arc(-5, 0, 5, 0, Math.PI * 2);
                } else if (type === 'open') {
                    context.moveTo(-length, -width/2);
                    context.lineTo(0, 0);
                    context.lineTo(-length, width/2);
                } else if (type === 'half-top') {
                    context.moveTo(-length, -width/2);
                    context.lineTo(0, 0);
                } else if (type === 'half-bottom') {
                    context.moveTo(-length, width/2);
                    context.lineTo(0, 0);
                } else {
                    context.moveTo(0, 0);
                    context.lineTo(-length, -width/2);
                    context.lineTo(-length, width/2);
                    context.closePath();
                    context.fillStrokeShape(shape);
                    return;
                }
                context.strokeShape(shape);
            },
            stroke: color,
            strokeWidth: 2,
            fill: type === 'filled' ? color : undefined
        });
    }

    private updateArrowHead(head: Konva.Shape, from: {x: number, y: number}, to: {x: number, y: number}) {
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        head.position(to);
        head.rotation(angle * 180 / Math.PI);
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

        const getAdjustedX = (nodeId: string, isOrigin: boolean, otherX: number) => {
            const node = this.map!.nodes[nodeId];
            if (!node) return 0;
            const centerX = node.position.x + node.size.width / 2;
            const activations = this.map!.activations?.filter(a => a.nodeId === nodeId) || [];
            const activeAtY = activations.filter(a => {
                let startY = a.startPosition.y;
                let endY = startY + a.size.height;
                const startMsg = a.startMessageIndex !== undefined ? this.map!.connections[a.startMessageIndex] : null;
                const endMsg = a.endMessageIndex !== undefined ? this.map!.connections[a.endMessageIndex] : null;
                if (startMsg) startY = startMsg.calculatedY || startY;
                if (endMsg) endY = endMsg.calculatedY || endY;
                return yPos >= startY && yPos <= endY;
            });
            if (activeAtY.length === 0) return centerX;
            const maxDepth = Math.max(...activeAtY.map(a => a.depth || 0));
            const actWidth = 10;
            const leftEdge = centerX - actWidth / 2;
            const rightEdge = centerX + actWidth / 2 + (maxDepth * 5);
            if (isSelfMessage) return centerX + 5;
            if (otherX > centerX) return rightEdge;
            return leftEdge;
        };

        let originX = fromExternal ? (this.map.nodes[conn.to]?.position.x || 100) - 50 : (originNode.position.x + originNode.size.width / 2);
        let targetX = toExternal ? (this.map.nodes[conn.from]?.position.x || 100) + (this.map.nodes[conn.from]?.size.width || 0) + 50 : (targetNode.position.x + targetNode.size.width / 2);

        if (!fromExternal && !isSelfMessage) originX = getAdjustedX(conn.from, true, targetX);
        if (!toExternal && !isSelfMessage) targetX = getAdjustedX(conn.to, false, originX);

        if (fromExternal && !toExternal) {
             const targetCenter = (targetNode.position.x + targetNode.size.width / 2);
             originX = conn.from === '[' ? targetCenter - 100 : targetCenter + 100;
        } else if (toExternal && !fromExternal) {
             const originCenter = (originNode.position.x + originNode.size.width / 2);
             targetX = conn.to === ']' ? originCenter + 100 : originCenter - 100;
        }

        const arrowInfo = this.getArrowHeadType(conn.type);
        const connIndex = this.map.connections.indexOf(conn);
        const connGroup = new Konva.Group({ x: 0, y: yPos, draggable: true, id: safeId(`conn-${conn.from}-${conn.to}-${conn.label || ''}`) });
        
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
        const color = (conn as any).color || THEME.arrowFill;
        let headObj: Konva.Shape | undefined;
        let startHeadObj: Konva.Shape | undefined;

        if (isSelfMessage) {
            const loopWidth = (conn as any).selfMessageWidth ? Math.min(40, (conn as any).selfMessageWidth / 2) : 30;
            const actShift = getAdjustedX(conn.from, true, originX) - originX;
            const points = [originX + actShift, 0, originX + loopWidth + actShift, 0, originX + loopWidth + actShift, 20, originX + 7 + actShift, 20];
            visualArrow = new Konva.Arrow({ points, stroke: color, strokeWidth: THEME.connectionStrokeWidth, hitStrokeWidth: 10, dash: arrowInfo.isDashed ? [5, 5] : undefined, pointerLength: 0 });
            headObj = this.createArrowHead(arrowInfo.endHead, color);
            if (headObj) {
                this.updateArrowHead(headObj, { x: points[4], y: points[5] }, { x: points[6], y: points[7] });
                connGroup.add(headObj);
            }
        } else {
            visualArrow = new Konva.Arrow({ points: [originX, 0, targetX, 0], pointerLength: 0, stroke: color, strokeWidth: THEME.connectionStrokeWidth, hitStrokeWidth: 10, dash: arrowInfo.isDashed ? [5, 5] : undefined });
            headObj = this.createArrowHead(arrowInfo.endHead, color);
            if (headObj) {
                this.updateArrowHead(headObj, { x: originX, y: 0 }, { x: targetX, y: 0 });
                connGroup.add(headObj);
            }
            if (arrowInfo.isBidirectional || arrowInfo.startHead !== 'none') {
                startHeadObj = this.createArrowHead(arrowInfo.startHead !== 'none' ? arrowInfo.startHead : arrowInfo.endHead, color);
                if (startHeadObj) {
                    this.updateArrowHead(startHeadObj, { x: targetX, y: 0 }, { x: originX, y: 0 });
                    connGroup.add(startHeadObj);
                }
            }
        }
        connGroup.on('mouseenter', () => { this.stage.container().style.cursor = 'move'; });
        connGroup.on('mouseleave', () => { this.stage.container().style.cursor = 'default'; });
        connGroup.add(visualArrow);
        let labelTextObj: Konva.Text | undefined;
        if (conn.label || conn.number) {
            const selfMsgW = (conn as any).selfMessageWidth || 150;
            const midX = isSelfMessage ? originX + selfMsgW / 4 : ((originX + targetX) / 2);
            const displayText = (conn.number ? `(${conn.number}) ` : "") + (conn.label || "");
            const textWidth = isSelfMessage ? selfMsgW / 2 : Math.max(50, Math.abs(targetX - originX) - 10);
            labelTextObj = new Konva.Text({ x: midX, text: displayText, fontSize: 12, fill: THEME.text, fontFamily: THEME.fontFamily, align: 'center', width: textWidth, fontStyle: THEME.fontWeightBody });
            labelTextObj.y(-labelTextObj.height() - 5); labelTextObj.offsetX(labelTextObj.width() / 2);
            connGroup.add(labelTextObj);
        }
        this.layer.add(connGroup);
        this.connectionArrows.push({ originId: conn.from, targetId: conn.to, konvaObj: visualArrow, labelObj: labelTextObj, group: connGroup, headObj, startHeadObj, selfMessageWidth: (conn as any).selfMessageWidth });
    }

    private drawDivider(div: LayoutDivider) {
        const divIndex = this.map?.dividers?.indexOf(div) ?? -1;
        let minY = DEFAULTS.SEQUENCE_START_Y + DEFAULTS.PARTICIPANT_HEIGHT + 10;
        let maxY = 5000;
        const group = new Konva.Group({ x: div.position.x, y: div.position.y, draggable: true, id: `div-${div.label}`, dragBoundFunc: (pos) => { return { x: div.position.x, y: Math.max(minY, Math.min(maxY, pos.y)) }; } });
        group.on('dragstart', () => {
            minY = DEFAULTS.SEQUENCE_START_Y + DEFAULTS.PARTICIPANT_HEIGHT + 10; maxY = 5000;
            if (this.map && divIndex !== -1) {
                const predecessors = [...(this.map.dividers || []).filter(d => d.position.y < div.position.y).map(d => d.position.y), ...this.map.connections.filter(c => (c.calculatedY || 0) < div.position.y).map(c => (c.calculatedY || 0))];
                if (predecessors.length > 0) minY = Math.max(minY, Math.max(...predecessors) + 10);
                const successors = [...(this.map.dividers || []).filter(d => d.position.y > div.position.y).map(d => d.position.y), ...this.map.connections.filter(c => (c.calculatedY || 0) > div.position.y).map(c => (c.calculatedY || 0))];
                if (successors.length > 0) maxY = Math.min(maxY, Math.min(...successors) - 10);
            }
        });
        group.on('mouseenter', () => { this.stage.container().style.cursor = 'move'; });
        group.on('mouseleave', () => { this.stage.container().style.cursor = 'default'; });
        group.on('dragend', (e: any) => { if (this.onNodeMove) this.onNodeMove(`div-${div.label}`, Math.round(e.target.x()), Math.round(e.target.y())); });
        const text = new Konva.Text({ text: div.label, fontSize: THEME.fontSize, fontStyle: THEME.fontWeightHeader, width: div.size.width, align: 'center', fill: THEME.text, fontFamily: THEME.fontFamily, padding: 10 });
        const textWidth = text.getTextWidth() + 20; const midX = div.size.width / 2; const gap = textWidth / 2;
        const boxWidth = textWidth; const boxHeight = text.height(); const boxX = midX - boxWidth/2;
        const rect = new Konva.Rect({ x: boxX, y: 0, width: boxWidth, height: boxHeight, stroke: THEME.stroke, strokeWidth: THEME.strokeWidth, fill: THEME.headerFill });
        group.add(rect);
        const lineY = text.height() / 2;
        const doubleLineLeft = new Konva.Line({ points: [0, lineY - 3, midX - gap, lineY - 3], stroke: THEME.stroke, strokeWidth: THEME.strokeWidth });
        const doubleLineRight = new Konva.Line({ points: [midX + gap, lineY - 3, div.size.width, lineY - 3], stroke: THEME.stroke, strokeWidth: THEME.strokeWidth });
        const doubleLineLeft2 = new Konva.Line({ points: [0, lineY + 3, midX - gap, lineY + 3], stroke: THEME.stroke, strokeWidth: THEME.strokeWidth });
        const doubleLineRight2 = new Konva.Line({ points: [midX + gap, lineY + 3, div.size.width, lineY + 3], stroke: THEME.stroke, strokeWidth: THEME.strokeWidth });
        
        const doubleLines = [doubleLineLeft, doubleLineRight, doubleLineLeft2, doubleLineRight2];
        doubleLines.forEach(l => group.add(l));
        group.add(text); this.layer.add(group);
        this.dividerVisuals.push({ group, rect, doubleLines, text, def: div });
    }

    private drawDelay(delay: any) {
        const group = new Konva.Group({ x: delay.position.x, y: delay.position.y });
        for (let i = 0; i < 3; i++) { group.add(new Konva.Circle({ x: 0, y: i * 10, radius: 2, fill: THEME.arrowFill })); }
        if (delay.text) { group.add(new Konva.Text({ text: delay.text, fontSize: 12, fill: THEME.text, fontFamily: THEME.fontFamily, fontStyle: THEME.fontWeightBody.includes('bold') ? 'italic bold' : 'italic', y: 15, x: 10 })); }
        this.layer.add(group);
    }

    private drawNote(noteDef: LayoutNote) {
        const group = new Konva.Group({ x: noteDef.position.x, y: noteDef.position.y, draggable: true, id: `note-${noteDef.text.substring(0, 10)}` });
        group.on('mouseenter', () => { this.stage.container().style.cursor = 'move'; });
        group.on('mouseleave', () => { this.stage.container().style.cursor = 'default'; });
        group.on('dragend', (e: any) => { if (this.onNodeMove) this.onNodeMove(group.id(), Math.round(e.target.x()), Math.round(e.target.y())); });
        const rect = new Konva.Rect({ width: noteDef.size.width, height: noteDef.size.height, fill: THEME.noteFill, stroke: THEME.stroke, strokeWidth: THEME.strokeWidth, cornerRadius: THEME.noteRadius, dash: THEME.nodeBorderDash });
        const text = new Konva.Text({ text: noteDef.text, width: noteDef.size.width, padding: 5, fontSize: 12, align: 'center', fontFamily: THEME.fontFamily, fill: THEME.text, fontStyle: THEME.fontWeightBody });
        group.add(rect); group.add(text);
        this.layer.add(group);
        this.noteVisuals.push({ group, rect, text, def: noteDef });
    }

    private updateConnections(nodeId: string) {
        if (!this.map) return;
        const draggedGroup = this.nodeGroups[nodeId]; const draggedNodeBase = this.map.nodes[nodeId];
        if (!draggedGroup || !draggedNodeBase) return;
        const draggedCenterX = draggedGroup.x() + (draggedNodeBase.size.width / 2);
        const lifeline = this.lifelines[nodeId];
        if (lifeline) { const points = lifeline.points(); points[0] = draggedCenterX; points[2] = draggedCenterX; lifeline.points(points); }
        this.updateActivationsForNode(nodeId);

        const getAdjustedX = (targetId: string, otherX: number, yPos: number, isSelf: boolean) => {
            const node = this.map!.nodes[targetId]; if (!node) return 0;
            const nodeGroup = this.nodeGroups[targetId]; const centerX = (nodeGroup ? nodeGroup.x() : node.position.x) + node.size.width / 2;
            const entries = this.activationRects[targetId] || [];
            const activeAtY = entries.filter(entry => {
                const a = entry.def; let startY = a.startPosition.y; let endY = startY + a.size.height;
                if (a.startMessageIndex !== undefined && this.connectionArrows[a.startMessageIndex]) startY = this.connectionArrows[a.startMessageIndex].group.y();
                if (a.endMessageIndex !== undefined && this.connectionArrows[a.endMessageIndex]) endY = this.connectionArrows[a.endMessageIndex].group.y();
                return yPos >= startY && yPos <= endY;
            });
            if (activeAtY.length === 0) return centerX;
            let maxDepth = 0; for (const entry of activeAtY) { if ((entry.def.depth || 0) > maxDepth) maxDepth = entry.def.depth!; }
            const actWidth = 10; const leftEdge = centerX - actWidth / 2; const rightEdge = centerX + actWidth / 2 + (maxDepth * 5);
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
                    const loopW = conn.selfMessageWidth ? Math.min(40, conn.selfMessageWidth / 2) : 30;
                    const adjX = getAdjustedX(nodeId, draggedCenterX, yPos, true);
                    const points = [adjX, 0, adjX + loopW, 0, adjX + loopW, 20, adjX + 7, 20];
                    conn.konvaObj.points(points);
                    if (conn.headObj) this.updateArrowHead(conn.headObj, { x: points[4], y: points[5] }, { x: points[6], y: points[7] });
                    if (conn.labelObj) { const tw = conn.selfMessageWidth ? conn.selfMessageWidth / 2 : 150; conn.labelObj.width(tw); conn.labelObj.offsetX(conn.labelObj.width() / 2); conn.labelObj.position({ x: adjX + loopW / 2, y: -conn.labelObj.height() - 5 }); }
                } else {
                    const originBase = this.map!.nodes[conn.originId]; const originGroup = this.nodeGroups[conn.originId];
                    const targetBase = this.map!.nodes[conn.targetId]; const targetGroup = this.nodeGroups[conn.targetId];
                    const fromExternal = conn.originId === '[' || conn.originId === ']'; const toExternal = conn.targetId === '[' || conn.targetId === ']';
                    let rawOriginX = fromExternal ? (targetGroup?.x() || 100) + (targetBase?.size.width || 0) / 2 - 100 : (originGroup!.x() + originBase!.size.width / 2);
                    let rawTargetX = toExternal ? (originGroup?.x() || 100) + (originBase?.size.width || 0) / 2 + 100 : (targetGroup!.x() + targetBase!.size.width / 2);
                    let originX = fromExternal ? rawOriginX : getAdjustedX(conn.originId, rawTargetX, yPos, false);
                    let targetX = toExternal ? rawTargetX : getAdjustedX(conn.targetId, rawOriginX, yPos, false);
                    if (fromExternal && targetGroup) { const targetCenter = targetGroup.x() + targetBase.size.width / 2; originX = conn.originId === '[' ? targetCenter - 100 : targetCenter + 100; }
                    else if (toExternal && originGroup) { const originCenter = originGroup.x() + originBase.size.width / 2; targetX = conn.targetId === ']' ? originCenter + 100 : originCenter - 100; }
                    conn.konvaObj.points([originX, 0, targetX, 0]);
                    if (conn.headObj) this.updateArrowHead(conn.headObj, { x: originX, y: 0 }, { x: targetX, y: 0 });
                    if (conn.startHeadObj) this.updateArrowHead(conn.startHeadObj, { x: targetX, y: 0 }, { x: originX, y: 0 });
                    if (conn.labelObj) { const midX = (originX + targetX) / 2; const textWidth = Math.max(50, Math.abs(targetX - originX) - 10); conn.labelObj.width(textWidth); conn.labelObj.offsetX(conn.labelObj.width() / 2); conn.labelObj.position({ x: midX, y: -conn.labelObj.height() - 5 }); }
                }
            }
        });

        // Update Groups
        const resizedGroups: LayoutGroup[] = [];
        this.groupVisuals.forEach(visual => {
            const { group, rect, def } = visual;
            if (def.participants && def.participants.indexOf(nodeId) !== -1) {
                const nodes = def.participants.map(pId => ({ group: this.nodeGroups[pId], base: this.map!.nodes[pId] })).filter(n => n.group && n.base);
                if (nodes.length > 0) {
                    let minX = Infinity; let maxX = -Infinity;
                    for (const n of nodes) { const x = n.group.x(); if (x < minX) minX = x; const right = x + n.base.size.width; if (right > maxX) maxX = right; }
                    const newWidth = Math.max(100, (maxX - minX) + 2 * def.pad.x);
                    group.x(minX - def.pad.x);
                    rect.width(newWidth);
                    def.position.x = minX - def.pad.x;
                    def.size.width = newWidth;
                    const children = group.getChildren();
                    for (let i = 0; i < children.length; i++) {
                        const child = children[i];
                        if (child instanceof Konva.Text && child.align() === 'center') child.width(newWidth);
                        else if (child instanceof Konva.Line) { const points = child.points(); points[2] = newWidth; child.points(points); }
                    }
                    resizedGroups.push(def);
                }
            }
        });
        // Cascade resize to parent groups
        for (const g of resizedGroups) this.cascadeGroupResize(g);

        // Update Dividers
        const allNodeGroupsList = Object.values(this.nodeGroups);
        if (allNodeGroupsList.length > 0) {
            let minX = Infinity;
            let maxX = -Infinity;
            allNodeGroupsList.forEach(g => { 
                const nodeBaseId = g.id(); 
                const nodeWidth = this.map!.nodes[nodeBaseId].size.width; 
                const x = g.x();
                if (x < minX) minX = x;
                if (x + nodeWidth > maxX) maxX = x + nodeWidth;
            });
            const divX = Math.max(0, minX - 50);
            const divWidth = (maxX - divX) + 50;

            this.dividerVisuals.forEach(vis => {
                vis.group.x(divX);
                vis.def.position.x = divX;
                vis.def.size.width = divWidth;
                
                const midX = divWidth / 2;
                const textWidth = vis.text.getTextWidth() + 20;
                const gap = textWidth / 2;
                vis.rect.x(midX - textWidth / 2);
                vis.rect.width(textWidth);
                vis.text.width(divWidth); // text stays centered in the full divWidth
                
                const lineY = vis.text.height() / 2;
                vis.doubleLines[0].points([0, lineY - 3, midX - gap, lineY - 3]);
                vis.doubleLines[1].points([midX + gap, lineY - 3, divWidth, lineY - 3]);
                vis.doubleLines[2].points([0, lineY + 3, midX - gap, lineY + 3]);
                vis.doubleLines[3].points([midX + gap, lineY + 3, divWidth, lineY + 3]);
            });
        }

        // Update Notes
        this.noteVisuals.forEach(vis => {
            const targets = vis.def.targets || [];
            if (targets.indexOf(nodeId) !== -1) {
                const nodeBases = targets.map(tId => this.map!.nodes[tId]).filter(n => n);
                const nodeGrps = targets.map(tId => this.nodeGroups[tId]).filter(g => g);
                if (nodeGrps.length > 0) {
                    let minX = Infinity; let maxX = -Infinity;
                    nodeGrps.forEach((g, idx) => { const x = g.x(); const w = nodeBases[idx].size.width; if (x < minX) minX = x; if (x + w > maxX) maxX = x + w; });
                    const centerX = (minX + maxX) / 2;
                    if (vis.def.placement === 'over' || vis.def.placement === 'across') {
                        const noteWidth = Math.max(vis.def.size.width, maxX - minX + 20);
                        vis.group.x(centerX - noteWidth / 2); vis.rect.width(noteWidth); vis.text.width(noteWidth);
                        vis.def.position.x = vis.group.x(); vis.def.size.width = noteWidth;
                    } else if (vis.def.placement === 'left') {
                        vis.group.x(minX - vis.rect.width() - 10);
                        vis.def.position.x = vis.group.x();
                    } else if (vis.def.placement === 'right') {
                        vis.group.x(maxX + 10);
                        vis.def.position.x = vis.group.x();
                    }
                }
            }
        });

        // Only update activations for nodes actually involved in this drag:
        // the dragged node itself, plus any peer nodes it shares connections with.
        // Calling updateAllActivations() here was O(N) over all participants and
        // caused severe per-frame lag. This targeted approach is O(connections).
        const affectedNodeIds = new Set<string>([nodeId]);
        this.connectionArrows.forEach(conn => {
            if (conn.originId === nodeId) affectedNodeIds.add(conn.targetId);
            if (conn.targetId === nodeId) affectedNodeIds.add(conn.originId);
        });
        affectedNodeIds.forEach(id => this.updateActivationsForNode(id));
    }

    private drawGroup(groupDef: LayoutGroup) {
        const isBox = groupDef.keyword === 'box';
        const BORDER_THRESHOLD = 8;

        // Helper: recompute group position/size from pad + current participant bounds
        const recomputeFromPad = () => {
            if (!this.map || !groupDef.participants) return;
            const nodes = groupDef.participants.map(pId => ({ group: this.nodeGroups[pId], base: this.map!.nodes[pId] })).filter(n => n.group && n.base);
            if (nodes.length === 0) return;
            let minX = Infinity; let maxX = -Infinity;
            for (const n of nodes) { const x = n.group.x(); if (x < minX) minX = x; const right = x + n.base.size.width; if (right > maxX) maxX = right; }
            groupDef.position.x = minX - groupDef.pad.x;
            groupDef.size.width = Math.max(100, (maxX - minX) + 2 * groupDef.pad.x);
        };

        const group = new Konva.Group({ x: groupDef.position.x, y: groupDef.position.y, draggable: true, id: groupDef.id });

        // Track drag start to detect border vs content drag
        let dragStartX = 0;
        let dragStartY = 0;
        let dragEdge: { left: boolean; right: boolean; top: boolean; bottom: boolean } | null = null;
        let origPadX = 0;
        let origPadY = 0;
        let origGroupX = 0;
        let origGroupY = 0;
        let origWidth = 0;
        let origHeight = 0;

        group.on('dragstart', (e: any) => {
            const pos = this.stage.getPointerPosition() || { x: 0, y: 0 };
            const groupBox = group.getClientRect();
            dragStartX = pos.x;
            dragStartY = pos.y;
            origPadX = groupDef.pad.x;
            origPadY = groupDef.pad.y;
            origGroupX = group.x();
            origGroupY = group.y();
            origWidth = groupDef.size.width;
            origHeight = groupDef.size.height;

            // Detect which edge(s) the user grabbed
            const relX = pos.x - groupBox.x;
            const relY = pos.y - groupBox.y;
            const nearLeft = relX < BORDER_THRESHOLD;
            const nearRight = relX > groupBox.width - BORDER_THRESHOLD;
            const nearTop = relY < BORDER_THRESHOLD;
            const nearBottom = relY > groupBox.height - BORDER_THRESHOLD;

            if (nearLeft || nearRight || nearTop || nearBottom) {
                dragEdge = { left: nearLeft, right: nearRight, top: nearTop, bottom: nearBottom };
                this.stage.container().style.cursor = 'nwse-resize';
            } else {
                dragEdge = null;
            }
        });

        group.on('dragmove', () => {
            if (!dragEdge) return;
            const pos = this.stage.getPointerPosition() || { x: 0, y: 0 };
            const dx = pos.x - dragStartX;
            const dy = pos.y - dragStartY;

            if (dragEdge.right || dragEdge.left) {
                const delta = dragEdge.right ? dx : -dx;
                groupDef.pad.x = Math.max(0, origPadX + delta);
            }
            if (dragEdge.bottom || dragEdge.top) {
                const delta = dragEdge.bottom ? dy : -dy;
                groupDef.pad.y = Math.max(0, origPadY + delta);
            }

            recomputeFromPad();
            if (isBox) {
                groupDef.size.height = Math.max(50, origHeight + (dragEdge.bottom ? dy : dragEdge.top ? -dy : 0));
            } else {
                groupDef.position.y = origGroupY + (dragEdge.top ? dy : 0);
                groupDef.size.height = Math.max(50, origHeight + (dragEdge.bottom ? dy : dragEdge.top ? -dy : 0));
            }

            // Update Konva visuals
            group.position({ x: groupDef.position.x, y: groupDef.position.y });
            rect.width(groupDef.size.width);
            rect.height(groupDef.size.height);

            // Update children
            const children = group.getChildren();
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                if (child instanceof Konva.Text && child.align() === 'center') child.width(groupDef.size.width);
                else if (child instanceof Konva.Line) { const points = child.points(); points[2] = groupDef.size.width; child.points(points); }
            }

            // Cascade resize to parent groups if this group exceeds them
            this.cascadeGroupResize(groupDef);
        });

        group.on('dragend', (e: any) => {
            dragEdge = null;
            this.stage.container().style.cursor = 'default';
            if (this.onNodeMove) this.onNodeMove(groupDef.id, Math.round(e.target.x()), Math.round(e.target.y()));
        });

        group.on('mouseenter', () => { this.stage.container().style.cursor = 'default'; });
        group.on('mouseleave', () => { this.stage.container().style.cursor = 'default'; dragEdge = null; });
        const rect = new Konva.Rect({ width: groupDef.size.width, height: groupDef.size.height, stroke: groupDef.color || THEME.stroke, strokeWidth: THEME.strokeWidth, fill: groupDef.color ? groupDef.color : (isBox ? THEME.boxFill : undefined), fillOpacity: groupDef.color ? 0.1 : (isBox ? 0.3 : 0) });
        group.add(rect);
        if (!isBox) {
            const keyword = groupDef.keyword === 'group' ? 'alt' : groupDef.keyword;
            const keywordText = new Konva.Text({ text: isRef ? 'ref' : keyword, fontSize: 12, fontStyle: THEME.fontWeightHeader, padding: 5, fill: THEME.text, fontFamily: THEME.fontFamily });
            const keywordRect = new Konva.Rect({ width: keywordText.width(), height: keywordText.height(), fill: THEME.headerFill, stroke: groupDef.color || THEME.stroke, strokeWidth: THEME.strokeWidth });
            group.add(keywordRect); group.add(keywordText);
            if (isRef) { group.add(new Konva.Text({ x: 0, y: groupDef.size.height / 2 - 10, text: groupDef.label || '', fontSize: 12, fontStyle: THEME.fontWeightHeader, width: groupDef.size.width, align: 'center', fill: THEME.text, fontFamily: THEME.fontFamily })); }
            else { group.add(new Konva.Text({ x: keywordRect.width() + 5, y: 5, text: groupDef.label ? `[${groupDef.label}]` : '', fontSize: 12, fontStyle: THEME.fontWeightHeader, fill: groupDef.color || THEME.text, fontFamily: THEME.fontFamily })); }
        } else { group.add(new Konva.Text({ x: 0, y: 5, text: groupDef.label || '', width: groupDef.size.width, align: 'center', fontSize: THEME.fontSize, fontStyle: THEME.fontWeightHeader, fill: THEME.text, fontFamily: THEME.fontFamily })); }
        if (groupDef.dividerYs) {
            groupDef.dividerYs.forEach((dividerY, index) => {
                const relativeY = dividerY - groupDef.position.y;
                const divider = new Konva.Line({ points: [0, relativeY, groupDef.size.width, relativeY], stroke: THEME.stroke, strokeWidth: 1, dash: [5, 5] });
                group.add(divider);
                const nextSection = groupDef.sections[index + 1];
                if (nextSection && nextSection.label) { group.add(new Konva.Text({ x: 5, y: relativeY + 10, text: `[${nextSection.label}]`, fontSize: 11, fontStyle: THEME.fontWeightBody.includes('bold') ? 'italic bold' : 'italic', fill: groupDef.color || THEME.text, fontFamily: THEME.fontFamily })); }
            });
        }
        this.groupVisuals.push({ group, rect, dividers: [], labels: [], def: groupDef }); this.layer.add(group);
    }

    private cascadeGroupResize(changedDef: LayoutGroup) {
        if (!this.map) return;
        // Find all groups that contain this group and expand them if needed
        let current = changedDef;
        let iterations = 0;
        while (iterations < 10) { // Safety limit for deep nesting
            let expanded = false;
            for (const visual of this.groupVisuals) {
                const outer = visual.def;
                if (outer === current) continue;
                // Check if 'current' is inside 'outer'
                const currentRight = current.position.x + current.size.width;
                const currentBottom = current.position.y + current.size.height;
                const outerRight = outer.position.x + outer.size.width;
                const outerBottom = outer.position.y + outer.size.height;
                const isInside = current.position.x >= outer.position.x - 2 &&
                                 currentRight <= outerRight + 2 &&
                                 current.position.y >= outer.position.y - 2 &&
                                 currentBottom <= outerBottom + 2;
                if (!isInside) continue;

                // Expand outer if inner exceeds it
                let needsResize = false;
                if (currentRight > outerRight + 1) { outer.size.width = currentRight - outer.position.x + outer.pad.x; needsResize = true; }
                if (currentBottom > outerBottom + 1) { outer.size.height = currentBottom - outer.position.y + outer.pad.y; needsResize = true; }
                if (current.position.x < outer.position.x + 1) { const diff = outer.position.x - current.position.x; outer.position.x = current.position.x - outer.pad.x; outer.size.width += diff; needsResize = true; }
                if (current.position.y < outer.position.y + 1) { const diff = outer.position.y - current.position.y; outer.position.y = current.position.y - outer.pad.y; outer.size.height += diff; needsResize = true; }

                if (needsResize) {
                    // Update Konva visuals for the outer group
                    visual.group.position({ x: outer.position.x, y: outer.position.y });
                    visual.rect.width(outer.size.width);
                    visual.rect.height(outer.size.height);
                    const children = visual.group.getChildren();
                    for (let i = 0; i < children.length; i++) {
                        const child = children[i];
                        if (child instanceof Konva.Text && child.align() === 'center') child.width(outer.size.width);
                        else if (child instanceof Konva.Line) { const points = child.points(); points[2] = outer.size.width; child.points(points); }
                    }
                    current = outer; // Continue cascading up
                    expanded = true;
                    break;
                }
            }
            if (!expanded) break;
            iterations++;
        }
    }

    private updateAllActivations() { if (!this.map) return; Object.keys(this.activationRects).forEach(nodeId => { this.updateActivationsForNode(nodeId); }); }

    private updateActivationsForNode(nodeId: string) {
        const entries = this.activationRects[nodeId]; const nodeDef = this.map?.nodes[nodeId];
        if (!entries || !nodeDef) return;
        const nodeGroup = this.nodeGroups[nodeId]; const centerX = (nodeGroup ? nodeGroup.x() : nodeDef.position.x) + (nodeDef.size.width / 2);
        entries.forEach((item: any) => {
            const { rect, def, destroyX1, destroyX2 } = item;
            rect.x(centerX - rect.width() / 2 + (def.depth || 0) * 5);
            let startY = def.startPosition.y; let endY = startY + def.size.height;
            if (def.startMessageIndex !== undefined && this.connectionArrows[def.startMessageIndex]) startY = this.connectionArrows[def.startMessageIndex].group.y();
            if (def.endMessageIndex !== undefined && this.connectionArrows[def.endMessageIndex]) endY = this.connectionArrows[def.endMessageIndex].group.y();
            rect.y(startY); rect.height(Math.max(5, endY - startY));
            if (destroyX1 && destroyX2) {
                const size = 20; const x1 = centerX - size / 2; const x2 = centerX + size / 2; const y1 = endY - size / 2; const y2 = endY + size / 2;
                destroyX1.points([x1, y1, x2, y2]); destroyX2.points([x2, y1, x1, y2]);
            }
        });
    }
}
