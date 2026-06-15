import Konva from 'konva';
import { LayoutMap, LayoutNode, LayoutConnection, LayoutGroup, LayoutNote } from "../layout/types";

export class ClassRenderer {
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
        fromLabelObj?: Konva.Text,
        toLabelObj?: Konva.Text
    }[] = [];

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

        // 1. Draw Connections First (So they sit behind nodes)
        map.connections.forEach(conn => this.drawConnection(conn));

        // 2. Draw Nodes (Classes, Interfaces)
        Object.values(map.nodes).forEach(node => this.drawNode(node));

        // 3. Draw Groups
        map.groups.forEach(group => this.drawGroup(group));

        // 4. Draw Notes
        map.notes.forEach(note => this.drawNote(note));

        this.layer.draw();
    }

    private drawNode(nodeDef: LayoutNode) {
        const group = new Konva.Group({
            x: nodeDef.position.x,
            y: nodeDef.position.y,
            draggable: true,
            id: nodeDef.id
        });

        group.on('mouseenter', () => { this.stage.container().style.cursor = 'move'; });
        group.on('mouseleave', () => { this.stage.container().style.cursor = 'default'; });

        group.on('dragend', (e: any) => {
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
        const fill = '#FEFECE';
        const stroke = '#A80036';

        const rect = new Konva.Rect({
            width: nodeDef.size.width,
            height: nodeDef.size.height,
            fill: fill,
            stroke: stroke,
            strokeWidth: 1.5,
            shadowColor: 'black',
            shadowBlur: 5,
            shadowOffset: { x: 2, y: 2 },
            shadowOpacity: 0.2,
        });

        const text = new Konva.Text({
            text: nodeDef.origName,
            fontSize: 14,
            fontFamily: 'sans-serif',
            fill: 'black',
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

        this.nodeGroups[nodeDef.id] = group;
        this.layer.add(group);
    }

    private createMemberLabel(member: any, y: number, width: number): Konva.Text {
        let memberText = "";
        if (member.visibility === "+" || member.visibility === "-" || member.visibility === "#" || member.visibility === "~") {
            memberText += member.visibility + " ";
        } else if (member.visibility === "public") memberText += "+ ";
        else if (member.visibility === "private") memberText += "- ";
        else if (member.visibility === "protected") memberText += "# ";
        else if (member.visibility === "package") memberText += "~ ";
        else if (member.visibility) memberText += member.visibility + " ";

        if (member.isStatic) memberText += "{static} ";
        if (member.isAbstract) memberText += "{abstract} ";
        memberText += member.name;
        if (member.parameters) memberText += "(" + member.parameters.join(", ") + ")";
        if (member.type) memberText += " : " + member.type;

        return new Konva.Text({
            text: memberText,
            fontSize: 12,
            x: 5,
            y: y,
            width: width - 10,
            wrap: 'none',
            ellipsis: true,
            fontStyle: member.isAbstract ? 'italic' : 'normal',
            textDecoration: member.isStatic ? 'underline' : ''
        });
    }

    private getIntersection(p1: { x: number, y: number }, p2: { x: number, y: number }, rect: { x: number, y: number, width: number, height: number }): { x: number, y: number } {
        const { x, y, width, height } = rect;
        const left = x;
        const right = x + width;
        const top = y;
        const bottom = y + height;

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;

        if (dx === 0 && dy === 0) return p2;

        let tMin = -Infinity;
        let tMax = Infinity;

        if (dx !== 0) {
            const t1 = (left - p1.x) / dx;
            const t2 = (right - p1.x) / dx;
            tMin = Math.max(tMin, Math.min(t1, t2));
            tMax = Math.min(tMax, Math.max(t1, t2));
        } else if (p1.x < left || p1.x > right) return p2;

        if (dy !== 0) {
            const t1 = (top - p1.y) / dy;
            const t2 = (bottom - p1.y) / dy;
            tMin = Math.max(tMin, Math.min(t1, t2));
            tMax = Math.min(tMax, Math.max(t1, t2));
        } else if (p1.y < top || p1.y > bottom) return p2;

        if (tMin <= tMax && tMin >= 0 && tMin <= 1) {
            return { x: p1.x + tMin * dx, y: p1.y + tMin * dy };
        }

        return p2;
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

        const startPt = this.getIntersection({ x: targetCenterX, y: targetCenterY }, { x: originCenterX, y: originCenterY }, originRect);
        const endPt = this.getIntersection({ x: originCenterX, y: originCenterY }, { x: targetCenterX, y: targetCenterY }, targetRect);

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
            fill: arrowType === 'extend' ? 'white' : (arrowType === 'compose' ? 'black' : (arrowType === 'aggregate' ? 'white' : '#A80036')),
            stroke: '#A80036',
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
                fill: '#000',
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
        const draggedGroup = this.nodeGroups[nodeId];
        const draggedNodeBase = this.map.nodes[nodeId];

        if (!draggedGroup || !draggedNodeBase) return;

        this.connectionArrows.forEach(conn => {
            const originBase = this.map!.nodes[conn.originId];
            const originGroup = this.nodeGroups[conn.originId];
            const targetBase = this.map!.nodes[conn.targetId];
            const targetGroup = this.nodeGroups[conn.targetId];

            if (!originGroup || !originBase || !targetGroup || !targetBase) return;

            const originCenterX = originGroup.x() + (originBase.size.width / 2);
            const originCenterY = originGroup.y() + (originBase.size.height / 2);
            const targetCenterX = targetGroup.x() + (targetBase.size.width / 2);
            const targetCenterY = targetGroup.y() + (targetBase.size.height / 2);

            const originRect = { x: originGroup.x(), y: originGroup.y(), width: originBase.size.width, height: originBase.size.height };
            const targetRect = { x: targetGroup.x(), y: targetGroup.y(), width: targetBase.size.width, height: targetBase.size.height };

            const startPt = this.getIntersection({ x: targetCenterX, y: targetCenterY }, { x: originCenterX, y: originCenterY }, originRect);
            const endPt = this.getIntersection({ x: originCenterX, y: originCenterY }, { x: targetCenterX, y: targetCenterY }, targetRect);

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
    }

    private drawGroup(groupDef: LayoutGroup) {
        const group = new Konva.Group({ x: groupDef.position.x, y: groupDef.position.y });
        const rect = new Konva.Rect({
            width: groupDef.size.width, height: groupDef.size.height,
            stroke: '#A80036', strokeWidth: 2, dash: [5, 5]
        });
        const label = new Konva.Text({
            text: `${groupDef.keyword} [${groupDef.label}]`,
            fontSize: 12, fontStyle: 'bold', padding: 5, fill: '#A80036'
        });
        group.add(rect); group.add(label); this.layer.add(group);
    }

    private drawNote(noteDef: LayoutNote) {
        const group = new Konva.Group({ x: noteDef.position.x, y: noteDef.position.y });
        const rect = new Konva.Rect({ width: noteDef.size.width, height: noteDef.size.height, fill: '#FBFB77', stroke: '#A80036', strokeWidth: 1 });
        const text = new Konva.Text({ text: noteDef.text, width: noteDef.size.width, padding: 5, fontSize: 12, align: 'center' });
        group.add(rect); group.add(text); this.layer.add(group);
    }
}
