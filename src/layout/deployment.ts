import { IRDiagram, IRNode, IREdge, IRContainer, IRStatement } from "../ir/types";
import { LayoutMap, LayoutNode, LayoutConnection, LayoutGroup, LayoutNote, DEFAULTS } from "./types";

export class DeploymentLayoutManager {
    private currentX = 50;
    private currentY = 50;
    private padding = 20;
    private minNodeWidth = 120;
    private minNodeHeight = 60;

    public process(ir: IRDiagram): LayoutMap {
        const map: LayoutMap = {
            diagramType: 'deployment',
            nodes: {},
            connections: [],
            groups: [],
            notes: []
        };

        const collectImplicitNodes = (statements: IRStatement[]) => {
            statements.forEach(s => {
                if (!s) return;
                if (s.type === 'edge') {
                    const edge = s as IREdge;
                    if (!map.nodes[edge.from] && edge.from !== '[' && edge.from !== ']') {
                        this.addNode(edge.from, 'box', map);
                    }
                    if (!map.nodes[edge.to] && edge.to !== '[' && edge.to !== ']') {
                        this.addNode(edge.to, 'box', map);
                    }
                } else if (s.type === 'group') {
                    collectImplicitNodes((s as IRGroup).sections[0].statements);
                }
            });
        };

        collectImplicitNodes(ir.statements);
        this.layoutStatements(ir.statements, map, 50, 50);

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

    private layoutStatements(statements: IRStatement[], map: LayoutMap, startX: number, startY: number): { width: number, height: number } {
        let x = startX;
        let y = startY;
        let maxWidth = 0;
        let totalHeight = 0;

        for (const s of statements) {
            if (!s) continue;

            if (s.type === 'node') {
                const node = s as IRNode;
                const id = node.name;
                const size = this.getNodeSize(node.shape);
                let position = { x, y };
                if (node.layout) {
                    position = { x: node.layout.x, y: node.layout.y };
                }

                map.nodes[id] = {
                    id,
                    type: node.shape,
                    origName: node.origName || node.name,
                    stereotype: node.stereotype,
                    color: node.color,
                    position,
                    size
                };

                if (!node.layout) {
                    maxWidth = Math.max(maxWidth, size.width);
                    y += size.height + this.padding;
                    totalHeight += size.height + this.padding;
                }

            } else if (s.type === 'edge') {
                const edge = s as IREdge;
                map.connections.push({
                    from: edge.from,
                    to: edge.to,
                    type: edge.arrow,
                    label: edge.label,
                    position: edge.layout ? { x: edge.layout.x, y: edge.layout.y } : null
                });
            } else if (s.type === 'container' || s.type === 'group') {
                const container = s as any;
                const groupY = y;
                
                const statements = s.type === 'container' ? container.statements : container.sections[0].statements;
                const contentSize = this.layoutStatements(
                    statements, 
                    map, 
                    x + this.padding, 
                    y + this.padding + 20 
                );

                const groupWidth = Math.max(this.minNodeWidth + 20, contentSize.width + 2 * this.padding);
                const groupHeight = Math.max(this.minNodeHeight + 20, contentSize.height + 2 * this.padding + 20);

                let position = { x, y: groupY };
                if (container.layout) {
                    position = { x: container.layout.x, y: container.layout.y };
                }

                const group: LayoutGroup = {
                    type: 'group',
                    id: container.name || container.label || `group-${Math.random()}`,
                    keyword: container.keyword || 'subgraph',
                    label: container.name || container.label || '',
                    stereotype: container.stereotype,
                    color: container.color,
                    position,
                    size: { width: groupWidth, height: groupHeight },
                    sections: s.type === 'container' ? [{ statements }] : container.sections,
                    dividerYs: []
                };
                map.groups.push(group);

                if (!container.layout) {
                    maxWidth = Math.max(maxWidth, groupWidth);
                    y += groupHeight + this.padding;
                    totalHeight += groupHeight + this.padding;
                }
            }
        }

        return { width: maxWidth, height: totalHeight };
    }
}

