import Konva from 'konva';
import { LayoutMap, LayoutNode, LayoutConnection, LayoutGroup, LayoutNote } from "../layout/types";
import { THEME } from "./primitives";

export class DeploymentRenderer {
    protected layer: Konva.Layer;
    protected stage: Konva.Stage;
    protected map: LayoutMap | null = null;
    protected onNodeMove?: (id: string, newX: number, newY: number) => void;
    protected nodeGroups: Record<string, Konva.Group> = {};
    protected groupVisuals: { group: Konva.Group, shape: Konva.Group | Konva.Shape, def: LayoutGroup }[] = [];
    protected connectionArrows: { originId: string, targetId: string, konvaObj: Konva.Arrow | Konva.Line, labelObj?: Konva.Text }[] = [];
    protected nodeRects: Konva.Shape[] = [];  // tracked for shadow toggling during drag

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

        const prevAutoDraw = Konva.autoDrawEnabled;
        Konva.autoDrawEnabled = false;

        try {
            this.layer.destroyChildren();
            this.nodeGroups = {};
            this.groupVisuals = [];
            this.connectionArrows = [];
            this.nodeRects = [];

            // 1. Draw Groups First (Background)
            map.groups.forEach(group => this.drawGroup(group));

            // 2. Draw Connections
            map.connections.forEach(conn => this.drawConnection(conn));

            // 3. Draw Nodes
            Object.values(map.nodes).forEach(node => this.drawNode(node));

            // 4. Draw Notes
            map.notes.forEach(note => this.drawNote(note));
        } finally {
            Konva.autoDrawEnabled = prevAutoDraw;
        }

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
            case 'box':
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

        const colors = this.getShapeColors(nodeDef.type, nodeDef.color);
        const shape = this.createShape(nodeDef.type, nodeDef.size.width, nodeDef.size.height, colors);
        // Track the primary shape for shadow toggling during drag.
        // For group shapes, the first child that is a Rect/Shape is tracked.
        if (shape instanceof Konva.Shape) {
            this.nodeRects.push(shape);
        } else if (shape instanceof Konva.Group) {
            const first = shape.getChildren().find(c => c instanceof Konva.Shape);
            if (first) this.nodeRects.push(first as Konva.Shape);
        }

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

        // Render Font Awesome icon if present
        if (nodeDef.iconCode) {
            const iconText = new Konva.Text({
                text: nodeDef.iconCode,
                fontSize: 20,
                fontFamily: '"Font Awesome 6 Free"',
                fontWeight: '900',
                fill: 'black',
                x: 5,
                y: 5,
            });
            group.add(iconText);
        }

        this.nodeGroups[nodeDef.id] = group;
        this.layer.add(group);
    }


    private drawConnection(conn: LayoutConnection) {
        if (!this.map) return;
        const originNode = this.map.nodes[conn.from];
        const targetNode = this.map.nodes[conn.to];
        if (!originNode || !targetNode) return;

        // Parse bracket styles from arrow type
        const bracketMatch = conn.type.match(/\[([^\]]+)\]/);
        const bracketStyle = bracketMatch ? bracketMatch[1].toLowerCase() : '';
        if (bracketStyle === 'hidden') return; // Don't draw hidden connections

        const originCenterX = originNode.position.x + (originNode.size.width / 2);
        const originCenterY = originNode.position.y + (originNode.size.height / 2);

        const targetCenterX = targetNode.position.x + (targetNode.size.width / 2);
        const targetCenterY = targetNode.position.y + (targetNode.size.height / 2);

        // Determine visual properties from bracket style
        const isDashed = bracketStyle === 'dashed' || conn.type.includes('..');
        const isDotted = bracketStyle === 'dotted' || conn.type.includes('..');
        const isBold = bracketStyle === 'bold';
        const isPlain = bracketStyle === 'plain';
        const strokeWidth = isBold ? 4 : 2;
        const dashPattern = isDashed ? [10, 5] : isDotted ? [2, 4] : undefined;
        const pointerLength = isPlain ? 0 : 10;
        const pointerWidth = isPlain ? 0 : 10;

        const arrow = new Konva.Arrow({
            points: [originCenterX, originCenterY, targetCenterX, targetCenterY],
            pointerLength,
            pointerWidth,
            fill: THEME.stroke,
            stroke: THEME.stroke,
            strokeWidth,
            dash: dashPattern
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

        // Resize groups that contain the dragged node
        this.groupVisuals.forEach(visual => {
            const { group, shape, def } = visual;
            if (!def.participants || def.participants.indexOf(nodeId) === -1) return;
            const nodes = def.participants.map(pId => ({ group: this.nodeGroups[pId], base: this.map!.nodes[pId] })).filter(n => n.group && n.base);
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
            // Replace the old shape with a new one at the updated size
            const oldShape = shape;
            const colors = this.getShapeColors(def.keyword, def.color);
            const newShape = this.createShape(def.keyword, newW, newH, colors);
            if (newShape instanceof Konva.Rect && (def.keyword === 'folder' || def.keyword === 'package')) newShape.dash([5, 5]);
            group.replaceChildren(newShape, group.getChildren()[1]); // Replace shape, keep label
            visual.shape = newShape;
            // Update label width
            const labelChild = group.getChildren().find(c => c instanceof Konva.Text);
            if (labelChild && labelChild instanceof Konva.Text && labelChild.align() === 'center') labelChild.width(newW);
        });
        // Cascade resize to parent groups
        for (const v of this.groupVisuals) this.cascadeGroupResize(v.def);
    }

    private drawGroup(groupDef: LayoutGroup) {
        const BORDER_THRESHOLD = 8;
        const group = new Konva.Group({ x: groupDef.position.x, y: groupDef.position.y, draggable: true, id: groupDef.id });
        
        const colors = this.getShapeColors(groupDef.keyword, groupDef.color);
        let shape = this.createShape(groupDef.keyword, groupDef.size.width, groupDef.size.height, colors);
        
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
            groupDef.size.width = Math.max(100, origW + (dragEdge.right ? dx : dragEdge.left ? -dx : 0));
            groupDef.size.height = Math.max(50, origH + (dragEdge.bottom ? dy : dragEdge.top ? -dy : 0));
            groupDef.position.x = origGX + (dragEdge.left ? dx : 0);
            groupDef.position.y = origGY + (dragEdge.top ? dy : 0);
            group.position({ x: groupDef.position.x, y: groupDef.position.y });
            // Replace shape with new one at updated size
            const colors = this.getShapeColors(groupDef.keyword, groupDef.color);
            const newShape = this.createShape(groupDef.keyword, groupDef.size.width, groupDef.size.height, colors);
            if (newShape instanceof Konva.Rect && (groupDef.keyword === 'folder' || groupDef.keyword === 'package')) newShape.dash([5, 5]);
            group.replaceChildren(newShape, group.getChildren()[1]);
            const visual = this.groupVisuals.find(v => v.def === groupDef);
            if (visual) visual.shape = newShape;
            this.cascadeGroupResize(groupDef);
        });

        group.on('dragend', () => { dragEdge = null; this.stage.container().style.cursor = 'default'; });
        group.on('mouseenter', () => { this.stage.container().style.cursor = 'default'; });
        group.on('mouseleave', () => { this.stage.container().style.cursor = 'default'; dragEdge = null; });

        this.groupVisuals.push({ group, shape, def: groupDef });
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
                    const colors = this.getShapeColors(outer.keyword, outer.color);
                    const newShape = this.createShape(outer.keyword, outer.size.width, outer.size.height, colors);
                    if (newShape instanceof Konva.Rect && (outer.keyword === 'folder' || outer.keyword === 'package')) newShape.dash([5, 5]);
                    visual.group.replaceChildren(newShape, visual.group.getChildren()[1]);
                    visual.shape = newShape;
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
