import Konva from 'konva';
import { LayoutMap, LayoutNode, LayoutConnection, LayoutGroup, LayoutNote, LayoutActivation, DEFAULTS } from "../layout/types";

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

        // Determine participant order by initial X position
        const sortedNodes = Object.values(map.nodes)
            .filter(n => n.type === 'participant' || n.type === 'actor')
            .sort((a, b) => a.position.x - b.position.x);
        this.participantOrder = sortedNodes.map(n => n.id);

        // 1. Draw lifelines and nodes
        Object.values(map.nodes).forEach(node => {
            this.drawLifeline(node);
            this.drawNode(node);
        });

        // 2. Draw Groups (Draw them early so they are in the background)
        map.groups.forEach(group => this.drawGroup(group));

        // 3. Draw Activations
        if (map.activations) {
            map.activations.forEach(act => this.drawActivation(act));
        }

        // 4. Draw Connections (Messages)
        map.connections.forEach(conn => this.drawConnection(conn));

        // 5. Draw Notes
        map.notes.forEach(note => this.drawNote(note));

        this.layer.draw();
    }

    /**
     * Synchronizes visual positions with the map without a full redraw.
     * Useful for cascading updates during drag.
     */
    public syncPositions(map: LayoutMap) {
        this.map = map;
        // Update connections
        map.connections.forEach((conn, index) => {
            const visual = this.connectionArrows[index];
            if (visual && conn.calculatedY !== undefined) {
                visual.group.y(conn.calculatedY);
            }
        });

        // Update nodes (if they changed, e.g. from script edit while dragging)
        Object.values(map.nodes).forEach(node => {
            const group = this.nodeGroups[node.id];
            if (group) {
                group.position(node.position);
                // Also update lifeline X
                const lifeline = this.lifelines[node.id];
                if (lifeline) {
                    const centerX = node.position.x + node.size.width / 2;
                    const points = lifeline.points();
                    points[0] = centerX;
                    points[2] = centerX;
                    lifeline.points(points);
                }
            }
        });

        // Update Activation Heights
        Object.values(this.activationRects).forEach(rectList => {
            rectList.forEach(item => {
                const { rect, def } = item;
                let startY = rect.y();
                let endY = rect.y() + rect.height();

                if (def.startMessageIndex !== undefined) {
                    const startMessage = this.connectionArrows[def.startMessageIndex];
                    if (startMessage) startY = startMessage.group.y();
                }
                if (def.endMessageIndex !== undefined) {
                    const endMessage = this.connectionArrows[def.endMessageIndex];
                    if (endMessage) endY = endMessage.group.y();
                }

                rect.y(startY);
                rect.height(Math.max(5, endY - startY));
            });
        });

        this.layer.batchDraw();
    }

    private drawLifeline(nodeDef: LayoutNode) {
        if (!nodeDef.lifelineX || !nodeDef.lifelineY) return;
        
        // Default lifeline length
        let maxY = 1000;
        
        // If there's a destroy activation, end the lifeline there
        if (this.map?.activations) {
            const destroyAct = this.map.activations.find(act => act.nodeId === nodeDef.id && act.isDestroy);
            if (destroyAct) {
                maxY = destroyAct.startPosition.y + destroyAct.size.height;
            }
        }

        // Lifeline goes from bottom of participant to bottom of viewport or destruction point
        const line = new Konva.Line({
            points: [nodeDef.lifelineX, nodeDef.lifelineY, nodeDef.lifelineX, maxY],
            stroke: '#A80036',
            strokeWidth: 1,
            dash: [5, 5]
        });
        this.lifelines[nodeDef.id] = line;
        this.layer.add(line);
    }

    private drawActivation(act: LayoutActivation) {
        const rect = new Konva.Rect({
            x: act.startPosition.x,
            y: act.startPosition.y,
            width: act.size.width,
            height: act.size.height,
            fill: '#E2E2F0',
            stroke: '#A80036',
            strokeWidth: 1
        });
        if (!this.activationRects[act.nodeId]) {
            this.activationRects[act.nodeId] = [];
        }
        this.activationRects[act.nodeId].push({ rect, def: act });
        this.layer.add(rect);

        if (act.isDestroy) {
            const centerX = act.startPosition.x + act.size.width / 2;
            const endY = act.startPosition.y + act.size.height;
            const size = 20;
            const x1 = centerX - size / 2;
            const x2 = centerX + size / 2;
            const y1 = endY - size / 2;
            const y2 = endY + size / 2;

            const line1 = new Konva.Line({
                points: [x1, y1, x2, y2],
                stroke: '#A80036',
                strokeWidth: 4
            });
            const line2 = new Konva.Line({
                points: [x2, y1, x1, y2],
                stroke: '#A80036',
                strokeWidth: 4
            });
            this.layer.add(line1);
            this.layer.add(line2);
        }
    }

    private drawNode(nodeDef: LayoutNode) {
        const group = new Konva.Group({
            x: nodeDef.position.x,
            y: nodeDef.position.y,
            draggable: true,
            id: nodeDef.id,
            dragBoundFunc: (pos) => {
                const nodeIndex = this.participantOrder.indexOf(nodeDef.id);
                let minX = 10; // Left margin
                let maxX = 5000; // Right margin

                if (nodeIndex > 0) {
                    const prevNodeId = this.participantOrder[nodeIndex - 1];
                    const prevGroup = this.nodeGroups[prevNodeId];
                    if (prevGroup) {
                        minX = prevGroup.x() + this.map!.nodes[prevNodeId].size.width + 10;
                    }
                }
                if (nodeIndex < this.participantOrder.length - 1) {
                    const nextNodeId = this.participantOrder[nodeIndex + 1];
                    const nextGroup = this.nodeGroups[nextNodeId];
                    if (nextGroup) {
                        maxX = nextGroup.x() - nodeDef.size.width - 10;
                    }
                }

                return {
                    x: Math.max(minX, Math.min(maxX, pos.x)),
                    y: nodeDef.position.y
                };
            }
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

        const rect = new Konva.Rect({
            width: nodeDef.size.width,
            height: nodeDef.size.height,
            fill: '#E2E2F0',
            stroke: '#A80036',
            strokeWidth: 1.5,
            cornerRadius: 5,
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
            height: nodeDef.size.height,
            align: 'center',
            verticalAlign: 'middle',
        });

        group.add(rect);
        group.add(text);

        this.nodeGroups[nodeDef.id] = group;
        this.layer.add(group);
    }

    private drawConnection(conn: LayoutConnection) {
        if (!this.map) return;
        const originNode = this.map.nodes[conn.from];
        const targetNode = this.map.nodes[conn.to];
        if (!originNode || !targetNode) return;

        // Sequence messages are usually horizontal between lifelines
        const isSelfMessage = conn.from === conn.to;
        const originX = originNode.position.x + (originNode.size.width / 2);
        const targetX = targetNode.position.x + (targetNode.size.width / 2);
        const yPos = conn.position ? conn.position.y : (conn.calculatedY || 200);

        const isDashed = conn.type.includes('--') || conn.type.includes('..');
        const isOpenArrow = conn.type.includes('>>'); 
        
        const connIndex = this.map.connections.indexOf(conn);
        const connGroup = new Konva.Group({
            x: 0,
            y: yPos,
            draggable: true,
            id: `conn-${conn.from}-${conn.to}-${conn.label || ''}`
        });

        connGroup.dragBoundFunc((pos: {x: number, y: number}): {x: number, y: number} => {
            const absoluteX = connGroup.getAbsolutePosition().x;
            
            // Minimum Y is the bottom of the lowest participant box
            let participantsBottom = DEFAULTS.SEQUENCE_START_Y + DEFAULTS.PARTICIPANT_HEIGHT;
            if (this.map) {
                const bottoms = Object.values(this.map.nodes).map(n => n.position.y + n.size.height);
                if (bottoms.length > 0) {
                    participantsBottom = Math.max(...bottoms);
                }
            }
            
            let minY = participantsBottom + 10;
            let maxY = 5000;

            // Message dragging constraints (keep ordering) using current group positions
            if (connIndex > 0) {
                const prevGroup = this.connectionArrows[connIndex - 1]?.group;
                if (prevGroup) {
                    minY = Math.max(minY, prevGroup.y() + 10);
                    // Extra padding if prev message was a self-message (they take ~20px height)
                    if (this.map!.connections[connIndex - 1].from === this.map!.connections[connIndex - 1].to) {
                        minY += 20;
                    }
                }
            }
            if (connIndex < this.map!.connections.length - 1) {
                const nextGroup = this.connectionArrows[connIndex + 1]?.group;
                if (nextGroup) {
                    maxY = nextGroup.y() - 10;
                }
            }

            return {
                x: absoluteX,
                y: Math.max(minY, Math.min(maxY, pos.y))
            };
        });

        connGroup.on('dragmove', () => {
            this.updateAllActivations();
        });

        connGroup.on('dragend', (e: any) => {
            if (this.onNodeMove) {
                const newY = Math.round(e.target.y());
                this.onNodeMove(connGroup.id(), 0, newY);
            }
        });

        let visualArrow: Konva.Line | Konva.Arrow;

        if (isSelfMessage) {
            visualArrow = new Konva.Arrow({
                // Y coordinates are now relative to the group (yPos)
                points: [originX, 0, originX + 30, 0, originX + 30, 20, originX + 7, 20],
                stroke: '#A80036',
                strokeWidth: 2,
                hitStrokeWidth: 10,
                dash: isDashed ? [10, 5] : undefined,
                pointerLength: 8,
                pointerWidth: 8,
                fill: '#A80036'
            });
        } else {
            const arrowStr = conn.type;
            const isBidirectional = arrowStr.startsWith('<') && (arrowStr.endsWith('>') || arrowStr.endsWith('>>') || arrowStr.endsWith('|>') || arrowStr.endsWith('x'));

            let points = [originX, 0, targetX, 0];

            visualArrow = new Konva.Arrow({
                // Y coordinates are now relative to the group (yPos)
                points: points,
                pointerLength: 10,
                pointerWidth: 10,
                fill: isOpenArrow ? 'white' : '#A80036',
                stroke: '#A80036',
                strokeWidth: 2,
                hitStrokeWidth: 10,
                dash: isDashed ? [10, 5] : undefined,
                pointerAtBeginning: isBidirectional
            });
        }

        connGroup.on('mouseenter', () => { this.stage.container().style.cursor = 'move'; });
        connGroup.on('mouseleave', () => { this.stage.container().style.cursor = 'default'; });

        connGroup.add(visualArrow);

        let labelTextObj: Konva.Text | undefined;
        if (conn.label) {
            const midX = isSelfMessage ? originX + 15 : ((originX + targetX) / 2);
            labelTextObj = new Konva.Text({
                x: midX,
                text: conn.label,
                fontSize: 12,
                fill: '#000',
                fontFamily: 'sans-serif',
                align: 'center',
                width: isSelfMessage ? 150 : Math.max(100, Math.abs(targetX - originX))
            });
            
            // Position above the line
            labelTextObj.y(-labelTextObj.height() - 5);

            // Center the text horizontally relative to its midX
            labelTextObj.offsetX(labelTextObj.width() / 2);
            
            connGroup.add(labelTextObj);
        }

        this.layer.add(connGroup);

        this.connectionArrows.push({
            originId: conn.from,
            targetId: conn.to,
            konvaObj: visualArrow,
            labelObj: labelTextObj,
            group: connGroup
        });
    }

    private updateConnections(nodeId: string) {
        if (!this.map) return;
        const draggedGroup = this.nodeGroups[nodeId];
        const draggedNodeBase = this.map.nodes[nodeId];

        if (!draggedGroup || !draggedNodeBase) return;

        const draggedCenterX = draggedGroup.x() + (draggedNodeBase.size.width / 2);

        // Update lifeline
        const lifeline = this.lifelines[nodeId];
        if (lifeline) {
            const points = lifeline.points();
            points[0] = draggedCenterX;
            points[2] = draggedCenterX;
            lifeline.points(points);
        }

        // Update activations
        this.updateActivationsForNode(nodeId);

        this.connectionArrows.forEach(conn => {
            const isSelfMessage = conn.originId === conn.targetId;
            // Now points use relative Y=0
            if (isSelfMessage && conn.originId === nodeId) {
                conn.konvaObj.points([draggedCenterX, 0, draggedCenterX + 30, 0, draggedCenterX + 30, 20, draggedCenterX + 7, 20]);
                if (conn.labelObj) {
                    conn.labelObj.width(150);
                    conn.labelObj.offsetX(conn.labelObj.width() / 2);
                    conn.labelObj.position({ x: draggedCenterX + 15, y: -conn.labelObj.height() - 5 });
                }
            } else if (conn.originId === nodeId || conn.targetId === nodeId) {
                const originBase = this.map!.nodes[conn.originId];
                const originGroup = this.nodeGroups[conn.originId];
                const targetBase = this.map!.nodes[conn.targetId];
                const targetGroup = this.nodeGroups[conn.targetId];
                
                if (!originGroup || !originBase || !targetGroup || !targetBase) return;
                
                const originX = originGroup.x() + (originBase.size.width / 2);
                const targetX = targetGroup.x() + (targetBase.size.width / 2);
                
                // Redo the arrow direction logic from drawConnection
                const connData = this.map!.connections.find(c => c.from === conn.originId && c.to === conn.targetId && (c.type === (conn.konvaObj as any)._lastArrowStr || true)); // We might need to store arrow type in conn
                // Actually we don't have easy access to the exact connection object without its index, 
                // but connectionArrows order should match map.connections order.
                const connIndex = this.connectionArrows.indexOf(conn);
                const originalConn = this.map!.connections[connIndex];
                const arrowStr = originalConn.type;
                
                let points = [originX, 0, targetX, 0];
                
                conn.konvaObj.points(points);
                
                if (conn.labelObj) {
                    const midX = (originX + targetX) / 2;
                    conn.labelObj.width(Math.max(100, Math.abs(targetX - originX)));
                    conn.labelObj.offsetX(conn.labelObj.width() / 2);
                    conn.labelObj.position({ x: midX, y: -conn.labelObj.height() - 5 });
                }
            }
        });

        // Update Activation Heights
        Object.values(this.activationRects).forEach(rectList => {
            rectList.forEach(item => {
                const { rect, def } = item;
                let startY = rect.y();
                let endY = rect.y() + rect.height();

                if (def.startMessageIndex !== undefined) {
                    const startMessage = this.connectionArrows[def.startMessageIndex];
                    if (startMessage) startY = startMessage.group.y();
                }
                if (def.endMessageIndex !== undefined) {
                    const endMessage = this.connectionArrows[def.endMessageIndex];
                    if (endMessage) endY = endMessage.group.y();
                }

                rect.y(startY);
                rect.height(Math.max(5, endY - startY));
            });
        });
    }

    private drawGroup(groupDef: LayoutGroup) {
        const group = new Konva.Group({
            x: groupDef.position.x,
            y: groupDef.position.y
        });

        const rect = new Konva.Rect({
            width: groupDef.size.width,
            height: groupDef.size.height,
            stroke: groupDef.color || '#A80036',
            strokeWidth: 2,
            dash: [5, 5],
            fill: groupDef.color ? groupDef.color : undefined,
            fillOpacity: groupDef.color ? 0.1 : 0
        });

        const label = new Konva.Text({
            text: `${groupDef.keyword}${groupDef.label ? ` [${groupDef.label}]` : ''}`,
            fontSize: 12,
            fontStyle: 'bold',
            padding: 5,
            fill: groupDef.color || '#A80036'
        });

        group.add(rect);
        group.add(label);

        const dividers: Konva.Line[] = [];
        const labels: Konva.Text[] = [];

        // Draw dividers and section labels
        if (groupDef.dividerYs) {
            groupDef.dividerYs.forEach((dividerY, index) => {
                // dividerY is absolute, needs to be relative to group.y()
                const relativeY = dividerY - groupDef.position.y;
                
                const divider = new Konva.Line({
                    points: [0, relativeY, groupDef.size.width, relativeY],
                    stroke: groupDef.color || '#A80036',
                    strokeWidth: 1,
                    dash: [5, 5]
                });
                group.add(divider);
                dividers.push(divider);

                // Section labels for 'else' / 'also' etc.
                const nextSection = groupDef.sections[index + 1];
                if (nextSection && nextSection.label) {
                    const sectionLabel = new Konva.Text({
                        x: 5,
                        y: relativeY + 5,
                        text: `[${nextSection.label}]`,
                        fontSize: 11,
                        fontStyle: 'italic',
                        fill: groupDef.color || '#A80036'
                    });
                    group.add(sectionLabel);
                    labels.push(sectionLabel);
                }
            });
        }

        this.groupVisuals.push({ group, rect, dividers, labels, def: groupDef });
        this.layer.add(group);
    }

    private drawNote(noteDef: LayoutNote) {
        const group = new Konva.Group({
            x: noteDef.position.x,
            y: noteDef.position.y
        });

        const rect = new Konva.Rect({
            width: noteDef.size.width,
            height: noteDef.size.height,
            fill: '#FBFB77',
            stroke: '#A80036',
            strokeWidth: 1
        });

        const text = new Konva.Text({
            text: noteDef.text,
            width: noteDef.size.width,
            padding: 5,
            fontSize: 12,
            align: 'center'
        });

        group.add(rect);
        group.add(text);

        this.layer.add(group);
    }

    private updateAllActivations() {
        if (!this.map) return;
        Object.keys(this.activationRects).forEach(nodeId => {
            this.updateActivationsForNode(nodeId);
        });
    }

    private updateActivationsForNode(nodeId: string) {
        const entries = this.activationRects[nodeId];
        const nodeDef = this.map?.nodes[nodeId];
        if (!entries || !nodeDef) return;

        const nodeGroup = this.nodeGroups[nodeId];
        const centerX = (nodeGroup ? nodeGroup.x() : nodeDef.position.x) + (nodeDef.size.width / 2);

        entries.forEach(({ rect, def }) => {
            rect.x(centerX - rect.width() / 2);

            let startY = def.startPosition.y;
            let endY = startY + def.size.height;

            if (def.startMessageIndex !== undefined && this.connectionArrows[def.startMessageIndex]) {
                const g = this.connectionArrows[def.startMessageIndex].group;
                startY = g.y(); // Absolute Y
            }
            if (def.endMessageIndex !== undefined && this.connectionArrows[def.endMessageIndex]) {
                const g = this.connectionArrows[def.endMessageIndex].group;
                endY = g.y(); // Absolute Y
            }

            rect.y(startY);
            rect.height(Math.max(5, endY - startY));
        });
    }
}
