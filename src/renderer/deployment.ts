import Konva from 'konva';
import { LayoutMap, LayoutNode, LayoutConnection, LayoutGroup, LayoutNote } from "../layout/types";
import { THEME } from "./primitives";

export class DeploymentRenderer {
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

    public setOnDragEnd(callback: (id: string, newX: number, newY: number) => void) {
        this.onNodeMove = callback;
    }

    public syncPositions(map: LayoutMap) {
        this.map = map;
        // 1. Sync Nodes
        Object.values(map.nodes).forEach(node => {
            const group = this.nodeGroups[node.id];
            if (group) {
                group.position(node.position);
                this.updateConnections(node.id);
            }
        });

        // 2. Sync Notes
        map.notes.forEach(noteDef => {
            const noteId = `note-${noteDef.text.substring(0, 10)}`;
            const group = this.layer.findOne(`#${noteId}`) as Konva.Group;
            if (group) {
                group.position(noteDef.position);
            }
        });

        this.layer.batchDraw();
    }

    public render(map: LayoutMap) {
        this.map = map;
        this.layer.destroyChildren();
        this.nodeGroups = {};
        this.connectionArrows = [];

        // 1. Draw Groups First (Background)
        map.groups.forEach(group => this.drawGroup(group));

        // 2. Draw Connections
        map.connections.forEach(conn => this.drawConnection(conn));

        // 3. Draw Nodes
        Object.values(map.nodes).forEach(node => this.drawNode(node));

        // 4. Draw Notes
        map.notes.forEach(note => this.drawNote(note));

        this.layer.draw();
    }

    private getShapeColors(type: string, customColor?: string) {
        return {
            fill: customColor || THEME.nodeFill,
            stroke: THEME.stroke,
            strokeWidth: 1.5
        };
    }

    private createShape(type: string, width: number, height: number, colors: any): Konva.Group | Konva.Shape {
        const g = new Konva.Group();
        
        switch (type) {
            case 'database':
            case 'storage':
                // Draw a cylinder-like shape
                const topEllipse = new Konva.Ellipse({
                    x: width / 2,
                    y: 10,
                    radiusX: width / 2,
                    radiusY: 10,
                    fill: colors.fill,
                    stroke: colors.stroke,
                    strokeWidth: colors.strokeWidth
                });
                const body = new Konva.Rect({
                    x: 0,
                    y: 10,
                    width: width,
                    height: height - 20,
                    fill: colors.fill,
                    stroke: colors.stroke,
                    strokeWidth: colors.strokeWidth,
                });
                const bottomEllipse = new Konva.Ellipse({
                    x: width / 2,
                    y: height - 10,
                    radiusX: width / 2,
                    radiusY: 10,
                    fill: colors.fill,
                    stroke: colors.stroke,
                    strokeWidth: colors.strokeWidth
                });
                
                g.add(body);
                g.add(topEllipse);
                g.add(bottomEllipse);
                return g;

            case 'cloud':
                // Simple cloud shape
                const cloud = new Konva.Path({
                    data: `M ${width*0.2} ${height*0.8} 
                           A ${width*0.2} ${height*0.2} 0 0 1 ${width*0.1} ${height*0.5}
                           A ${width*0.2} ${height*0.2} 0 0 1 ${width*0.3} ${height*0.2}
                           A ${width*0.3} ${height*0.3} 0 0 1 ${width*0.7} ${height*0.2}
                           A ${width*0.2} ${height*0.2} 0 0 1 ${width*0.9} ${height*0.5}
                           A ${width*0.2} ${height*0.2} 0 0 1 ${width*0.8} ${height*0.8}
                           Z`,
                    fill: colors.fill,
                    stroke: colors.stroke,
                    strokeWidth: colors.strokeWidth
                });
                return cloud;

            case 'node':
                // 3D Box look
                const boxFace = new Konva.Rect({
                    x: 0, y: 10, width: width - 10, height: height - 10,
                    fill: colors.fill, stroke: colors.stroke, strokeWidth: colors.strokeWidth
                });
                const boxTop = new Konva.Line({
                    points: [0, 10, 10, 0, width, 0, width - 10, 10],
                    closed: true, fill: colors.fill, stroke: colors.stroke, strokeWidth: colors.strokeWidth
                });
                const boxSide = new Konva.Line({
                    points: [width - 10, 10, width, 0, width, height - 10, width - 10, height],
                    closed: true, fill: colors.fill, stroke: colors.stroke, strokeWidth: colors.strokeWidth
                });
                g.add(boxFace); g.add(boxTop); g.add(boxSide);
                return g;

            case 'folder':
            case 'package':
            case 'namespace':
                // Folder shape with tab
                const folderBody = new Konva.Rect({
                    x: 0, y: 15, width: width, height: height - 15,
                    fill: colors.fill, stroke: colors.stroke, strokeWidth: colors.strokeWidth
                });
                const folderTab = new Konva.Line({
                    points: [0, 15, 0, 0, width * 0.4, 0, width * 0.5, 15],
                    closed: true, fill: colors.fill, stroke: colors.stroke, strokeWidth: colors.strokeWidth
                });
                g.add(folderBody); g.add(folderTab);
                return g;

            case 'card':
                return new Konva.Rect({
                    width: width,
                    height: height,
                    fill: colors.fill,
                    stroke: colors.stroke,
                    strokeWidth: colors.strokeWidth,
                });

            case 'frame':
                // Frame shape with top-left tab
                const frameBody = new Konva.Rect({
                    width: width, height: height,
                    fill: colors.fill, stroke: colors.stroke, strokeWidth: colors.strokeWidth
                });
                const frameTab = new Konva.Line({
                    points: [0, 20, 40, 20, 50, 0, 0, 0],
                    closed: true, fill: colors.fill, stroke: colors.stroke, strokeWidth: colors.strokeWidth
                });
                g.add(frameBody); g.add(frameTab);
                return g;

            case 'artifact':
                // Artifact shape: rectangle with a small document icon in corner
                const artBody = new Konva.Rect({
                    width: width, height: height,
                    fill: colors.fill, stroke: colors.stroke, strokeWidth: colors.strokeWidth
                });
                const docIcon = new Konva.Path({
                    x: width - 20, y: 5,
                    data: 'M 0 0 L 10 0 L 15 5 L 15 18 L 0 18 Z M 10 0 L 10 5 L 15 5',
                    stroke: colors.stroke, strokeWidth: 1
                });
                g.add(artBody); g.add(docIcon);
                return g;

            case 'component':
                const compRect = new Konva.Rect({
                    width: width, height: height,
                    fill: colors.fill, stroke: colors.stroke, strokeWidth: colors.strokeWidth
                });
                // Small component icon in top right
                const compIconBase = new Konva.Rect({
                    x: width - 22, y: 5, width: 15, height: 12,
                    fill: colors.fill, stroke: colors.stroke, strokeWidth: 1
                });
                const compIconPart1 = new Konva.Rect({
                    x: width - 25, y: 7, width: 6, height: 3,
                    fill: colors.fill, stroke: colors.stroke, strokeWidth: 1
                });
                const compIconPart2 = new Konva.Rect({
                    x: width - 25, y: 12, width: 6, height: 3,
                    fill: colors.fill, stroke: colors.stroke, strokeWidth: 1
                });
                g.add(compRect); g.add(compIconBase); g.add(compIconPart1); g.add(compIconPart2);
                return g;

            case 'usecase':
                return new Konva.Ellipse({
                    x: width / 2, y: height / 2,
                    radiusX: width / 2, radiusY: height / 2,
                    fill: colors.fill, stroke: colors.stroke, strokeWidth: colors.strokeWidth
                });

            case 'boundary':
                const bCircle = new Konva.Circle({ x: 15, y: height / 2, radius: 15, stroke: colors.stroke, strokeWidth: colors.strokeWidth });
                const bLine1 = new Konva.Line({ points: [0, height / 2 - 20, 0, height / 2 + 20], stroke: colors.stroke, strokeWidth: colors.strokeWidth });
                const bLine2 = new Konva.Line({ points: [30, height / 2, width, height / 2], stroke: colors.stroke, strokeWidth: colors.strokeWidth });
                g.add(bCircle); g.add(bLine1); g.add(bLine2);
                return g;

            case 'control':
                const cCircle = new Konva.Circle({ x: width / 2, y: height / 2, radius: 20, stroke: colors.stroke, strokeWidth: colors.strokeWidth });
                const cArrow = new Konva.Arrow({ points: [width / 2, height / 2 - 20, width / 2 + 5, height / 2 - 25], pointerLength: 5, pointerWidth: 5, fill: colors.stroke, stroke: colors.stroke, strokeWidth: colors.strokeWidth });
                g.add(cCircle); g.add(cArrow);
                return g;

            case 'entity':
                const eCircle = new Konva.Circle({ x: width / 2, y: height / 2 - 5, radius: 20, stroke: colors.stroke, strokeWidth: colors.strokeWidth });
                const eLine = new Konva.Line({ points: [width / 2 - 25, height / 2 + 15, width / 2 + 25, height / 2 + 15], stroke: colors.stroke, strokeWidth: colors.strokeWidth });
                g.add(eCircle); g.add(eLine);
                return g;

            case 'person':
                // Stick figure
                const head = new Konva.Circle({
                    x: width / 2, y: 15, radius: 10,
                    fill: colors.fill, stroke: colors.stroke, strokeWidth: colors.strokeWidth
                });
                const bodyLine = new Konva.Line({
                    points: [width / 2, 25, width / 2, 45],
                    stroke: colors.stroke, strokeWidth: colors.strokeWidth
                });
                const arms = new Konva.Line({
                    points: [width / 2 - 15, 30, width / 2 + 15, 30],
                    stroke: colors.stroke, strokeWidth: colors.strokeWidth
                });
                const legs = new Konva.Line({
                    points: [width / 2 - 10, 60, width / 2, 45, width / 2 + 10, 60],
                    stroke: colors.stroke, strokeWidth: colors.strokeWidth
                });
                g.add(head); g.add(bodyLine); g.add(arms); g.add(legs);
                return g;

            case 'round':
                return new Konva.Rect({
                    width, height, cornerRadius: 20,
                    fill: colors.fill, stroke: colors.stroke, strokeWidth: colors.strokeWidth
                });

            case 'stadium':
                return new Konva.Rect({
                    width, height, cornerRadius: height / 2,
                    fill: colors.fill, stroke: colors.stroke, strokeWidth: colors.strokeWidth
                });

            case 'subroutine':
                const subRect = new Konva.Rect({
                    width, height, fill: colors.fill, stroke: colors.stroke, strokeWidth: colors.strokeWidth
                });
                const subLeft = new Konva.Line({ points: [10, 0, 10, height], stroke: colors.stroke, strokeWidth: colors.strokeWidth });
                const subRight = new Konva.Line({ points: [width - 10, 0, width - 10, height], stroke: colors.stroke, strokeWidth: colors.strokeWidth });
                g.add(subRect); g.add(subLeft); g.add(subRight);
                return g;

            case 'cylinder':
                return this.createShape('database', width, height, colors);

            case 'circle':
                return new Konva.Circle({
                    x: width / 2, y: height / 2, radius: Math.min(width, height) / 2,
                    fill: colors.fill, stroke: colors.stroke, strokeWidth: colors.strokeWidth
                });

            case 'asymmetric':
                return new Konva.Path({
                    data: `M 0 0 L ${width-15} 0 L ${width} ${height/2} L ${width-15} ${height} L 0 ${height} Z`,
                    fill: colors.fill, stroke: colors.stroke, strokeWidth: colors.strokeWidth
                });

            case 'diamond':
            case 'rhombus':
                return new Konva.Line({
                    points: [width / 2, 0, width, height / 2, width / 2, height, 0, height / 2],
                    closed: true, fill: colors.fill, stroke: colors.stroke, strokeWidth: colors.strokeWidth
                });

            case 'hexagon':
                const side = width / 4;
                const hex = new Konva.Line({
                    points: [side, 0, width - side, 0, width, height / 2, width - side, height, side, height, 0, height / 2],
                    closed: true, fill: colors.fill, stroke: colors.stroke, strokeWidth: colors.strokeWidth
                });
                return hex;

            case 'collections':
                for (let i = 1; i >= 0; i--) {
                    g.add(new Konva.Rect({
                        x: i * 10, y: -i * 10, width: width - 10, height: height - 10,
                        fill: colors.fill, stroke: colors.stroke, strokeWidth: colors.strokeWidth
                    }));
                }
                return g;

            case 'parallelogram':
                return new Konva.Line({
                    points: [15, 0, width, 0, width-15, height, 0, height],
                    closed: true, fill: colors.fill, stroke: colors.stroke, strokeWidth: colors.strokeWidth
                });

            case 'inv_parallelogram':
                return new Konva.Line({
                    points: [0, 0, width-15, 0, width, height, 15, height],
                    closed: true, fill: colors.fill, stroke: colors.stroke, strokeWidth: colors.strokeWidth
                });

            case 'trapezoid':
                return new Konva.Line({
                    points: [15, 0, width-15, 0, width, height, 0, height],
                    closed: true, fill: colors.fill, stroke: colors.stroke, strokeWidth: colors.strokeWidth
                });

            case 'inv_trapezoid':
                return new Konva.Line({
                    points: [0, 0, width, 0, width-15, height, 15, height],
                    closed: true, fill: colors.fill, stroke: colors.stroke, strokeWidth: colors.strokeWidth
                });

            case 'queue':
                // Rectangle with open ends (drawn as path)
                const queue = new Konva.Path({
                    data: `M 10 0 L ${width} 0 L ${width-10} ${height} L 0 ${height} Z`,
                    fill: colors.fill, stroke: colors.stroke, strokeWidth: colors.strokeWidth
                });
                return queue;

            case 'stack':
                // Three layered rectangles
                for (let i = 2; i >= 0; i--) {
                    g.add(new Konva.Rect({
                        x: i * 5, y: -i * 5, width: width - 10, height: height - 10,
                        fill: colors.fill, stroke: colors.stroke, strokeWidth: colors.strokeWidth
                    }));
                }
                return g;

            case 'file':
                // Rectangle with bent corner
                const file = new Konva.Path({
                    data: `M 0 0 L ${width - 15} 0 L ${width} 15 L ${width} ${height} L 0 ${height} Z M ${width-15} 0 L ${width-15} 15 L ${width} 15`,
                    fill: colors.fill, stroke: colors.stroke, strokeWidth: colors.strokeWidth
                });
                return file;

            default:
                // Default rectangle
                return new Konva.Rect({
                    width: width,
                    height: height,
                    fill: colors.fill,
                    stroke: colors.stroke,
                    strokeWidth: colors.strokeWidth,
                    shadowColor: 'black',
                    shadowBlur: 5,
                    shadowOffset: { x: 2, y: 2 },
                    shadowOpacity: 0.2,
                });
        }
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

        const colors = this.getShapeColors(nodeDef.type, nodeDef.color);
        const shape = this.createShape(nodeDef.type, nodeDef.size.width, nodeDef.size.height, colors);

        let displayText = nodeDef.origName;
        if (nodeDef.stereotype) {
            displayText = `${nodeDef.stereotype}\n${displayText}`;
        }

        const text = new Konva.Text({
            text: displayText,
            fontSize: 14,
            fontFamily: 'sans-serif',
            fill: 'black',
            width: nodeDef.size.width,
            height: nodeDef.size.height,
            align: 'center',
            verticalAlign: 'middle',
            fontStyle: 'bold',
        });

        group.add(shape);
        group.add(text);

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

        const arrow = new Konva.Arrow({
            points: [originCenterX, originCenterY, targetCenterX, targetCenterY],
            pointerLength: 10,
            pointerWidth: 10,
            fill: THEME.stroke,
            stroke: THEME.stroke,
            strokeWidth: 2,
            dash: conn.type.includes('..') ? [10, 5] : undefined
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
        
        const colors = this.getShapeColors(groupDef.keyword, groupDef.color);
        const shape = this.createShape(groupDef.keyword, groupDef.size.width, groupDef.size.height, colors);
        
        // Groups often use dashed lines in PlantUML if they are just generic folders/packages
        if (shape instanceof Konva.Rect && (groupDef.keyword === 'folder' || groupDef.keyword === 'package')) {
             shape.dash([5, 5]);
        }

        group.add(shape);

        let labelText = `${groupDef.keyword} [${groupDef.label}]`;
        if (groupDef.stereotype) {
            labelText = `${groupDef.stereotype}\n${labelText}`;
        }

        const label = new Konva.Text({
            text: labelText,
            fontSize: 12, fontStyle: 'bold', padding: 5, fill: THEME.stroke
        });
        group.add(label);
        this.layer.add(group);
    }

    private drawNote(noteDef: LayoutNote) {
        const group = new Konva.Group({ 
            x: noteDef.position.x, 
            y: noteDef.position.y,
            draggable: true,
            id: `note-${noteDef.text.substring(0, 10)}`
        });
        group.on('mouseenter', () => { this.stage.container().style.cursor = 'move'; });
        group.on('mouseleave', () => { this.stage.container().style.cursor = 'default'; });
        group.on('dragend', (e: any) => {
            if (this.onNodeMove) this.onNodeMove(group.id(), Math.round(e.target.x()), Math.round(e.target.y()));
        });
        const rect = new Konva.Rect({ width: noteDef.size.width, height: noteDef.size.height, fill: THEME.noteFill, stroke: THEME.stroke, strokeWidth: 1 });
        const text = new Konva.Text({ text: noteDef.text, width: noteDef.size.width, padding: 5, fontSize: 12, align: 'center' });
        group.add(rect); group.add(text); this.layer.add(group);
    }
}
