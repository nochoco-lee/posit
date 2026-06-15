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

        this.layoutStatements(ir.statements, map, 50, 50);

        return map;
    }

    private getNodeSize(type: string): { width: number, height: number } {
        switch (type) {
            case 'usecase':
                return { width: 140, height: 70 };
            case 'person':
                return { width: 60, height: 90 };
            case 'database':
            case 'storage':
                return { width: 100, height: 80 };
            case 'folder':
                return { width: 120, height: 90 };
            case 'card':
                return { width: 120, height: 70 };
            case 'cloud':
                return { width: 150, height: 80 };
            case 'hexagon':
                return { width: 120, height: 80 };
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

                map.nodes[id] = {
                    id,
                    type: node.shape,
                    origName: node.origName || node.name,
                    stereotype: node.stereotype,
                    color: node.color,
                    position: { x, y },
                    size
                };

                maxWidth = Math.max(maxWidth, size.width);
                y += size.height + this.padding;
                totalHeight += size.height + this.padding;

            } else if (s.type === 'edge') {
                const edge = s as IREdge;
                map.connections.push({
                    from: edge.from,
                    to: edge.to,
                    type: edge.arrow,
                    label: edge.label,
                    position: null
                });
            } else if (s.type === 'container') {
                const container = s as IRContainer;
                const groupY = y;
                
                // Recursively layout children
                const contentSize = this.layoutStatements(
                    container.statements, 
                    map, 
                    x + this.padding, 
                    y + this.padding + 20 // Space for label
                );

                const groupWidth = Math.max(this.minNodeWidth + 20, contentSize.width + 2 * this.padding);
                const groupHeight = Math.max(this.minNodeHeight + 20, contentSize.height + 2 * this.padding + 20);

                const group: LayoutGroup = {
                    type: 'group',
                    id: container.name || `group-${Math.random()}`,
                    keyword: container.keyword,
                    label: container.name || '',
                    stereotype: container.stereotype,
                    color: container.color,
                    position: { x, y: groupY },
                    size: { width: groupWidth, height: groupHeight },
                    sections: [{ statements: container.statements }],
                    dividerYs: []
                };
                map.groups.push(group);

                maxWidth = Math.max(maxWidth, groupWidth);
                y += groupHeight + this.padding;
                totalHeight += groupHeight + this.padding;
            }
        }

        return { width: maxWidth, height: totalHeight };
    }
}

