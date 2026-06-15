import { LayoutMap, LayoutNode, LayoutConnection, LayoutGroup, LayoutNote, LayoutActivation } from "../layout/types";

export class LayoutPumlSvgRenderer {
    private width: number = 2000;
    private height: number = 2000;

    constructor() {}

    private renderText(x: number, y: number, text: string, fontSize: number, anchor: string = "middle", color: string = "black"): string {
        const lines = text.split('\n');
        if (lines.length === 1) {
            return `<text x="${x}" y="${y}" font-family="sans-serif" font-size="${fontSize}" text-anchor="${anchor}" fill="${color}">${text}</text>\n`;
        }
        // Offset y to roughly center the lines vertically around the original y
        const totalHeight = lines.length * fontSize * 1.2;
        let currentY = y - (totalHeight / 2) + (fontSize);
        let svg = `<text x="${x}" y="${currentY}" font-family="sans-serif" font-size="${fontSize}" text-anchor="${anchor}" fill="${color}">\n`;
        lines.forEach((line, i) => {
            svg += `<tspan x="${x}" dy="${i === 0 ? 0 : fontSize * 1.2}">${line}</tspan>\n`;
        });
        svg += `</text>\n`;
        return svg;
    }

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
        if (map.dividers) map.dividers.forEach(d => updateBounds(d.position.x, d.position.y, d.size.width, d.size.height));

        // Add padding
        minX -= 40; minY -= 40; maxX += 40; maxY += 40;
        this.width = maxX - minX;
        this.height = maxY - minY;

        let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${this.width}" height="${this.height}" viewBox="${minX} ${minY} ${this.width} ${this.height}">\n`;
        svg += `<rect x="${minX}" y="${minY}" width="${this.width}" height="${this.height}" fill="white" />\n`;

        // 1. Groups (background)
        map.groups.forEach(g => {
            svg += `<rect x="${g.position.x}" y="${g.position.y}" width="${g.size.width}" height="${g.size.height}" fill="${g.color || 'none'}" fill-opacity="0.1" stroke="${g.color || '#A80036'}" stroke-width="2" stroke-dasharray="5,5" />\n`;
            svg += `<rect x="${g.position.x}" y="${g.position.y}" width="40" height="15" fill="white" stroke="${g.color || '#A80036'}" stroke-width="1" />\n`;
            svg += `<text x="${g.position.x + 5}" y="${g.position.y + 12}" font-family="sans-serif" font-size="10" font-weight="bold" fill="${g.color || '#A80036'}">${g.keyword}</text>\n`;
            if (g.label) {
                svg += this.renderText(g.position.x + g.size.width/2, g.position.y + 25, g.label, 12, "middle", g.color || "#A80036");
            }
            g.dividerYs?.forEach(dy => {
                svg += `<line x1="${g.position.x}" y1="${dy}" x2="${g.position.x + g.size.width}" y2="${dy}" stroke="${g.color || '#A80036'}" stroke-width="1" stroke-dasharray="5,5" />\n`;
            });
        });

        // 2. Lifelines
        if (map.diagramType === 'sequence' || map.diagramType === 'unknown') {
            Object.values(map.nodes).forEach(n => {
                if (n.lifelineX && n.lifelineY) {
                    let endY = maxY - 40;
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
            if (n.type === 'actor') {
                const centerX = n.position.x + n.size.width / 2;
                const headRadius = 10;
                const headY = n.position.y + headRadius;
                svg += `<circle cx="${centerX}" cy="${headY}" r="${headRadius}" fill="#E2E2F0" stroke="#A80036" stroke-width="2" />\n`;
                svg += `<line x1="${centerX}" y1="${headY + headRadius}" x2="${centerX}" y2="${headY + headRadius + 20}" stroke="#A80036" stroke-width="2" />\n`;
                svg += `<line x1="${centerX - 15}" y1="${headY + headRadius + 5}" x2="${centerX + 15}" y2="${headY + headRadius + 5}" stroke="#A80036" stroke-width="2" />\n`;
                svg += `<line x1="${centerX - 10}" y1="${headY + headRadius + 35}" x2="${centerX}" y2="${headY + headRadius + 20}" stroke="#A80036" stroke-width="2" />\n`;
                svg += `<line x1="${centerX + 10}" y1="${headY + headRadius + 35}" x2="${centerX}" y2="${headY + headRadius + 20}" stroke="#A80036" stroke-width="2" />\n`;
                const text = n.origName + (n.stereotype ? `\n${n.stereotype}` : "");
                svg += this.renderText(centerX, headY + headRadius + 50, text, 14);
            } else {
                const isClass = n.type === 'class' || n.type === 'interface' || n.type === 'enum' || n.type === 'struct';
                const fill = isClass ? '#FEFECE' : '#E2E2F0';
                svg += `<rect x="${n.position.x}" y="${n.position.y}" width="${n.size.width}" height="${n.size.height}" fill="${fill}" stroke="#A80036" stroke-width="1.5" rx="5" />\n`;
                if (isClass) {
                    svg += `<line x1="${n.position.x}" y1="${n.position.y + 30}" x2="${n.position.x + n.size.width}" y2="${n.position.y + 30}" stroke="#A80036" stroke-width="1" />\n`;
                    let title = n.origName;
                    if (n.type === 'interface') title = `<<interface>>\n${title}`;
                    else if (n.stereotype) title = `${n.stereotype}\n${title}`;
                    svg += this.renderText(n.position.x + n.size.width/2, n.position.y + 15, title, 12, "middle", "black");
                    if (n.members) {
                        n.members.forEach((m: any, i: number) => {
                            let mText = `${m.visibility || ''}${m.name}${m.isMethod ? '()' : ''}`;
                            svg += this.renderText(n.position.x + 5, n.position.y + 45 + (i * 18), mText, 10, "start", "black");
                        });
                    }
                } else {
                    const text = n.origName + (n.stereotype ? `\n${n.stereotype}` : "");
                    svg += this.renderText(n.position.x + n.size.width/2, n.position.y + n.size.height/2 + 5, text, 14);
                }
            }
        });

        // 5. Connections
        map.connections.forEach(c => {
            const origin = map.nodes[c.from];
            const target = map.nodes[c.to];
            if (!origin || !target) return;

            const ox = origin.position.x + origin.size.width / 2;
            const tx = target.position.x + target.size.width / 2;
            const y = c.calculatedY || (c.position ? c.position.y : 200);
            
            const isDotted = c.type.includes('..');
            const isDashed = c.type.includes('--');
            const isOpenArrow = c.type.includes('>>') || c.type.includes('\\') || c.type.includes('/');
            const isLostMessage = c.type.includes('x');
            const isBidirectional = c.type.includes('<->') || (c.type.startsWith('<') && c.type.endsWith('>'));
            const isAsync = c.type.includes('\\') || c.type.includes('/');
            
            const strokeDash = isDotted ? 'stroke-dasharray="2,2"' : isDashed ? 'stroke-dasharray="8,4"' : '';
            
            if (c.from === c.to) {
                const path = `M ${ox} ${y} L ${ox + 30} ${y} L ${ox + 30} ${y + 20} L ${ox + 7} ${y + 20}`;
                svg += `<path d="${path}" fill="none" stroke="#A80036" stroke-width="2" ${strokeDash} />\n`;
                svg += `<path d="M ${ox + 12} ${y + 16} L ${ox + 5} ${y + 20} L ${ox + 12} ${y + 24} Z" fill="#A80036" />\n`;
                if (c.label) {
                    svg += this.renderText(ox + 35, y + 10, c.label, 12, "start");
                }
            } else {
                svg += `<line x1="${ox}" y1="${y}" x2="${tx}" y2="${y}" stroke="#A80036" stroke-width="2" ${strokeDash} />\n`;
                
                const drawHead = (x: number, y: number, direction: number) => {
                    if (isLostMessage) {
                        svg += `<line x1="${x - 5}" y1="${y - 5}" x2="${x + 5}" y2="${y + 5}" stroke="#A80036" stroke-width="2" />\n`;
                        svg += `<line x1="${x + 5}" y1="${y - 5}" x2="${x - 5}" y2="${y + 5}" stroke="#A80036" stroke-width="2" />\n`;
                    } else if (isOpenArrow) {
                        if (c.type.includes('\\')) {
                             svg += `<line x1="${x - 10 * direction}" y1="${y - 5}" x2="${x}" y2="${y}" stroke="#A80036" stroke-width="2" />\n`;
                        } else if (c.type.includes('/')) {
                             svg += `<line x1="${x - 10 * direction}" y1="${y + 5}" x2="${x}" y2="${y}" stroke="#A80036" stroke-width="2" />\n`;
                        } else {
                             svg += `<path d="M ${x - 10 * direction} ${y - 5} L ${x} ${y} L ${x - 10 * direction} ${y + 5}" fill="none" stroke="#A80036" stroke-width="2" />\n`;
                        }
                    } else {
                        const headPath = `M ${x - 10 * direction} ${y - 5} L ${x} ${y} L ${x - 10 * direction} ${y + 5} Z`;
                        svg += `<path d="${headPath}" fill="#A80036" />\n`;
                    }
                };

                const dir = tx > ox ? 1 : -1;
                drawHead(tx, y, dir);
                if (isBidirectional) {
                    drawHead(ox, y, -dir);
                }

                if (c.label) {
                    const label = (c.number ? `(${c.number}) ` : "") + c.label;
                    svg += this.renderText((ox + tx) / 2, y - 10, label, 12);
                }
            }
        });

        // 6. Notes
        map.notes.forEach(n => {
            svg += `<rect x="${n.position.x}" y="${n.position.y}" width="${n.size.width}" height="${n.size.height}" fill="#FBFB77" stroke="#A80036" stroke-width="1" />\n`;
            svg += this.renderText(n.position.x + n.size.width/2, n.position.y + n.size.height/2 + 5, n.text, 12);
        });

        // 7. Dividers
        map.dividers?.forEach(d => {
            const y = d.position.y + d.size.height / 2;
            svg += `<line x1="${minX + 20}" y1="${y}" x2="${maxX - 20}" y2="${y}" stroke="#A80036" stroke-width="2" />\n`;
            svg += `<line x1="${minX + 20}" y1="${y + 4}" x2="${maxX - 20}" y2="${y + 4}" stroke="#A80036" stroke-width="2" />\n`;
            const textWidth = d.label.length * 10;
            svg += `<rect x="${(minX + maxX)/2 - textWidth/2}" y="${d.position.y}" width="${textWidth}" height="${d.size.height}" fill="white" />\n`;
            svg += this.renderText((minX + maxX)/2, y + 5, d.label, 14, "middle", "#A80036");
        });

        svg += '</svg>';
        return svg;
    }
}
