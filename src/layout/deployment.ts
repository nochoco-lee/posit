import { IRDiagram, IRNode, IREdge, IRContainer, IRStatement, IRGroup } from "../ir/types";
import { LayoutMap, LayoutNode, LayoutConnection, LayoutGroup, LayoutNote, DEFAULTS } from "./types";
import { measureText } from "../utils/text";

export class DeploymentLayoutManager {
    private padding = 20;
    private minNodeWidth = 120;
    private minNodeHeight = 60;

    private edges: IREdge[] = [];
    private nodeRanks = new Map<string, number>();
    private rowOccupancy = new Map<number, number>();
    private nodesByRow = new Map<number, string[]>();
    private rowInfo = new Map<number, { startX: number, baseY: number }>();
    private groupNames: Set<string> = new Set();

    public process(ir: IRDiagram): LayoutMap {
        const map: LayoutMap = {
            diagramType: 'deployment',
            nodes: {},
            connections: [],
            groups: [],
            notes: []
        };

        this.edges = [];
        this.nodeRanks.clear();
        this.rowOccupancy.clear();
        this.nodesByRow.clear();
        this.rowInfo.clear();
        this.groupNames.clear();

        // Collect all group names first (including container aliases like A, B)
        const collectGroupNames = (statements: IRStatement[]) => {
            statements.forEach(s => {
                if (!s) return;
                if (s.type === 'group') {
                    const g = s as IRGroup;
                    this.groupNames.add(g.label);
                    collectGroupNames(g.sections[0].statements);
                } else if (s.type === 'container') {
                    const c = s as IRContainer;
                    if (c.name) this.groupNames.add(c.name);
                    collectGroupNames(c.statements);
                }
            });
        };
        collectGroupNames(ir.statements);

        const collectImplicitNodes = (statements: IRStatement[]) => {
            statements.forEach(s => {
                if (!s) return;
                if (s.type === 'edge') {
                    const edge = s as IREdge;
                    if (!map.nodes[edge.from] && edge.from !== '[' && edge.from !== ']' && !this.groupNames.has(edge.from)) {
                        this.addNode(edge.from, 'box', map);
                    }
                    if (!map.nodes[edge.to] && edge.to !== '[' && edge.to !== ']' && !this.groupNames.has(edge.to)) {
                        this.addNode(edge.to, 'box', map);
                    }
                } else if (s.type === 'group') {
                    collectImplicitNodes((s as IRGroup).sections[0].statements);
                }
            });
        };

        collectImplicitNodes(ir.statements);

        this.collectEdges(ir.statements);
        this.calculateRanks(ir.statements);

        this.layoutStatementsPass1(ir.statements, map, 50, 50);
        this.expandGroupBounds(ir.statements, map);
        this.applyCentering(map);
        this.layoutStatementsPass2(ir.statements, map);

        return map;
    }

    private addNode(id: string, shape: string, map: LayoutMap) {
        const size = this.getNodeSize(shape);
        map.nodes[id] = {
            id,
            type: shape,
            origName: id,
            position: { x: 0, y: 0 },
            size
        };
    }

    private getNodeSize(type: string): { width: number, height: number } {
        switch (type) {
            case 'usecase':
            case 'round':
            case 'circle':
                return { width: 140, height: 70 };
            case 'person':
                return { width: 60, height: 90 };
            case 'database':
            case 'storage':
            case 'cylinder':
                return { width: 100, height: 80 };
            case 'folder':
                return { width: 120, height: 90 };
            case 'card':
                return { width: 120, height: 70 };
            case 'cloud':
                return { width: 150, height: 80 };
            case 'hexagon':
                return { width: 120, height: 80 };
            case 'diamond':
            case 'rhombus':
                return { width: 150, height: 100 };
            case 'trapezoid':
            case 'inv_trapezoid':
                return { width: 140, height: 70 };
            case 'parallelogram':
            case 'inv_parallelogram':
                return { width: 140, height: 70 };
            case 'subroutine':
                return { width: 140, height: 70 };
            case 'stadium':
                return { width: 140, height: 70 };
            case 'asymmetric':
                return { width: 140, height: 70 };
            case 'boundary':
            case 'control':
            case 'entity':
                return { width: 80, height: 80 };
            default:
                return { width: this.minNodeWidth, height: this.minNodeHeight };
        }
    }

    private collectEdges(statements: IRStatement[]) {
        statements.forEach((s: any) => {
            if (!s) return;
            if (s.type === 'edge') {
                this.edges.push(s as IREdge);
            } else if (s.type === 'container') {
                this.collectEdges((s as IRContainer).statements);
            } else if (s.type === 'group') {
                (s as IRGroup).sections.forEach(sec => this.collectEdges(sec.statements));
            }
        });
    }

    private calculateRanks(statements: IRStatement[]) {
        const allNodes = new Set<string>();
        const collectNodes = (stmts: IRStatement[]) => {
            stmts.forEach((s: any) => {
                if (!s) return;
                if (s.type === 'node') allNodes.add(s.name);
                else if (s.type === 'edge') { allNodes.add(s.from); allNodes.add(s.to); }
                else if (s.type === 'container') collectNodes(s.statements);
                else if (s.type === 'group') s.sections.forEach((sec: any) => collectNodes(sec.statements));
            });
        };
        collectNodes(statements);

        allNodes.forEach(n => this.nodeRanks.set(n, 0));

        const maxIter = Math.max(allNodes.size, 100);
        for (let i = 0; i < maxIter; i++) {
            let changed = false;
            this.edges.forEach(edge => {
                const rFrom = this.nodeRanks.get(edge.from);
                const rTo = this.nodeRanks.get(edge.to);
                if (rFrom === undefined || rTo === undefined) return;

                if (this.isHorizontal(edge.arrow)) {
                    if (rFrom !== rTo) {
                        const m = Math.max(rFrom, rTo);
                        this.nodeRanks.set(edge.from, m);
                        this.nodeRanks.set(edge.to, m);
                        changed = true;
                    }
                } else {
                    let head = edge.from;
                    let tail = edge.to;

                    if (edge.arrow.includes('|>')) {
                        head = edge.to;
                        tail = edge.from;
                    } else if (edge.arrow.startsWith('<|')) {
                        head = edge.from;
                        tail = edge.to;
                    } else if (edge.arrow.endsWith('>') || edge.arrow.endsWith(')')) {
                        head = edge.from;
                        tail = edge.to;
                    } else if (edge.arrow.startsWith('<') || edge.arrow.startsWith('(')) {
                        head = edge.to;
                        tail = edge.from;
                    }

                    const rh = this.nodeRanks.get(head)!;
                    const rt = this.nodeRanks.get(tail)!;
                    if (rt < rh + 1) {
                        this.nodeRanks.set(tail, rh + 1);
                        changed = true;
                    }
                }
            });
            if (!changed) break;
        }
    }

    private isHorizontal(arrow: string): boolean {
        if (arrow.includes('left') || arrow.includes('right') || arrow.includes('horizontal')) return true;
        if (arrow.includes('up') || arrow.includes('down') || arrow.includes('vertical')) return false;

        // After stripping bracket content (e.g. -[bold]-> -> -->), all arrow styles
        // (-, --, .., ==) are horizontal by default in PlantUML deployment diagrams.
        // Direction is only changed by explicit keywords like -down-, -left-, etc.
        return true;
    }

    private layoutStatementsPass1(statements: IRStatement[], map: LayoutMap, startX: number, startY: number): { width: number, height: number } {
        let x = startX;
        let currentY = startY;
        let maxWidth = 0;
        let totalHeight = 0;

        for (const s of statements) {
            if (!s) continue;

            if (s.type === 'node') {
                const node = s as IRNode;
                const id = node.name;
                const size = this.getNodeSize(node.shape);

                if (node.layout) {
                    const position = { x: node.layout.x, y: node.layout.y };
                    map.nodes[id] = {
                        ...map.nodes[id],
                        id,
                        type: node.shape,
                        origName: node.origName || node.name,
                        stereotype: node.stereotype,
                        color: node.color,
                        position,
                        size,
                        icon: node.icon,
                        iconCode: node.iconCode,
                        prefix: node.prefix
                    };
                } else if (!map.nodes[id] || (map.nodes[id].position.x === 0 && map.nodes[id].position.y === 0)) {
                    const rank = this.nodeRanks.get(id) || 0;
                    const baseY = startY;
                    const targetY = baseY + (rank * 200);

                    const currentX = this.rowOccupancy.get(targetY) || startX;
                    const position = { x: currentX, y: targetY };
                    this.rowOccupancy.set(targetY, currentX + size.width + 100);

                    if (!this.nodesByRow.has(targetY)) {
                        this.nodesByRow.set(targetY, []);
                        this.rowInfo.set(targetY, { startX, baseY });
                    }
                    this.nodesByRow.get(targetY)!.push(id);

                    map.nodes[id] = {
                        ...map.nodes[id],
                        id,
                        type: node.shape,
                        origName: node.origName || node.name,
                        stereotype: node.stereotype,
                        color: node.color,
                        position,
                        size,
                        icon: node.icon,
                        iconCode: node.iconCode,
                        prefix: node.prefix
                    };
                }

                if (!node.layout) {
                    const rank = this.nodeRanks.get(id) || 0;
                    const targetY = startY + (rank * 200);
                    currentY = Math.max(currentY, targetY + size.height + this.padding);
                    maxWidth = Math.max(maxWidth, size.width);
                    totalHeight = Math.max(totalHeight, currentY - startY);
                }

            } else if (s.type === 'edge') {
                const edge = s as IREdge;
                for (const nodeId of [edge.from, edge.to]) {
                    if (nodeId === '[' || nodeId === ']') continue;
                    const node = map.nodes[nodeId];
                    if (node && node.position.x === 0 && node.position.y === 0) {
                        const rank = this.nodeRanks.get(nodeId) || 0;
                        const targetY = startY + (rank * 200);
                        const currentX = this.rowOccupancy.get(targetY) || startX;
                        node.position = { x: currentX, y: targetY };
                        this.rowOccupancy.set(targetY, currentX + node.size.width + 100);
                        if (!this.nodesByRow.has(targetY)) {
                            this.nodesByRow.set(targetY, []);
                            this.rowInfo.set(targetY, { startX, baseY: startY });
                        }
                        this.nodesByRow.get(targetY)!.push(nodeId);
                        currentY = Math.max(currentY, targetY + node.size.height + this.padding);
                    }
                }
            } else if (s.type === 'container' || s.type === 'group') {
                const container = s as any;
                const groupY = currentY;

                // Save rowOccupancy so container contents get their own local layout
                const savedRowOccupancy = new Map(this.rowOccupancy);
                const savedNodesByRow = new Map(this.nodesByRow);
                const savedRowInfo = new Map(this.rowInfo);
                this.rowOccupancy.clear();
                this.nodesByRow.clear();
                this.rowInfo.clear();

                const stmts = s.type === 'container' ? container.statements : container.sections[0].statements;
                const contentSize = this.layoutStatementsPass1(
                    stmts,
                    map,
                    x + this.padding,
                    currentY + this.padding + 20
                );

                // Compute actual content width from local rowOccupancy before restoring
                let maxRowWidth = 0;
                this.rowOccupancy.forEach((endX, _targetY) => {
                    const rowWidth = endX - (x + this.padding);
                    if (rowWidth > maxRowWidth) maxRowWidth = rowWidth;
                });

                // Restore outer scope tracking
                this.rowOccupancy = savedRowOccupancy;
                this.nodesByRow = savedNodesByRow;
                this.rowInfo = savedRowInfo;

                const labelWidth = measureText(container.origName || container.name || container.label || '', 14, 'sans-serif').width + 40;
                const groupWidth = Math.max(this.minNodeWidth + 20, maxRowWidth + this.padding, labelWidth);
                const groupHeight = Math.max(this.minNodeHeight + 20, contentSize.height + 2 * this.padding + 20);

                // Update parent's rowOccupancy with nested container's extent
                const containerEndX = x + this.padding + groupWidth;
                const containerRowY = groupY;
                const existingEndX = this.rowOccupancy.get(containerRowY) || (x + this.padding);
                if (containerEndX > existingEndX) {
                    this.rowOccupancy.set(containerRowY, containerEndX);
                }

                let position = { x, y: groupY };
                if (container.layout) {
                    position = { x: container.layout.x, y: container.layout.y };
                }

                const group: LayoutGroup = {
                    type: 'group',
                    id: container.name || container.label || `group-${Math.random()}`,
                    keyword: container.keyword || 'subgraph',
                    label: container.origName || container.name || container.label || '',
                    stereotype: container.stereotype,
                    color: container.color,
                    position,
                    size: { width: groupWidth, height: groupHeight },
                    pad: { x: 10, y: 10 },
                    sections: s.type === 'container' ? [{ statements: stmts }] : container.sections,
                    dividerYs: []
                };
                map.groups.push(group);

                if (!container.layout) {
                    maxWidth = Math.max(maxWidth, groupWidth);
                    currentY += groupHeight + this.padding;
                    totalHeight = Math.max(totalHeight, currentY - startY);
                }
            }
        }

        return { width: maxWidth, height: totalHeight };
    }

    private applyCentering(map: LayoutMap) {
        const levels = new Map<string, number[]>();
        this.rowInfo.forEach((info, targetY) => {
            const key = `${info.startX},${info.baseY}`;
            if (!levels.has(key)) levels.set(key, []);
            levels.get(key)!.push(targetY);
        });

        levels.forEach((targetYs, key) => {
            const [startXStr] = key.split(',');
            const startX = parseInt(startXStr);

            let maxWidth = 0;
            const rowWidths = new Map<number, number>();

            targetYs.forEach(targetY => {
                const nodeIds = this.nodesByRow.get(targetY) || [];
                let width = 0;
                nodeIds.forEach((id, index) => {
                    const node = map.nodes[id];
                    if (node) {
                        width += node.size.width;
                        if (index < nodeIds.length - 1) width += 100;
                    }
                });
                rowWidths.set(targetY, width);
                if (width > maxWidth) maxWidth = width;
            });

            targetYs.forEach(targetY => {
                const nodeIds = this.nodesByRow.get(targetY) || [];
                const rowWidth = rowWidths.get(targetY)!;
                const offset = (maxWidth - rowWidth) / 2;

                let currentX = startX + offset;
                nodeIds.forEach(id => {
                    const node = map.nodes[id];
                    if (node) {
                        node.position.x = currentX;
                        currentX += node.size.width + 100;
                    }
                });
            });
        });
    }

    private expandGroupBounds(statements: IRStatement[], map: LayoutMap) {
        const collectNodeIds = (stmts: IRStatement[]): string[] => {
            const ids: string[] = [];
            stmts.forEach(s => {
                if (!s) return;
                if (s.type === 'edge') {
                    ids.push((s as IREdge).from, (s as IREdge).to);
                } else if (s.type === 'container') {
                    ids.push(...collectNodeIds((s as any).statements));
                } else if (s.type === 'group') {
                    (s as IRGroup).sections.forEach(sec => ids.push(...collectNodeIds(sec.statements)));
                }
            });
            return ids;
        };

        map.groups.forEach(g => {
            const stmts = g.sections?.[0]?.statements || [];
            const nodeIds = collectNodeIds(stmts);

            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            let hasNodes = false;
            nodeIds.forEach(id => {
                const node = map.nodes[id];
                if (node) {
                    hasNodes = true;
                    minX = Math.min(minX, node.position.x);
                    minY = Math.min(minY, node.position.y);
                    maxX = Math.max(maxX, node.position.x + node.size.width);
                    maxY = Math.max(maxY, node.position.y + node.size.height);
                }
            });

            if (hasNodes) {
                const pad = this.padding;
                const labelH = 20;
                const contentWidth = maxX - minX + pad;
                const contentHeight = maxY - minY + labelH + pad;
                g.size.width = Math.max(g.size.width, contentWidth);
                g.size.height = Math.max(g.size.height, contentHeight);
                g.position.x = Math.min(g.position.x, minX - pad);
                g.position.y = Math.min(g.position.y, minY - labelH - pad / 2);
            }
        });
    }

    private layoutStatementsPass2(statements: IRStatement[], map: LayoutMap) {
        const resolveGroupId = (id: string): string => {
            if (this.groupNames.has(id)) {
                const group = map.groups.find(g => g.label === id || g.id === id);
                if (group) {
                    const centerId = `__group_center_${id}`;
                    if (!map.nodes[centerId]) {
                        map.nodes[centerId] = {
                            id: centerId,
                            type: 'group_center',
                            origName: id,
                            position: {
                                x: group.position.x + group.size.width / 2,
                                y: group.position.y + group.size.height / 2
                            },
                            size: { width: 0, height: 0 }
                        };
                    }
                    return centerId;
                }
            }
            return id;
        };

        for (const s of statements) {
            if (!s) continue;

            if (s.type === 'edge') {
                const edge = s as IREdge;
                const from = resolveGroupId(edge.from);
                const to = resolveGroupId(edge.to);
                map.connections.push({
                    from,
                    to,
                    type: edge.arrow,
                    label: edge.label,
                    position: edge.layout ? { x: edge.layout.x, y: edge.layout.y } : null
                });
            } else if (s.type === 'container' || s.type === 'group') {
                const container = s as any;
                const stmts = s.type === 'container' ? container.statements : container.sections[0].statements;
                this.layoutStatementsPass2(stmts, map);
            }
        }
    }
}
