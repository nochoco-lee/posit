import { LayoutMap, LayoutNode, LayoutConnection, LayoutGroup, LayoutNote, LayoutActivation } from "../layout/types";

export class LayoutPumlSvgRenderer {
    private width: number = 2000;
    private height: number = 2000;

    constructor() {}

    public render(map: LayoutMap): string {
        // Calculate bounds
        let minX = 0, minY = 0, maxX = 800, maxY = 600;
        
        const updateBounds = (x: number, y: number, w: number, h: number) => {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + w);
            maxY = Math.max(maxY, y + h);
        };

        Object.values(map.nodes).forEach(n => updateBounds(n.position.x, n.position.y, n.size.width, n.size.height));
        map.notes.forEach(n => updateBounds(n.position.x, n.position.y, n.size.width, n.size.height));
        map.groups.forEach(g => updateBounds(g.position.x, g.position.y, g.size.width, g.size.height));
        map.connections.forEach(c => {
            if (c.position) updateBounds(c.position.x, c.position.y, 0, 0);
        });

        // Add padding
        minX -= 20; minY -= 20; maxX += 20; maxY += 20;
        this.width = maxX - minX;
        this.height = maxY - minY;

        let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${this.width}" height="${this.height}" viewBox="${minX} ${minY} ${this.width} ${this.height}">\n`;
        svg += `<rect x="${minX}" y="${minY}" width="${this.width}" height="${this.height}" fill="white" />\n`;

        // 1. Groups (background)
        map.groups.forEach(g => {
            svg += `<rect x="${g.position.x}" y="${g.position.y}" width="${g.size.width}" height="${g.size.height}" fill="${g.color || 'none'}" fill-opacity="0.1" stroke="${g.color || '#A80036'}" stroke-width="2" stroke-dasharray="5,5" />\n`;
            svg += `<text x="${g.position.x + 5}" y="${g.position.y + 15}" font-family="sans-serif" font-size="12" font-weight="bold" fill="${g.color || '#A80036'}">${g.keyword}${g.label ? ` [${g.label}]` : ''}</text>\n`;
            g.dividerYs?.forEach(dy => {
                svg += `<line x1="${g.position.x}" y1="${dy}" x2="${g.position.x + g.size.width}" y2="${dy}" stroke="${g.color || '#A80036'}" stroke-width="1" stroke-dasharray="5,5" />\n`;
            });
        });

        // 2. Lifelines (for sequence)
        if (map.diagramType === 'sequence' || map.diagramType === 'unknown') {
            Object.values(map.nodes).forEach(n => {
                if (n.lifelineX && n.lifelineY) {
                    let endY = maxY - 20;
                    if (map.activations) {
                        const destroyAct = map.activations.find(act => act.nodeId === n.id && act.isDestroy);
                        if (destroyAct) endY = destroyAct.startPosition.y + destroyAct.size.height;
                    }
                    svg += `<line x1="${n.lifelineX}" y1="${n.lifelineY}" x2="${n.lifelineX}" y2="${endY}" stroke="#A80036" stroke-width="1" stroke-dasharray="5,5" />\n`;
                }
            });
        }

        // 3. Activations
        map.activations?.forEach(act => {
            svg += `<rect x="${act.startPosition.x}" y="${act.startPosition.y}" width="${act.size.width}" height="${act.size.height}" fill="#E2E2F0" stroke="#A80036" stroke-width="1" />\n`;
            if (act.isDestroy) {
                const cx = act.startPosition.x + act.size.width / 2;
                const ey = act.startPosition.y + act.size.height;
                svg += `<line x1="${cx - 10}" y1="${ey - 10}" x2="${cx + 10}" y2="${ey + 10}" stroke="#A80036" stroke-width="4" />\n`;
                svg += `<line x1="${cx + 10}" y1="${ey - 10}" x2="${cx - 10}" y2="${ey + 10}" stroke="#A80036" stroke-width="4" />\n`;
            }
        });

        // 4. Nodes
        Object.values(map.nodes).forEach(n => {
            svg += `<rect x="${n.position.x}" y="${n.position.y}" width="${n.size.width}" height="${n.size.height}" fill="#E2E2F0" stroke="#A80036" stroke-width="1.5" rx="5" />\n`;
            svg += `<text x="${n.position.x + n.size.width/2}" y="${n.position.y + n.size.height/2 + 5}" font-family="sans-serif" font-size="14" text-anchor="middle" fill="black">${n.origName}</text>\n`;
        });

        // 5. Connections
        map.connections.forEach(c => {
            const origin = map.nodes[c.from];
            const target = map.nodes[c.to];
            if (!origin || !target) return;

            const ox = origin.position.x + origin.size.width / 2;
            const tx = target.position.x + target.size.width / 2;
            const y = c.calculatedY || (c.position ? c.position.y : 200);

            const isDashed = c.type.includes('--') || c.type.includes('..');
            
            if (c.from === c.to) {
                // Self message
                const path = `M ${ox} ${y} L ${ox + 30} ${y} L ${ox + 30} ${y + 20} L ${ox + 7} ${y + 20}`;
                svg += `<path d="${path}" fill="none" stroke="#A80036" stroke-width="2" ${isDashed ? 'stroke-dasharray="10,5"' : ''} />\n`;
                // Arrow head
                svg += `<path d="M ${ox + 12} ${y + 16} L ${ox + 5} ${y + 20} L ${ox + 12} ${y + 24} Z" fill="#A80036" />\n`;
                if (c.label) {
                    svg += `<text x="${ox + 15}" y="${y - 5}" font-family="sans-serif" font-size="12" text-anchor="middle" fill="black">${c.label}</text>\n`;
                }
            } else {
                svg += `<line x1="${ox}" y1="${y}" x2="${tx}" y2="${y}" stroke="#A80036" stroke-width="2" ${isDashed ? 'stroke-dasharray="10,5"' : ''} />\n`;
                // Simple arrow head
                const dir = tx > ox ? 1 : -1;
                const headPath = `M ${tx - 10 * dir} ${y - 5} L ${tx} ${y} L ${tx - 10 * dir} ${y + 5} Z`;
                svg += `<path d="${headPath}" fill="#A80036" />\n`;
                if (c.label) {
                    svg += `<text x="${(ox + tx) / 2}" y="${y - 5}" font-family="sans-serif" font-size="12" text-anchor="middle" fill="black">${c.label}</text>\n`;
                }
            }
        });

        // 6. Notes
        map.notes.forEach(n => {
            svg += `<rect x="${n.position.x}" y="${n.position.y}" width="${n.size.width}" height="${n.size.height}" fill="#FBFB77" stroke="#A80036" stroke-width="1" />\n`;
            svg += `<text x="${n.position.x + 5}" y="${n.position.y + 15}" font-family="sans-serif" font-size="12" fill="black">${n.text}</text>\n`;
        });

        svg += '</svg>';
        return svg;
    }
}
