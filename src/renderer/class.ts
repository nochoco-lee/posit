import Konva from 'konva';
import { LayoutMap, LayoutNode, LayoutConnection, LayoutGroup, LayoutNote } from "../layout/types";

export class ClassRenderer {
    protected layer: Konva.Layer;
    protected stage: Konva.Stage;
    protected map: LayoutMap | null = null;
    protected onNodeMove?: (id: string, newX: number, newY: number) => void;
    protected nodeGroups: Record<string, Konva.Group> = {};
    protected connectionArrows: { originId: string, targetId: string, konvaObj: Konva.Arrow | Konva.Line, labelObj?: Konva.Text }[] = [];

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
        if (nodeDef.members) {
            nodeDef.members.forEach((member: any, index: number) => {
                let memberText = "";
                if (member.visibility) memberText += member.visibility + " ";
                if (member.isStatic) memberText += "{static} ";
                if (member.isAbstract) memberText += "{abstract} ";
                memberText += member.name;
                if (member.parameters) memberText += "(" + member.parameters.join(", ") + ")";
                if (member.type) memberText += " : " + member.type;

                const memberLabel = new Konva.Text({
                    text: memberText,
                    fontSize: 12,
                    x: 5,
                    y: 35 + (index * 20),
                    width: nodeDef.size.width - 10,
                    wrap: 'none',
                    ellipsis: true,
                    fontStyle: member.isAbstract ? 'italic' : 'normal',
                    textDecoration: member.isStatic ? 'underline' : ''
                });
                group.add(memberLabel);
            });
        }

        this.nodeGroups[nodeDef.id] = group;
        this.layer.add(group);
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

        const isDashed = conn.type.includes('..');
        
        let arrowType = 'default';
        if (conn.type.includes('<|') || conn.type.includes('|>')) arrowType = 'extend';
        if (conn.type.includes('*')) arrowType = 'compose';
        if (conn.type.includes('o')) arrowType = 'aggregate';

        // MVP just standard arrow shapes for class diagrams, can be elaborated later
        const arrow = new Konva.Arrow({
            points: [originCenterX, originCenterY, targetCenterX, targetCenterY],
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
            const midX = (originCenterX + targetCenterX) / 2;
            const midY = (originCenterY + targetCenterY) / 2;

            labelTextObj = new Konva.Text({
                x: midX + 5,
                y: midY - 15,
                text: conn.label,
                fontSize: 12,
                fill: '#000',
            });
            this.layer.add(labelTextObj);
        }

        // Draw Cardinality
        if (conn.fromLabel) {
            const cardX = originCenterX + (targetCenterX - originCenterX) * 0.1;
            const cardY = originCenterY + (targetCenterY - originCenterY) * 0.1;
            const fromCard = new Konva.Text({
                x: cardX + 5,
                y: cardY - 15,
                text: conn.fromLabel,
                fontSize: 10,
                fontStyle: 'italic'
            });
            this.layer.add(fromCard);
        }

        if (conn.toLabel) {
            const cardX = originCenterX + (targetCenterX - originCenterX) * 0.9;
            const cardY = originCenterY + (targetCenterY - originCenterY) * 0.9;
            const toCard = new Konva.Text({
                x: cardX + 5,
                y: cardY - 15,
                text: conn.toLabel,
                fontSize: 10,
                fontStyle: 'italic'
            });
            this.layer.add(toCard);
        }

        this.connectionArrows.push({
            originId: conn.from,
            targetId: conn.to,
            konvaObj: arrow,
            labelObj: labelTextObj
        });
    }

    private updateConnections(nodeId: string) {
        if (!this.map) return;
        const draggedGroup = this.nodeGroups[nodeId];
        const draggedNodeBase = this.map.nodes[nodeId];

        if (!draggedGroup || !draggedNodeBase) return;

        const draggedCenterX = draggedGroup.x() + (draggedNodeBase.size.width / 2);
        const draggedCenterY = draggedGroup.y() + (draggedNodeBase.size.height / 2);

        this.connectionArrows.forEach(conn => {
            if (conn.originId === nodeId) {
                const targetBase = this.map!.nodes[conn.targetId];
                const targetGroup = this.nodeGroups[conn.targetId];
                if (!targetGroup || !targetBase) return;
                const targetCenterX = targetGroup.x() + (targetBase.size.width / 2);
                const targetCenterY = targetGroup.y() + (targetBase.size.height / 2);

                (conn.konvaObj as Konva.Arrow).points([draggedCenterX, draggedCenterY, targetCenterX, targetCenterY]);

                if (conn.labelObj) {
                    const midX = (draggedCenterX + targetCenterX) / 2;
                    const midY = (draggedCenterY + targetCenterY) / 2;
                    conn.labelObj.position({ x: midX + 5, y: midY - 15 });
                }
            } else if (conn.targetId === nodeId) {
                const originBase = this.map!.nodes[conn.originId];
                const originGroup = this.nodeGroups[conn.originId];

                if (!originGroup || !originBase) return;
                const originCenterX = originGroup.x() + (originBase.size.width / 2);
                const originCenterY = originGroup.y() + (originBase.size.height / 2);

                (conn.konvaObj as Konva.Arrow).points([originCenterX, originCenterY, draggedCenterX, draggedCenterY]);

                if (conn.labelObj) {
                    const midX = (originCenterX + draggedCenterX) / 2;
                    const midY = (originCenterY + draggedCenterY) / 2;
                    conn.labelObj.position({ x: midX + 5, y: midY - 15 });
                }
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
