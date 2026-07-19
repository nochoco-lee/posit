import Konva from 'konva';
import { LayoutMap, LayoutNode, LayoutConnection, LayoutGroup, LayoutNote } from "../layout/types";
import { THEME, getIntersection } from "./primitives";

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
        map.notes.forEach((noteDef, index) => {
            const noteId = `note-${index}`;
            const group = this.layer.findOne(`#${noteId}`) as Konva.Group;
            if (group) {
                group.position(noteDef.position);
            }
        });

        // 3. Sync Groups
        this.syncGroupPositions();

        this.layer.batchDraw();
    }

    public render(map: LayoutMap) {
        this.map = map;
        (window as any).__positMap = map;

        const prevAutoDraw = Konva.autoDrawEnabled;
        Konva.autoDrawEnabled = false;

        try {
            this.layer.destroyChildren();
            this.nodeGroups = {};
            this.groupVisuals = [];
            this.connectionArrows = [];
            this.nodeRects = [];

            // 1. Draw Groups First (Background) — reverse so outer groups render behind inner ones
            [...map.groups].reverse().forEach(group => this.drawGroup(group));

            // 2. Draw Nodes (middle layer)
            Object.values(map.nodes).forEach(node => this.drawNode(node));

            // 3. Draw Connections (top layer, so arrowheads are visible over nodes)
            map.connections.forEach(conn => this.drawConnection(conn));

            // 4. Draw Notes
            map.notes.forEach((note, index) => this.drawNote(note, index));

            // 5. Recalculate group bounds from actual child positions
            for (const group of map.groups) {
                this.recalcGroupBounds(group);
            }
            for (const group of map.groups) {
                this.cascadeGroupResize(group);
            }

            // Update all connection arrows to match final group sizes/bounds
            this.connectionArrows.forEach(c => this.updateSingleConnection(c));
        } finally {
            Konva.autoDrawEnabled = prevAutoDraw;
        }

        this.layer.draw();
    }

    private getShapeColors(type: string, customColor?: string) {
        return {
            fill: customColor || THEME.nodeFill,
            stroke: THEME.stroke,
            strokeWidth: THEME.strokeWidth
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
                    cornerRadius: THEME.nodeRadius,
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
                    cornerRadius: THEME.nodeRadius,
                    fill: colors.fill,
                    stroke: colors.stroke,
                    strokeWidth: colors.strokeWidth,
                    shadowColor: THEME.shadowColor,
                    shadowBlur: THEME.shadowBlur,
                    shadowOffset: { x: THEME.shadowOffsetX, y: THEME.shadowOffsetY },
                    shadowOpacity: THEME.shadowOpacity,
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
            // Sync parent group Konva positions after drag
            this.syncGroupPositions();
        });

        group.on('dragmove', () => {
            this.updateConnections(nodeDef.id);
        });

        const colors = this.getShapeColors(nodeDef.type, nodeDef.color);
        const shape = this.createShape(nodeDef.type, nodeDef.size.width, nodeDef.size.height, colors);

        // Apply theme shadow to the primary shape
        const applyShadow = (s: Konva.Shape) => {
            s.shadowColor(THEME.shadowColor);
            s.shadowBlur(THEME.shadowBlur);
            s.shadowOffset({ x: THEME.shadowOffsetX, y: THEME.shadowOffsetY });
            s.shadowOpacity(THEME.shadowOpacity);
        };
        if (shape instanceof Konva.Shape) {
            this.nodeRects.push(shape);
            applyShadow(shape);
        } else if (shape instanceof Konva.Group) {
            const first = shape.getChildren().find(c => c instanceof Konva.Shape);
            if (first) {
                this.nodeRects.push(first as Konva.Shape);
                applyShadow(first as Konva.Shape);
            }
        }

        let displayText = nodeDef.origName;
        if (nodeDef.stereotype) {
            displayText = `${nodeDef.stereotype}\n${displayText}`;
        }

        const text = new Konva.Text({
            text: displayText,
            fontSize: THEME.fontSize,
            fontFamily: THEME.fontFamily,
            fill: THEME.text,
            width: nodeDef.size.width,
            height: nodeDef.size.height,
            align: 'center',
            verticalAlign: 'middle',
            fontStyle: THEME.fontWeightHeader,
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
                fill: THEME.text,
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

        // Parse bracket styles from arrow type
        const bracketMatch = conn.type.match(/\[([^\]]+)\]/);
        const bracketStyle = bracketMatch ? bracketMatch[1].toLowerCase() : '';
        if (bracketStyle === 'hidden') return; // Don't draw hidden connections

        const origin = this.resolveNodePos(conn.from);
        const target = this.resolveNodePos(conn.to);
        if (!origin || !target) return;

        const originPt = getIntersection({ x: target.cx, y: target.cy }, { x: origin.cx, y: origin.cy }, origin.rect);
        const targetPt = getIntersection({ x: origin.cx, y: origin.cy }, { x: target.cx, y: target.cy }, target.rect);

        // Determine visual properties from bracket style
        const isDashed = bracketStyle === 'dashed' || conn.type.includes('..');
        const isDotted = bracketStyle === 'dotted' || conn.type.includes('..');
        const isBold = bracketStyle === 'bold';
        const isPlain = bracketStyle === 'plain';
        const strokeWidth = isBold ? THEME.connectionStrokeWidth * 2.5 : THEME.connectionStrokeWidth;
        const dashPattern = isDashed ? [10, 5] : isDotted ? [2, 4] : undefined;
        const pointerLength = isPlain ? 0 : 10;
        const pointerWidth = isPlain ? 0 : 10;

        const arrow = new Konva.Arrow({
            points: [originPt.x, originPt.y, targetPt.x, targetPt.y],
            pointerLength,
            pointerWidth,
            fill: THEME.arrowFill,
            stroke: THEME.arrowFill,
            strokeWidth,
            dash: dashPattern
        });

        this.layer.add(arrow);

        let labelTextObj: Konva.Text | undefined;
        if (conn.label) {
            const midX = (originPt.x + targetPt.x) / 2;
            const midY = (originPt.y + targetPt.y) / 2;

            labelTextObj = new Konva.Text({
                x: midX + 5,
                y: midY - 15,
                text: conn.label,
                fontSize: 12,
                fontFamily: THEME.fontFamily,
                fontStyle: THEME.fontWeightBody,
                fill: THEME.text,
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

    private resolveNodePos(id: string): { rect: { x: number; y: number; width: number; height: number }; cx: number; cy: number } | null {
        if (!this.map) return null;
        const kg = this.nodeGroups[id];
        const base = this.map.nodes[id];
        if (kg && base) {
            return { rect: { x: kg.x(), y: kg.y(), width: base.size.width, height: base.size.height }, cx: kg.x() + base.size.width / 2, cy: kg.y() + base.size.height / 2 };
        }
        if (base && base.type === 'group_center') {
            const group = this.map.groups.find(g => g.label === base.origName || g.id === base.origName);
            if (group) {
                const visual = this.groupVisuals.find(v => v.def === group);
                const labelNode = visual ? visual.group.getChildren()[1] : null;
                const labelH = (labelNode && 'height' in labelNode) ? (labelNode as any).height() : 24;
                return { rect: { x: group.position.x, y: group.position.y + labelH, width: group.size.width, height: group.size.height - labelH }, cx: group.position.x + group.size.width / 2, cy: group.position.y + labelH + (group.size.height - labelH) / 2 };
            }
        }
        if (base) {
            return { rect: { x: base.position.x, y: base.position.y, width: base.size.width, height: base.size.height }, cx: base.position.x + base.size.width / 2, cy: base.position.y + base.size.height / 2 };
        }
        return null;
    }

    private updateConnections(nodeId: string) {
        if (!this.map) return;
        const dragged = this.resolveNodePos(nodeId);
        if (!dragged) return;

        this.connectionArrows.forEach(conn => {
            if (conn.originId === nodeId) {
                const target = this.resolveNodePos(conn.targetId);
                if (!target) return;

                const originPt = getIntersection({ x: target.cx, y: target.cy }, { x: dragged.cx, y: dragged.cy }, dragged.rect);
                const targetPt = getIntersection({ x: dragged.cx, y: dragged.cy }, { x: target.cx, y: target.cy }, target.rect);

                (conn.konvaObj as Konva.Arrow).points([originPt.x, originPt.y, targetPt.x, targetPt.y]);

                if (conn.labelObj) {
                    const midX = (originPt.x + targetPt.x) / 2;
                    const midY = (originPt.y + targetPt.y) / 2;
                    conn.labelObj.position({ x: midX + 5, y: midY - 15 });
                }
            } else if (conn.targetId === nodeId) {
                const origin = this.resolveNodePos(conn.originId);
                if (!origin) return;

                const originPt = getIntersection({ x: dragged.cx, y: dragged.cy }, { x: origin.cx, y: origin.cy }, origin.rect);
                const targetPt = getIntersection({ x: origin.cx, y: origin.cy }, { x: dragged.cx, y: dragged.cy }, dragged.rect);

                (conn.konvaObj as Konva.Arrow).points([originPt.x, originPt.y, targetPt.x, targetPt.y]);

                if (conn.labelObj) {
                    const midX = (originPt.x + targetPt.x) / 2;
                    const midY = (originPt.y + targetPt.y) / 2;
                    conn.labelObj.position({ x: midX + 5, y: midY - 15 });
                }
            }
        });

        // Resize groups that contain the dragged node
        for (const visual of this.groupVisuals) {
            const { def } = visual;
            if (!def.participants || def.participants.indexOf(nodeId) === -1) continue;
            this.recalcGroupBounds(def);
        }
        // Cascade resize to parent groups
        for (const v of this.groupVisuals) this.cascadeGroupResize(v.def);
    }

    private updateSingleConnection(conn: { originId: string; targetId: string; konvaObj: any; labelObj?: Konva.Text }) {
        if (!this.map) return;
        const origin = this.resolveNodePos(conn.originId);
        const target = this.resolveNodePos(conn.targetId);
        if (!origin || !target) return;

        const originPt = getIntersection({ x: target.cx, y: target.cy }, { x: origin.cx, y: origin.cy }, origin.rect);
        const targetPt = getIntersection({ x: origin.cx, y: origin.cy }, { x: target.cx, y: target.cy }, target.rect);

        (conn.konvaObj as Konva.Arrow).points([originPt.x, originPt.y, targetPt.x, targetPt.y]);
        if (conn.labelObj) {
            const midX = (originPt.x + targetPt.x) / 2;
            const midY = (originPt.y + targetPt.y) / 2;
            conn.labelObj.position({ x: midX + 5, y: midY - 15 });
        }
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

        let labelText = groupDef.label;
        if (groupDef.stereotype) {
            labelText = `${groupDef.stereotype}\n${labelText}`;
        }
        const label = new Konva.Text({
            text: labelText,
            fontSize: 12, fontStyle: THEME.fontWeightHeader, padding: 8, fill: THEME.text,
            fontFamily: THEME.fontFamily,
        });
        group.add(label);

        // Border drag to adjust pad; content drag to move group + children
        let dragStartX = 0, dragStartY = 0;
        let dragEdge: { left: boolean; right: boolean; top: boolean; bottom: boolean } | null = null;
        let origPadX = 0, origPadY = 0, origW = 0, origH = 0, origGX = 0, origGY = 0;
        let lastGX = 0, lastGY = 0;

        group.on('dragstart', () => {
            const pos = this.stage.getPointerPosition() || { x: 0, y: 0 };
            const box = group.getClientRect();
            dragStartX = pos.x; dragStartY = pos.y;
            origPadX = groupDef.pad.x; origPadY = groupDef.pad.y;
            origW = groupDef.size.width; origH = groupDef.size.height;
            origGX = group.x(); origGY = group.y();
            lastGX = origGX; lastGY = origGY;
            const relX = pos.x - box.x, relY = pos.y - box.y;
            const nearLeft = relX < BORDER_THRESHOLD, nearRight = relX > box.width - BORDER_THRESHOLD;
            const nearTop = relY < BORDER_THRESHOLD, nearBottom = relY > box.height - BORDER_THRESHOLD;
            if (nearLeft || nearRight || nearTop || nearBottom) {
                dragEdge = { left: nearLeft, right: nearRight, top: nearTop, bottom: nearBottom };
                this.stage.container().style.cursor = 'nwse-resize';
            } else {
                dragEdge = null;
                this.stage.container().style.cursor = 'move';
            }
        });

        group.on('dragmove', () => {
            const curGX = group.x();
            const curGY = group.y();
            const deltaX = curGX - lastGX;
            const deltaY = curGY - lastGY;
            lastGX = curGX;
            lastGY = curGY;

            if (dragEdge) {
                // Border drag: resize by changing padding
                const dx = curGX - origGX;
                const dy = curGY - origGY;
                if (dragEdge.left) {
                    groupDef.pad.x = Math.max(0, origPadX - dx);
                    groupDef.size.width = Math.max(100, origW - dx);
                } else if (dragEdge.right) {
                    groupDef.pad.x = Math.max(0, origPadX + dx);
                    groupDef.size.width = Math.max(100, origW + dx);
                }
                if (dragEdge.top) {
                    groupDef.pad.y = Math.max(0, origPadY - dy);
                    groupDef.size.height = Math.max(50, origH - dy);
                } else if (dragEdge.bottom) {
                    groupDef.pad.y = Math.max(0, origPadY + dy);
                    groupDef.size.height = Math.max(50, origH + dy);
                }
                groupDef.position.x = curGX;
                groupDef.position.y = curGY;
                // Replace shape with new one at updated size
                const colors = this.getShapeColors(groupDef.keyword, groupDef.color);
                const newShape = this.createShape(groupDef.keyword, groupDef.size.width, groupDef.size.height, colors);
                if (newShape instanceof Konva.Rect && (groupDef.keyword === 'folder' || groupDef.keyword === 'package')) newShape.dash([5, 5]);
                const label = group.getChildren()[1]; // preserve label
                group.destroyChildren();
                group.add(newShape);
                if (label) group.add(label);
                const visual = this.groupVisuals.find(v => v.def === groupDef);
                if (visual) visual.shape = newShape;
                this.cascadeGroupResize(groupDef);
            } else {
                // Content drag: move all children by delta
                groupDef.position.x = curGX;
                groupDef.position.y = curGY;
                // Move all participant nodes
                if (groupDef.participants) {
                    groupDef.participants.forEach(pId => {
                        const nodeGroup = this.nodeGroups[pId];
                        const nodeDef = this.map?.nodes[pId];
                        if (nodeGroup && nodeDef) {
                            nodeDef.position.x += deltaX;
                            nodeDef.position.y += deltaY;
                            nodeGroup.position(nodeDef.position);
                            this.updateConnections(pId);
                        }
                    });
                }
                // Also move nested group children
                this.groupVisuals.forEach(v => {
                    if (v.def !== groupDef && groupDef.participants?.indexOf(v.def.id) !== -1) {
                        v.def.position.x += deltaX;
                        v.def.position.y += deltaY;
                        v.group.position(v.def.position);
                    }
                });
                // Update __group_center_ node for this group so arrows to/from the group move
                const centerId = `__group_center_${groupDef.id}`;
                const centerNode = this.map?.nodes[centerId];
                if (centerNode) {
                    centerNode.position.x += deltaX;
                    centerNode.position.y += deltaY;
                }
                // Update all connections that reference this group
                this.connectionArrows.forEach(c => {
                    if (c.originId === centerId || c.targetId === centerId) {
                        this.updateSingleConnection(c);
                    }
                });
                // Note: do NOT call cascadeGroupResize here - it modifies group.position()
                // which conflicts with Konva's drag tracking. Defer to dragend.
            }
        });

        group.on('dragend', () => {
            dragEdge = null;
            this.stage.container().style.cursor = 'default';
            // Now safe to recalculate bounds and cascade
            this.recalcGroupBounds(groupDef);
            this.cascadeGroupResize(groupDef);
            // Sync all connections
            if (groupDef.participants) {
                groupDef.participants.forEach(pId => this.updateConnections(pId));
            }
            // Sync connections to/from this group itself
            const centerId = `__group_center_${groupDef.id}`;
            this.connectionArrows.forEach(c => {
                if (c.originId === centerId || c.targetId === centerId) {
                    this.updateSingleConnection(c);
                }
            });
            if (this.onNodeMove) {
                this.onNodeMove(groupDef.id, groupDef.position.x, groupDef.position.y);
            }
        });
        group.on('mouseenter', () => { this.stage.container().style.cursor = 'default'; });
        group.on('mouseleave', () => { this.stage.container().style.cursor = 'default'; dragEdge = null; });

        this.groupVisuals.push({ group, shape, def: groupDef });
        this.layer.add(group);
    }

    private recalcGroupBounds(groupDef: LayoutGroup) {
        if (!this.map || !groupDef.participants || groupDef.participants.length === 0) return;
        // Use actual label height instead of hardcoded constant
        const grpVisual = this.groupVisuals.find(v => v.def === groupDef);
        const labelNode = grpVisual ? grpVisual.group.getChildren()[1] : null;
        const LABEL_AREA_HEIGHT = (labelNode && 'height' in labelNode) ? (labelNode as any).height() : 24;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const pId of groupDef.participants) {
            const ng = this.nodeGroups[pId];
            const nd = this.map.nodes[pId];
            if (!ng || !nd) continue;
            const x = ng.x(), y = ng.y();
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x + nd.size.width > maxX) maxX = x + nd.size.width;
            if (y + nd.size.height > maxY) maxY = y + nd.size.height;
        }
        if (minX === Infinity) return;
        // Check nested groups inside this group
        for (const v of this.groupVisuals) {
            if (v.def === groupDef) continue;
            // Is this group inside groupDef?
            if (v.def.position.x >= groupDef.position.x && v.def.position.y >= groupDef.position.y &&
                v.def.position.x + v.def.size.width <= groupDef.position.x + groupDef.size.width &&
                v.def.position.y + v.def.size.height <= groupDef.position.y + groupDef.size.height) {
                if (v.def.position.x < minX) minX = v.def.position.x;
                if (v.def.position.y < minY) minY = v.def.position.y;
                if (v.def.position.x + v.def.size.width > maxX) maxX = v.def.position.x + v.def.size.width;
                if (v.def.position.y + v.def.size.height > maxY) maxY = v.def.position.y + v.def.size.height;
            }
        }
        groupDef.position.x = minX - groupDef.pad.x;
        groupDef.position.y = minY - groupDef.pad.y - LABEL_AREA_HEIGHT;
        groupDef.size.width = Math.max(100, (maxX - minX) + 2 * groupDef.pad.x);
        groupDef.size.height = Math.max(50, (maxY - minY) + 2 * groupDef.pad.y + LABEL_AREA_HEIGHT);
        // Update visuals
        const visual = this.groupVisuals.find(v => v.def === groupDef);
        if (visual) {
            const colors = this.getShapeColors(groupDef.keyword, groupDef.color);
            const newShape = this.createShape(groupDef.keyword, groupDef.size.width, groupDef.size.height, colors);
            if (newShape instanceof Konva.Rect && (groupDef.keyword === 'folder' || groupDef.keyword === 'package')) newShape.dash([5, 5]);
            const label = visual.group.getChildren()[1]; // preserve label
            visual.group.destroyChildren();
            visual.group.add(newShape);
            if (label) visual.group.add(label);
            visual.shape = newShape;
            visual.group.position(groupDef.position);
        }
    }

    private syncGroupPositions() {
        this.groupVisuals.forEach(v => {
            v.group.position(v.def.position);
        });
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
                // Check if current is inside outer
                if (current.position.x >= outer.position.x - 2 && current.position.y >= outer.position.y - 2 &&
                    current.position.x + current.size.width <= outer.position.x + outer.size.width + 2 &&
                    current.position.y + current.size.height <= outer.position.y + outer.size.height + 2) {
                    // Current is inside outer - resize outer if needed
                    const outerLabelNode = visual.group.getChildren()[1];
                    const outerLabelH = (outerLabelNode && 'height' in outerLabelNode) ? (outerLabelNode as any).height() : 24;
                    let needsResize = false;
                    if (current.position.x < outer.position.x + 1) { outer.position.x = current.position.x - outer.pad.x; outer.size.width += (outer.position.x + outer.size.width - current.position.x); needsResize = true; }
                    if (current.position.y < outer.position.y + outerLabelH + 1) { outer.position.y = current.position.y - outer.pad.y - outerLabelH; outer.size.height += (outer.position.y + outer.size.height - current.position.y); needsResize = true; }
                    const currentRight = current.position.x + current.size.width;
                    const currentBottom = current.position.y + current.size.height;
                    const outerRight = outer.position.x + outer.size.width;
                    const outerBottom = outer.position.y + outer.size.height;
                    if (currentRight > outerRight + 1) { outer.size.width = currentRight - outer.position.x + outer.pad.x; needsResize = true; }
                    if (currentBottom > outerBottom + 1) { outer.size.height = currentBottom - outer.position.y + outer.pad.y; needsResize = true; }
                    if (needsResize) {
                        const colors = this.getShapeColors(outer.keyword, outer.color);
                        const newShape = this.createShape(outer.keyword, outer.size.width, outer.size.height, colors);
                        if (newShape instanceof Konva.Rect && (outer.keyword === 'folder' || outer.keyword === 'package')) newShape.dash([5, 5]);
                        const label = visual.group.getChildren()[1]; // preserve label
                        visual.group.destroyChildren();
                        visual.group.add(newShape);
                        if (label) visual.group.add(label);
                        visual.shape = newShape;
                        visual.group.position(outer.position);
                        current = outer; expanded = true; break;
                    }
                }
            }
            if (!expanded) break;
            iterations++;
        }
    }

    private drawNote(noteDef: LayoutNote, index: number) {
        const group = new Konva.Group({ 
            x: noteDef.position.x, 
            y: noteDef.position.y,
            draggable: true,
            id: `note-${index}`
        });
        group.on('mouseenter', () => { this.stage.container().style.cursor = 'move'; });
        group.on('mouseleave', () => { this.stage.container().style.cursor = 'default'; });
        group.on('dragend', (e: any) => {
            if (this.onNodeMove) this.onNodeMove(group.id(), Math.round(e.target.x()), Math.round(e.target.y()));
        });
        const rect = new Konva.Rect({ width: noteDef.size.width, height: noteDef.size.height, fill: THEME.noteFill, stroke: THEME.stroke, strokeWidth: THEME.strokeWidth, cornerRadius: THEME.noteRadius, dash: THEME.nodeBorderDash });
        const text = new Konva.Text({ text: noteDef.text, width: noteDef.size.width, padding: 5, fontSize: 12, align: 'center', fontFamily: THEME.fontFamily, fill: THEME.text, fontStyle: THEME.fontWeightBody });
        group.add(rect); group.add(text); this.layer.add(group);
    }
}
