import Konva from 'konva';
import { LayoutMap, LayoutNode, LayoutConnection, LayoutGroup, LayoutNote } from "../layout/types";
import { getIntersection, getMemberText, THEME } from "./primitives";

/**
 * Sanitize a logical node ID into a CSS-safe Konva element ID.
 * Characters like `/`, `"`, `'`, `<`, `>`, spaces etc. are special in CSS
 * selectors and will cause Konva's findOne() to behave unexpectedly (and very
 * slowly) when used in an `#id` selector.  Replace them with underscores.
 */
function safeId(id: string): string {
    return id.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export class ClassRenderer {
    protected layer: Konva.Layer;
    protected stage: Konva.Stage;
    protected map: LayoutMap | null = null;
    protected onNodeMove?: (id: string, newX: number, newY: number) => void;
    protected nodeGroups: Record<string, Konva.Group> = {};
    protected groupVisuals: { group: Konva.Group, rect: Konva.Rect, def: LayoutGroup }[] = [];
    protected connectionArrows: { 
        originId: string, 
        targetId: string, 
        konvaObj: Konva.Arrow | Konva.Line, 
        labelObj?: Konva.Text,
        fromLabelObj?: Konva.Text,
        toLabelObj?: Konva.Text
    }[] = [];
    protected nodeRects: Konva.Rect[] = [];  // tracked for shadow toggling during drag

    constructor(stage: Konva.Stage, layer: Konva.Layer) {
        this.stage = stage;
        this.layer = layer;
    }

    public setOnDragEnd(callback: (id: string, newX: number, newY: number) => void) {
        this.onNodeMove = callback;
    }

    public setDragging(isDragging: boolean) {
        for (const rect of this.nodeRects) rect.shadowEnabled(!isDragging);
    }

    public syncPositions(map: LayoutMap) {
        this.map = map;
        // 1. Sync Nodes
        Object.values(map.nodes).forEach(node => {
            const group = this.nodeGroups[safeId(node.id)];
            if (group) {
                group.position(node.position);
                this.updateConnections(node.id);
            }
        });

        // 2. Sync Notes
        map.notes.forEach(noteDef => {
            const noteId = safeId(`note-${noteDef.text.substring(0, 10)}`);
            const group = this.layer.findOne(`#${noteId}`) as Konva.Group;
            if (group) {
                group.position(noteDef.position);
            }
        });

        this.layer.batchDraw();
    }

    public render(map: LayoutMap) {
        this.map = map;

        // Disable auto-draw so that each layer.add() doesn't trigger an
        // intermediate batchDraw/RAF — we do one explicit draw at the end.
        const prevAutoDraw = Konva.autoDrawEnabled;
        Konva.autoDrawEnabled = false;

        try {
            this.layer.destroyChildren();
            this.nodeGroups = {};
            this.groupVisuals = [];
            this.connectionArrows = [];
            this.nodeRects = [];

            // 1. Draw Connections First (So they sit behind nodes)
            map.connections.forEach(conn => this.drawConnection(conn));

            // 2. Draw Nodes (Classes, Interfaces)
            Object.values(map.nodes).forEach(node => this.drawNode(node));

            // 3. Draw Groups
            map.groups.forEach(group => this.drawGroup(group));

            // 4. Draw Notes
            map.notes.forEach(note => this.drawNote(note));
        } finally {
            Konva.autoDrawEnabled = prevAutoDraw;
        }

        this.layer.draw();
    }

    private drawNode(nodeDef: LayoutNode) {
        const group = new Konva.Group({
            x: nodeDef.position.x,
            y: nodeDef.position.y,
            draggable: true,
            id: safeId(nodeDef.id)
        });

        group.on('mouseenter', () => { this.stage.container().style.cursor = 'move'; });
        group.on('mouseleave', () => { this.stage.container().style.cursor = 'default'; });

        group.on('dragstart', () => { this.setDragging(true); });
        group.on('dragend', (e: any) => {
            this.setDragging(false);
            const newX = Math.round(e.target.x());
            const newY = Math.round(e.target.y());
            if (this.onNodeMove) {
                this.onNodeMove(nodeDef.id, newX, newY);
            }
        });

        group.on('dragmove', () => {
            this.updateConnections(nodeDef.id);
        });

        const isClass = nodeDef.type === 'class' || nodeDef.type === 'interface';
        const fill = THEME.nodeFill;
        const stroke = THEME.stroke;

        const rect = new Konva.Rect({
            width: nodeDef.size.width,
            height: nodeDef.size.height,
            fill: fill,
            stroke: stroke,
            strokeWidth: THEME.strokeWidth,
            cornerRadius: THEME.nodeRadius,
            shadowColor: THEME.shadowColor,
            shadowBlur: THEME.shadowBlur,
            shadowOffset: { x: THEME.shadowOffsetX, y: THEME.shadowOffsetY },
            shadowOpacity: THEME.shadowOpacity,
        });
        this.nodeRects.push(rect);

        const text = new Konva.Text({
            text: nodeDef.origName,
            fontSize: THEME.fontSize,
            fontFamily: THEME.fontFamily,
            fill: THEME.text,
            width: nodeDef.size.width,
            height: 30, // Header height
            align: 'center',
            verticalAlign: 'middle',
            fontStyle: 'bold',
        });

        group.add(rect);
        group.add(text);

        // Draw horizontal divider
        const divider = new Konva.Rect({
            x: 0,
            y: 30,
            width: nodeDef.size.width,
            height: 1,
            fill: stroke
        });
        group.add(divider);

        if (nodeDef.type === 'interface') {
            const badge = new Konva.Text({
                text: '<<interface>>',
                fontSize: 10,
                width: nodeDef.size.width,
                align: 'center',
                y: 5
            });
            group.add(badge);
            text.y(12); // Shift title down
        }

        // Draw members
        const allMembers = nodeDef.members || [];
        const fields = allMembers.filter((m: any) => m.isField);
        const methods = allMembers.filter((m: any) => m.isMethod);

        let currentY = 35;
        fields.forEach((member: any) => {
            group.add(this.createMemberLabel(member, currentY, nodeDef.size.width));
            currentY += 20;
        });

        const fieldsSectionHeight = Math.max(20, fields.length * 20);
        const separatorY = 30 + fieldsSectionHeight;

        const sep = new Konva.Line({
            points: [0, separatorY, nodeDef.size.width, separatorY],
            stroke: stroke,
            strokeWidth: 1
        });
        group.add(sep);

        currentY = separatorY + 5;
        methods.forEach((member: any) => {
            group.add(this.createMemberLabel(member, currentY, nodeDef.size.width));
            currentY += 20;
        });

        this.nodeGroups[safeId(nodeDef.id)] = group;
        this.layer.add(group);
    }

    private createMemberLabel(member: any, y: number, width: number): Konva.Text {
        const memberText = getMemberText(member);

        return new Konva.Text({
            text: memberText,
            fontSize: 12,
            x: 5,
            y: y,
            width: width - 10,
            wrap: 'none',
            ellipsis: true,
            fontStyle: member.isAbstract ? 'italic' : 'normal',
            textDecoration: member.isStatic ? 'underline' : '',
            fontFamily: THEME.fontFamily,
            fill: THEME.text,
        });
    }

    private drawConnection(conn: LayoutConnection) {
        if (!this.map) return;
        const originNode = this.map.nodes[conn.from];
        const targetNode = this.map.nodes[conn.to];
        if (!originNode || !targetNode) return;

        const originCenterX = originNode.position.x + (originNode.size.width / 2);
        const originCenterY = originNode.position.y + (originNode.size.height / 2);

        const targetCenterX = targetNode.position.x + (targetNode.size.width / 2);
        const targetCenterY = targetNode.position.y + (targetNode.size.height / 2);

        const originRect = { x: originNode.position.x, y: originNode.position.y, width: originNode.size.width, height: originNode.size.height };
        const targetRect = { x: targetNode.position.x, y: targetNode.position.y, width: targetNode.size.width, height: targetNode.size.height };

        const startPt = getIntersection({ x: targetCenterX, y: targetCenterY }, { x: originCenterX, y: originCenterY }, originRect);
        const endPt = getIntersection({ x: originCenterX, y: originCenterY }, { x: targetCenterX, y: targetCenterY }, targetRect);

        const isDashed = conn.type.includes('..');
        
        let arrowType = 'default';
        if (conn.type.includes('<|') || conn.type.includes('|>')) arrowType = 'extend';
        if (conn.type.includes('*')) arrowType = 'compose';
        if (conn.type.includes('o')) arrowType = 'aggregate';

        // MVP just standard arrow shapes for class diagrams, can be elaborated later
        const arrow = new Konva.Arrow({
            points: [startPt.x, startPt.y, endPt.x, endPt.y],
            pointerLength: arrowType !== 'default' ? 15 : 10,
            pointerWidth: arrowType !== 'default' ? 15 : 10,
            fill: arrowType === 'extend' ? 'white' : (arrowType === 'compose' ? 'black' : (arrowType === 'aggregate' ? 'white' : THEME.arrowFill)),
            stroke: THEME.arrowFill,
            strokeWidth: 2,
            dash: isDashed ? [10, 5] : undefined
        });

        this.layer.add(arrow);

        let labelTextObj: Konva.Text | undefined;
        if (conn.label) {
            const midX = (startPt.x + endPt.x) / 2;
            const midY = (startPt.y + endPt.y) / 2;

            const dx = endPt.x - startPt.x;
            const dy = endPt.y - startPt.y;

            let offsetX = 5;
            let offsetY = -15;

            if (Math.abs(dy) > Math.abs(dx)) {
                // More vertical
                offsetX = 10;
                offsetY = -10;
            }

            labelTextObj = new Konva.Text({
                x: midX + offsetX,
                y: midY + offsetY,
                text: conn.label,
                fontSize: 12,
                fill: THEME.text,
                fontFamily: THEME.fontFamily,
            });
            this.layer.add(labelTextObj);
        }

        // Draw Cardinality
        let fromLabelObj: Konva.Text | undefined;
        if (conn.fromLabel) {
            const cardX = startPt.x + (endPt.x - startPt.x) * 0.1;
            const cardY = startPt.y + (endPt.y - startPt.y) * 0.1;
            
            const dx = endPt.x - startPt.x;
            const dy = endPt.y - startPt.y;
            let offsetX = 5;
            let offsetY = -15;
            if (Math.abs(dy) > Math.abs(dx)) { offsetX = 10; offsetY = -10; }

            fromLabelObj = new Konva.Text({
                x: cardX + offsetX,
                y: cardY + offsetY,
                text: conn.fromLabel,
                fontSize: 10,
                fontStyle: 'italic'
            });
            this.layer.add(fromLabelObj);
        }

        let toLabelObj: Konva.Text | undefined;
        if (conn.toLabel) {
            const cardX = startPt.x + (endPt.x - startPt.x) * 0.9;
            const cardY = startPt.y + (endPt.y - startPt.y) * 0.9;

            const dx = endPt.x - startPt.x;
            const dy = endPt.y - startPt.y;
            let offsetX = 5;
            let offsetY = -15;
            if (Math.abs(dy) > Math.abs(dx)) { offsetX = 10; offsetY = -10; }

            toLabelObj = new Konva.Text({
                x: cardX + offsetX,
                y: cardY + offsetY,
                text: conn.toLabel,
                fontSize: 10,
                fontStyle: 'italic'
            });
            this.layer.add(toLabelObj);
        }

        this.connectionArrows.push({
            originId: conn.from,
            targetId: conn.to,
            konvaObj: arrow,
            labelObj: labelTextObj,
            fromLabelObj,
            toLabelObj
        });
    }

    private updateConnections(nodeId: string) {
        if (!this.map) return;
        const draggedGroup = this.nodeGroups[safeId(nodeId)];
        const draggedNodeBase = this.map.nodes[nodeId];

        if (!draggedGroup || !draggedNodeBase) return;

        this.connectionArrows.forEach(conn => {
            if (conn.originId !== nodeId && conn.targetId !== nodeId) return;

            const originBase = this.map!.nodes[conn.originId];
            const originGroup = this.nodeGroups[safeId(conn.originId)];
            const targetBase = this.map!.nodes[conn.targetId];
            const targetGroup = this.nodeGroups[safeId(conn.targetId)];

            if (!originGroup || !originBase || !targetGroup || !targetBase) return;

            const originCenterX = originGroup.x() + (originBase.size.width / 2);
            const originCenterY = originGroup.y() + (originBase.size.height / 2);
            const targetCenterX = targetGroup.x() + (targetBase.size.width / 2);
            const targetCenterY = targetGroup.y() + (targetBase.size.height / 2);

            const originRect = { x: originGroup.x(), y: originGroup.y(), width: originBase.size.width, height: originBase.size.height };
            const targetRect = { x: targetGroup.x(), y: targetGroup.y(), width: targetBase.size.width, height: targetBase.size.height };

            const startPt = getIntersection({ x: targetCenterX, y: targetCenterY }, { x: originCenterX, y: originCenterY }, originRect);
            const endPt = getIntersection({ x: originCenterX, y: originCenterY }, { x: targetCenterX, y: targetCenterY }, targetRect);

            (conn.konvaObj as Konva.Arrow).points([startPt.x, startPt.y, endPt.x, endPt.y]);

            if (conn.labelObj) {
                const midX = (startPt.x + endPt.x) / 2;
                const midY = (startPt.y + endPt.y) / 2;
                conn.labelObj.position({ x: midX + 5, y: midY - 15 });
            }

            if (conn.fromLabelObj) {
                const cardX = startPt.x + (endPt.x - startPt.x) * 0.1;
                const cardY = startPt.y + (endPt.y - startPt.y) * 0.1;
                const dx = endPt.x - startPt.x;
                const dy = endPt.y - startPt.y;
                let offsetX = 5; let offsetY = -15;
                if (Math.abs(dy) > Math.abs(dx)) { offsetX = 10; offsetY = -10; }
                conn.fromLabelObj.position({ x: cardX + offsetX, y: cardY + offsetY });
            }

            if (conn.toLabelObj) {
                const cardX = startPt.x + (endPt.x - startPt.x) * 0.9;
                const cardY = startPt.y + (endPt.y - startPt.y) * 0.9;
                const dx = endPt.x - startPt.x;
                const dy = endPt.y - startPt.y;
                let offsetX = 5; let offsetY = -15;
                if (Math.abs(dy) > Math.abs(dx)) { offsetX = 10; offsetY = -10; }
                conn.toLabelObj.position({ x: cardX + offsetX, y: cardY + offsetY });
            }
        });

        // Resize groups that contain the dragged node
        this.groupVisuals.forEach(visual => {
            const { group, rect, def } = visual;
            if (!def.participants || def.participants.indexOf(nodeId) === -1) return;
            const nodes = def.participants.map(pId => ({ group: this.nodeGroups[safeId(pId)], base: this.map!.nodes[pId] })).filter(n => n.group && n.base);
            if (nodes.length === 0) return;
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            for (const n of nodes) {
                const x = n.group.x(), y = n.group.y();
                if (x < minX) minX = x; if (x + n.base.size.width > maxX) maxX = x + n.base.size.width;
                if (y < minY) minY = y; if (y + n.base.size.height > maxY) maxY = y + n.base.size.height;
            }
            const newX = minX - def.pad.x;
            const newY = minY - def.pad.y;
            const newW = Math.max(100, (maxX - minX) + 2 * def.pad.x);
            const newH = Math.max(50, (maxY - minY) + 2 * def.pad.y);
            def.position.x = newX; def.position.y = newY;
            def.size.width = newW; def.size.height = newH;
            group.position({ x: newX, y: newY });
            rect.width(newW); rect.height(newH);
            const children = group.getChildren();
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                if (child instanceof Konva.Text && child.align() === 'center') child.width(newW);
            }
        });
        // Cascade resize to parent groups
        for (const v of this.groupVisuals) this.cascadeGroupResize(v.def);
    }

    private drawGroup(groupDef: LayoutGroup) {
        const BORDER_THRESHOLD = 8;
        const group = new Konva.Group({ x: groupDef.position.x, y: groupDef.position.y, draggable: true, id: groupDef.id });
        const rect = new Konva.Rect({
            width: groupDef.size.width, height: groupDef.size.height,
            stroke: THEME.stroke, strokeWidth: THEME.strokeWidth, dash: [5, 5]
        });
        const label = new Konva.Text({
            text: `${groupDef.keyword} [${groupDef.label}]`,
            fontSize: 12, fontStyle: 'bold', padding: 5, fill: THEME.text,
            fontFamily: THEME.fontFamily,
        });
        group.add(rect); group.add(label);

        // Border drag to adjust pad
        let dragStartX = 0, dragStartY = 0;
        let dragEdge: { left: boolean; right: boolean; top: boolean; bottom: boolean } | null = null;
        let origPadX = 0, origPadY = 0, origW = 0, origH = 0, origGX = 0, origGY = 0;

        group.on('dragstart', () => {
            const pos = this.stage.getPointerPosition() || { x: 0, y: 0 };
            const box = group.getClientRect();
            dragStartX = pos.x; dragStartY = pos.y;
            origPadX = groupDef.pad.x; origPadY = groupDef.pad.y;
            origW = groupDef.size.width; origH = groupDef.size.height;
            origGX = group.x(); origGY = group.y();
            const relX = pos.x - box.x, relY = pos.y - box.y;
            const nearLeft = relX < BORDER_THRESHOLD, nearRight = relX > box.width - BORDER_THRESHOLD;
            const nearTop = relY < BORDER_THRESHOLD, nearBottom = relY > box.height - BORDER_THRESHOLD;
            if (nearLeft || nearRight || nearTop || nearBottom) {
                dragEdge = { left: nearLeft, right: nearRight, top: nearTop, bottom: nearBottom };
                this.stage.container().style.cursor = 'nwse-resize';
            } else { dragEdge = null; }
        });

        group.on('dragmove', () => {
            if (!dragEdge) return;
            const pos = this.stage.getPointerPosition() || { x: 0, y: 0 };
            const dx = pos.x - dragStartX, dy = pos.y - dragStartY;
            if (dragEdge.right || dragEdge.left) groupDef.pad.x = Math.max(0, origPadX + (dragEdge.right ? dx : -dx));
            if (dragEdge.bottom || dragEdge.top) groupDef.pad.y = Math.max(0, origPadY + (dragEdge.bottom ? dy : -dy));
            // Recompute size from pad
            groupDef.size.width = Math.max(100, origW + (dragEdge.right ? dx : dragEdge.left ? -dx : 0));
            groupDef.size.height = Math.max(50, origH + (dragEdge.bottom ? dy : dragEdge.top ? -dy : 0));
            groupDef.position.x = origGX + (dragEdge.left ? dx : 0);
            groupDef.position.y = origGY + (dragEdge.top ? dy : 0);
            group.position({ x: groupDef.position.x, y: groupDef.position.y });
            rect.width(groupDef.size.width); rect.height(groupDef.size.height);
            const children = group.getChildren();
            for (let i = 0; i < children.length; i++) {
                const child = children[i];
                if (child instanceof Konva.Text && child.align() === 'center') child.width(groupDef.size.width);
            }
            this.cascadeGroupResize(groupDef);
        });

        group.on('dragend', (e: any) => {
            dragEdge = null;
            this.stage.container().style.cursor = 'default';
        });
        group.on('mouseenter', () => { this.stage.container().style.cursor = 'default'; });
        group.on('mouseleave', () => { this.stage.container().style.cursor = 'default'; dragEdge = null; });

        this.groupVisuals.push({ group, rect, def: groupDef });
        this.layer.add(group);
    }

    private cascadeGroupResize(changedDef: LayoutGroup) {
        if (!this.map) return;
        let current = changedDef;
        let iterations = 0;
        while (iterations < 10) {
            let expanded = false;
            for (const visual of this.groupVisuals) {
                const outer = visual.def;
                if (outer === current) continue;
                const cR = current.position.x + current.size.width;
                const cB = current.position.y + current.size.height;
                const oR = outer.position.x + outer.size.width;
                const oB = outer.position.y + outer.size.height;
                if (current.position.x < outer.position.x - 2 || cR > oR + 2 || current.position.y < outer.position.y - 2 || cB > oB + 2) continue;
                let needsResize = false;
                if (cR > oR + 1) { outer.size.width = cR - outer.position.x + outer.pad.x; needsResize = true; }
                if (cB > oB + 1) { outer.size.height = cB - outer.position.y + outer.pad.y; needsResize = true; }
                if (needsResize) {
                    visual.group.position({ x: outer.position.x, y: outer.position.y });
                    visual.rect.width(outer.size.width); visual.rect.height(outer.size.height);
                    const children = visual.group.getChildren();
                    for (let i = 0; i < children.length; i++) {
                        const child = children[i];
                        if (child instanceof Konva.Text && child.align() === 'center') child.width(outer.size.width);
                    }
                    current = outer; expanded = true; break;
                }
            }
            if (!expanded) break;
            iterations++;
        }
    }

    private drawNote(noteDef: LayoutNote) {
        const group = new Konva.Group({ 
            x: noteDef.position.x, 
            y: noteDef.position.y,
            draggable: true,
            id: safeId(`note-${noteDef.text.substring(0, 10)}`)
        });
        group.on('mouseenter', () => { this.stage.container().style.cursor = 'move'; });
        group.on('mouseleave', () => { this.stage.container().style.cursor = 'default'; });
        group.on('dragend', (e: any) => {
            if (this.onNodeMove) this.onNodeMove(group.id(), Math.round(e.target.x()), Math.round(e.target.y()));
        });
        const rect = new Konva.Rect({ width: noteDef.size.width, height: noteDef.size.height, fill: THEME.noteFill, stroke: THEME.stroke, strokeWidth: THEME.strokeWidth, cornerRadius: THEME.noteRadius });
        const text = new Konva.Text({ text: noteDef.text, width: noteDef.size.width, padding: 5, fontSize: 12, align: 'center', fontFamily: THEME.fontFamily, fill: THEME.text });
        group.add(rect); group.add(text); this.layer.add(group);
    }
}
