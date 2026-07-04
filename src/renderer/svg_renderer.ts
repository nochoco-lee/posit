import { LayoutMap, LayoutNode, LayoutConnection, LayoutGroup, LayoutNote, LayoutActivation } from "../layout/types";
import { getIntersection, getMemberText, THEME } from "./primitives";

export class LayoutPumlSvgRenderer {
    private width: number = 2000;
    private height: number = 2000;

    constructor() {}

    private renderText(x: number, y: number, text: string, fontSize: number, anchor: string = "middle", color: string = "black", isAbstract: boolean = false, isStatic: boolean = false): string {
        const lines = text.split('\n');
        const style = `${isAbstract ? 'font-style="italic"' : ''} ${isStatic ? 'text-decoration="underline"' : ''}`;
        if (lines.length === 1) {
            return `<text x="${x}" y="${y}" font-family="sans-serif" font-size="${fontSize}" text-anchor="${anchor}" fill="${color}" ${style}>${text}</text>\n`;
        }
        // Offset y to roughly center the lines vertically around the original y
        const totalHeight = lines.length * fontSize * 1.2;
        let currentY = y - (totalHeight / 2) + (fontSize);
        let svg = `<text x="${x}" y="${currentY}" font-family="sans-serif" font-size="${fontSize}" text-anchor="${anchor}" fill="${color}" ${style}>\n`;
        lines.forEach((line, i) => {
            svg += `<tspan x="${x}" dy="${i === 0 ? 0 : fontSize * 1.2}">${line}</tspan>\n`;
        });
        svg += `</text>\n`;
        return svg;
    }

    private renderIcon(x: number, y: number, iconCode: string, fontSize: number = 16): string {
        return `<text x="${x}" y="${y}" font-family='"Font Awesome 6 Free"' font-weight="900" font-size="${fontSize}" fill="black">${iconCode}</text>\n`;
    }

    private getMemberSvg(x: number, y: number, member: any): string {
        const text = getMemberText(member);
        return this.renderText(x + 5, y, text, 10, "start", "black", member.isAbstract, member.isStatic);
    }

    private getAdjustedX(map: LayoutMap, nodeId: string, otherX: number, yPos: number): number {
        const node = map.nodes[nodeId];
        if (!node) return 0;
        const centerX = node.position.x + node.size.width / 2;
        const activations = map.activations?.filter(a => a.nodeId === nodeId) || [];
        const activeAtY = activations.filter(a => {
            const startY = a.startPosition.y;
            const endY = startY + a.size.height;
            return yPos >= startY && yPos <= endY;
        });

        if (activeAtY.length === 0) return centerX;

        const maxDepth = Math.max(...activeAtY.map(a => a.depth || 0));
        const actWidth = 10;
        const leftEdge = centerX - actWidth / 2;
        const rightEdge = centerX + actWidth / 2 + (maxDepth * 5);

        if (otherX > centerX) return rightEdge;
        return leftEdge;
    }



    public render(map: LayoutMap): string {
        // Calculate bounds
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        
        const updateBounds = (x: number, y: number, w: number, h: number) => {
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + w);
            maxY = Math.max(maxY, y + h);
        };

        const nodes = Object.values(map.nodes);
        if (nodes.length === 0 && map.notes.length === 0 && map.groups.length === 0) {
            minX = 0; minY = 0; maxX = 800; maxY = 600;
        } else {
            nodes.forEach(n => updateBounds(n.position.x, n.position.y, n.size.width, n.size.height));
            map.notes.forEach(n => updateBounds(n.position.x, n.position.y, n.size.width, n.size.height));
            map.groups.forEach(g => updateBounds(g.position.x, g.position.y, g.size.width, g.size.height));
            map.connections.forEach(c => {
                if (c.position) updateBounds(c.position.x, c.position.y, 0, 0);
                if (c.calculatedY !== undefined) {
                    updateBounds(minX, c.calculatedY, 0, 0);
                }
            });
            if (map.dividers) map.dividers.forEach(d => updateBounds(d.position.x, d.position.y, d.size.width, d.size.height));
            if (map.delays) map.delays.forEach(d => updateBounds(d.position.x, d.position.y, 100, 40));
        }

        // Add padding
        minX -= 40; minY -= 40; maxX += 40; maxY += 40;
        this.width = maxX - minX;
        this.height = maxY - minY;

        let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${this.width}" height="${this.height}" viewBox="${minX} ${minY} ${this.width} ${this.height}">\n`;
        svg += `<rect x="${minX}" y="${minY}" width="${this.width}" height="${this.height}" fill="white" />\n`;

        const isSequence = map.diagramType === 'sequence' || map.diagramType === 'unknown';

        // 1. Groups (background)
        map.groups.forEach(g => {
            if (isSequence) {
                const isBox = g.keyword === 'box';
                const isRef = g.keyword === 'ref';
                const fill = g.color || (isBox ? '#DDDDDD' : 'none');
                const fillOpacity = g.color ? 0.1 : (isBox ? 0.3 : 0);
                const stroke = g.color || '#A80036';
                
                svg += `<rect x="${g.position.x}" y="${g.position.y}" width="${g.size.width}" height="${g.size.height}" fill="${fill}" fill-opacity="${fillOpacity}" stroke="${stroke}" stroke-width="2" />\n`;
                
                if (!isBox) {
                    const keyword = g.keyword === 'group' ? 'alt' : g.keyword;
                    const keywordWidth = keyword.length * 9 + 10;
                    svg += `<rect x="${g.position.x}" y="${g.position.y}" width="${keywordWidth}" height="18" fill="#EEEEEE" stroke="${stroke}" stroke-width="1" />\n`;
                    svg += `<text x="${g.position.x + 5}" y="${g.position.y + 13}" font-family="sans-serif" font-size="11" font-weight="bold" fill="black">${keyword}</text>\n`;
                    
                    if (isRef) {
                        svg += this.renderText(g.position.x + g.size.width/2, g.position.y + g.size.height/2, g.label || "", 12, "middle", "black");
                    } else if (g.label) {
                        svg += `<text x="${g.position.x + keywordWidth + 5}" y="${g.position.y + 13}" font-family="sans-serif" font-size="11" font-weight="bold" fill="${stroke}">[${g.label}]</text>\n`;
                    }
                } else if (g.label) {
                    svg += this.renderText(g.position.x + g.size.width/2, g.position.y + 15, g.label, 14, "middle", "black");
                }
            } else if (g.keyword === 'package' || g.keyword === 'namespace' || g.keyword === 'folder') {
                // Classic package shape with a tab
                const labelText = g.label || "";
                const labelWidth = labelText.length * 6.5 + 20;
                const tabWidth = Math.min(Math.max(labelWidth, 60), g.size.width);
                const tabHeight = 20;
                svg += `<path d="M ${g.position.x} ${g.position.y} 
                           L ${g.position.x + tabWidth} ${g.position.y} 
                           L ${g.position.x + tabWidth + 5} ${g.position.y + tabHeight} 
                           L ${g.position.x + g.size.width} ${g.position.y + tabHeight} 
                           L ${g.position.x + g.size.width} ${g.position.y + g.size.height} 
                           L ${g.position.x} ${g.position.y + g.size.height} Z" 
                           fill="${g.color || 'white'}" fill-opacity="0.1" stroke="${g.color || '#A80036'}" stroke-width="2" />\n`;
                svg += this.renderText(g.position.x + tabWidth/2, g.position.y + 14, g.label || "", 11, "middle", g.color || '#A80036');
            } else if (g.keyword === 'node' || g.keyword === 'box') {
                // 3D box shape (same as Konva renderer)
                const w = g.size.width;
                const h = g.size.height;
                const x = g.position.x;
                const y = g.position.y;
                const stroke = g.color || '#A80036';
                // Front face
                svg += `<rect x="${x}" y="${y + 10}" width="${w - 10}" height="${h - 10}" fill="${g.color || '#FEFECE'}" fill-opacity="0.1" stroke="${stroke}" stroke-width="1.5" />\n`;
                // Top face
                svg += `<polygon points="${x},${y + 10} ${x + 10},${y} ${x + w},${y} ${x + w - 10},${y + 10}" fill="${g.color || '#F2F2FF'}" fill-opacity="0.3" stroke="${stroke}" stroke-width="1.5" />\n`;
                // Right face
                svg += `<polygon points="${x + w - 10},${y + 10} ${x + w},${y} ${x + w},${y + h - 10} ${x + w - 10},${y + h}" fill="${g.color || '#D2D2E0'}" fill-opacity="0.3" stroke="${stroke}" stroke-width="1.5" />\n`;
                // Label
                if (g.label) {
                    svg += this.renderText(x + (w - 10) / 2, y + 10 + (h - 10) / 2, g.label, 14, "middle", "black");
                }
            } else {
                svg += `<rect x="${g.position.x}" y="${g.position.y}" width="${g.size.width}" height="${g.size.height}" fill="${g.color || 'none'}" fill-opacity="0.1" stroke="${g.color || '#A80036'}" stroke-width="2" stroke-dasharray="5,5" />\n`;
                
                // Measure keyword to size its box
                const keywordWidth = g.keyword.length * 8 + 10;
                svg += `<rect x="${g.position.x}" y="${g.position.y}" width="${keywordWidth}" height="18" fill="#EEEEEE" stroke="${g.color || '#A80036'}" stroke-width="1" />\n`;
                svg += `<text x="${g.position.x + 5}" y="${g.position.y + 13}" font-family="sans-serif" font-size="11" font-weight="bold" fill="black">${g.keyword}</text>\n`;
                
                if (g.label) {
                    svg += `<text x="${g.position.x + keywordWidth + 5}" y="${g.position.y + 13}" font-family="sans-serif" font-size="11" font-weight="bold" fill="${g.color || '#A80036'}">[${g.label}]</text>\n`;
                }
            }
            g.dividerYs?.forEach((dy, index) => {
                svg += `<line x1="${g.position.x}" y1="${dy}" x2="${g.position.x + g.size.width}" y2="${dy}" stroke="${g.color || '#A80036'}" stroke-width="1" stroke-dasharray="5,5" />\n`;
                const nextSection = g.sections?.[index + 1];
                if (nextSection && nextSection.label) {
                    svg += `<text x="${g.position.x + 5}" y="${dy + 14}" font-family="sans-serif" font-size="11" font-style="italic" fill="${g.color || '#A80036'}">[${nextSection.label}]</text>\n`;
                }
            });
        });

        // 2. Lifelines
        if (map.diagramType === 'sequence' || map.diagramType === 'unknown') {
            Object.values(map.nodes).forEach(n => {
                if (n.lifelineX && n.lifelineY) {
                    let endY = maxY;
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
            const x = n.position.x;
            const y = n.position.y;
            const w = n.size.width;
            const h = n.size.height;
            const centerX = x + w / 2;
            const centerY = y + h / 2;
            const fill = n.color || (isSequence ? '#E2E2F0' : '#FEFECE');
            const stroke = '#A80036';

            if (n.type === 'actor' || n.type === 'person') {
                const headRadius = 10;
                const headY = y + headRadius;
                svg += `<circle cx="${centerX}" cy="${headY}" r="${headRadius}" fill="${fill}" stroke="${stroke}" stroke-width="2" />\n`;
                svg += `<line x1="${centerX}" y1="${headY + headRadius}" x2="${centerX}" y2="${headY + headRadius + 20}" stroke="${stroke}" stroke-width="2" />\n`;
                svg += `<line x1="${centerX - 15}" y1="${headY + headRadius + 5}" x2="${centerX + 15}" y2="${headY + headRadius + 5}" stroke="${stroke}" stroke-width="2" />\n`;
                svg += `<line x1="${centerX - 10}" y1="${headY + headRadius + 35}" x2="${centerX}" y2="${headY + headRadius + 20}" stroke="${stroke}" stroke-width="2" />\n`;
                svg += `<line x1="${centerX + 10}" y1="${headY + headRadius + 35}" x2="${centerX}" y2="${headY + headRadius + 20}" stroke="${stroke}" stroke-width="2" />\n`;
                // Render icon if present
                if (n.iconCode) {
                    svg += this.renderIcon(x + 5, headY + headRadius + 50, n.iconCode, 16);
                }
                const text = n.origName + (n.stereotype ? `\n${n.stereotype}` : "");
                svg += this.renderText(centerX, headY + headRadius + 50, text, 14);
            } else if (n.type === 'node' || n.type === 'box') {
                // 3D Cube for Node
                const offset = 10;
                const bw = w - offset;
                const bh = h - offset;
                const bx = x;
                const by = y + offset;
                
                svg += `<path d="M ${bx} ${by} L ${bx+bw} ${by} L ${bx+bw} ${by+bh} L ${bx} ${by+bh} Z" fill="${fill}" stroke="${stroke}" stroke-width="1.5" />\n`;
                svg += `<path d="M ${bx} ${by} L ${bx+offset} ${by-offset} L ${bx+bw+offset} ${by-offset} L ${bx+bw} ${by} Z" fill="#F2F2FF" stroke="${stroke}" stroke-width="1.5" />\n`;
                svg += `<path d="M ${bx+bw} ${by} L ${bx+bw+offset} ${by-offset} L ${bx+bw+offset} ${by+bh-offset} L ${bx+bw} ${by+bh} Z" fill="#D2D2E0" stroke="${stroke}" stroke-width="1.5" />\n`;
                // Render icon if present
                if (n.iconCode) {
                    svg += this.renderIcon(bx + 5, by + 15, n.iconCode, 16);
                }
                const text = n.origName + (n.stereotype ? `\n${n.stereotype}` : "");
                svg += this.renderText(bx + bw/2, by + bh/2 + 5, text, 14);
            } else if (n.type === 'round') {
                svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="1.5" rx="20" />\n`;
                svg += this.renderText(centerX, centerY + 5, n.origName, 14);
            } else if (n.type === 'stadium') {
                svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="1.5" rx="${h/2}" />\n`;
                svg += this.renderText(centerX, centerY + 5, n.origName, 14);
            } else if (n.type === 'subroutine') {
                svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="1.5" />\n`;
                svg += `<line x1="${x+10}" y1="${y}" x2="${x+10}" y2="${y+h}" stroke="${stroke}" stroke-width="1.5" />\n`;
                svg += `<line x1="${x+w-10}" y1="${y}" x2="${x+w-10}" y2="${y+h}" stroke="${stroke}" stroke-width="1.5" />\n`;
                svg += this.renderText(centerX, centerY + 5, n.origName, 14);
            } else if (n.type === 'cylinder') {
                const ry = 10;
                svg += `<path d="M ${x} ${y+ry} L ${x} ${y+h-ry} A ${w/2} ${ry} 0 0 0 ${x+w} ${y+h-ry} L ${x+w} ${y+ry} A ${w/2} ${ry} 0 0 0 ${x} ${y+ry} Z" fill="${fill}" stroke="${stroke}" stroke-width="1.5" />\n`;
                svg += `<ellipse cx="${centerX}" cy="${y+ry}" rx="${w/2}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="1.5" />\n`;
                svg += this.renderText(centerX, centerY + 5, n.origName, 14);
            } else if (n.type === 'circle') {
                const r = Math.min(w, h) / 2;
                svg += `<circle cx="${centerX}" cy="${centerY}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="1.5" />\n`;
                svg += this.renderText(centerX, centerY + 5, n.origName, 14);
            } else if (n.type === 'asymmetric') {
                svg += `<path d="M ${x} ${y} L ${x+w-15} ${y} L ${x+w} ${centerY} L ${x+w-15} ${y+h} L ${x} ${y+h} Z" fill="${fill}" stroke="${stroke}" stroke-width="1.5" />\n`;
                svg += this.renderText(centerX - 7.5, centerY + 5, n.origName, 14);
            } else if (n.type === 'diamond' || n.type === 'rhombus') {
                svg += `<path d="M ${centerX} ${y} L ${x+w} ${centerY} L ${centerX} ${y+h} L ${x} ${centerY} Z" fill="${fill}" stroke="${stroke}" stroke-width="1.5" />\n`;
                svg += this.renderText(centerX, centerY + 5, n.origName, 14);
            } else if (n.type === 'parallelogram') {
                svg += `<path d="M ${x+15} ${y} L ${x+w} ${y} L ${x+w-15} ${y+h} L ${x} ${y+h} Z" fill="${fill}" stroke="${stroke}" stroke-width="1.5" />\n`;
                svg += this.renderText(centerX, centerY + 5, n.origName, 14);
            } else if (n.type === 'inv_parallelogram') {
                svg += `<path d="M ${x} ${y} L ${x+w-15} ${y} L ${x+w} ${y+h} L ${x+15} ${y+h} Z" fill="${fill}" stroke="${stroke}" stroke-width="1.5" />\n`;
                svg += this.renderText(centerX, centerY + 5, n.origName, 14);
            } else if (n.type === 'trapezoid') {
                svg += `<path d="M ${x+15} ${y} L ${x+w-15} ${y} L ${x+w} ${y+h} L ${x} ${y+h} Z" fill="${fill}" stroke="${stroke}" stroke-width="1.5" />\n`;
                svg += this.renderText(centerX, centerY + 5, n.origName, 14);
            } else if (n.type === 'inv_trapezoid') {
                svg += `<path d="M ${x} ${y} L ${x+w} ${y} L ${x+w-15} ${y+h} L ${x+15} ${y+h} Z" fill="${fill}" stroke="${stroke}" stroke-width="1.5" />\n`;
                svg += this.renderText(centerX, centerY + 5, n.origName, 14);
            } else if (n.type === 'cloud') {
                const r = Math.min(w, h) / 3;
                svg += `<path d="M ${centerX - r*1.5} ${centerY} 
                           A ${r} ${r} 0 0 1 ${centerX - r*0.5} ${centerY - r}
                           A ${r} ${r} 0 0 1 ${centerX + r*0.5} ${centerY - r}
                           A ${r} ${r} 0 0 1 ${centerX + r*1.5} ${centerY}
                           A ${r} ${r} 0 0 1 ${centerX + r*0.5} ${centerY + r}
                           A ${r} ${r} 0 0 1 ${centerX - r*0.5} ${centerY + r}
                           A ${r} ${r} 0 0 1 ${centerX - r*1.5} ${centerY} Z" 
                           fill="${fill}" stroke="${stroke}" stroke-width="1.5" />\n`;
                const text = n.origName + (n.stereotype ? `\n${n.stereotype}` : "");
                svg += this.renderText(centerX, centerY + 5, text, 14);
            } else if (n.type === 'database' || n.type === 'storage') {
                const ry = 10;
                svg += `<path d="M ${x} ${y+ry} L ${x} ${y+h-ry} A ${w/2} ${ry} 0 0 0 ${x+w} ${y+h-ry} L ${x+w} ${y+ry} A ${w/2} ${ry} 0 0 0 ${x} ${y+ry} Z" fill="${fill}" stroke="${stroke}" stroke-width="1.5" />\n`;
                svg += `<ellipse cx="${centerX}" cy="${y+ry}" rx="${w/2}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="1.5" />\n`;
                const text = n.origName + (n.stereotype ? `\n${n.stereotype}` : "");
                svg += this.renderText(centerX, centerY + 5, text, 14);
            } else if (n.type === 'component') {
                svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="1.5" />\n`;
                // Modern component icon in top right to match DeploymentRenderer
                const iconW = 15;
                const iconH = 12;
                const ix = x + w - 22;
                const iy = y + 5;
                svg += `<rect x="${ix}" y="${iy}" width="${iconW}" height="${iconH}" fill="${fill}" stroke="${stroke}" stroke-width="1" />\n`;
                svg += `<rect x="${ix-3}" y="${iy+2}" width="6" height="3" fill="${fill}" stroke="${stroke}" stroke-width="1" />\n`;
                svg += `<rect x="${ix-3}" y="${iy+7}" width="6" height="3" fill="${fill}" stroke="${stroke}" stroke-width="1" />\n`;
                const text = n.origName + (n.stereotype ? `\n${n.stereotype}` : "");
                svg += this.renderText(centerX, centerY + 5, text, 14);
            } else if (n.type === 'artifact') {
                svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="1.5" />\n`;
                const iconW = 15;
                const iconH = 18;
                const ix = x + w - iconW - 5;
                const iy = y + 5;
                svg += `<path d="M ${ix} ${iy} L ${ix+iconW-5} ${iy} L ${ix+iconW} ${iy+5} L ${ix+iconW} ${iy+iconH} L ${ix} ${iy+iconH} Z M ${ix+iconW-5} ${iy} L ${ix+iconW-5} ${iy+5} L ${ix+iconW} ${iy+5}" fill="none" stroke="${stroke}" stroke-width="1" />\n`;
                const text = n.origName + (n.stereotype ? `\n${n.stereotype}` : "");
                svg += this.renderText(centerX, centerY + 5, text, 14);
            } else if (n.type === 'file') {
                svg += `<path d="M ${x} ${y} L ${x+w-15} ${y} L ${x+w} ${y+15} L ${x+w} ${y+h} L ${x} ${y+h} Z M ${x+w-15} ${y} L ${x+w-15} ${y+15} L ${x+w} ${y+15}" fill="${fill}" stroke="${stroke}" stroke-width="1.5" />\n`;
                const text = n.origName + (n.stereotype ? `\n${n.stereotype}` : "");
                svg += this.renderText(centerX, centerY + 5, text, 14);
            } else if (n.type === 'folder' || n.type === 'package' || n.type === 'namespace') {
                const tabW = w * 0.4;
                const tabH = 15;
                svg += `<path d="M ${x} ${y+tabH} L ${x} ${y} L ${x+tabW} ${y} L ${x+tabW+5} ${y+tabH} L ${x+w} ${y+tabH} L ${x+w} ${y+h} L ${x} ${y+h} Z" fill="${fill}" stroke="${stroke}" stroke-width="1.5" />\n`;
                const text = n.origName + (n.stereotype ? `\n${n.stereotype}` : "");
                svg += this.renderText(centerX, centerY + tabH/2 + 5, text, 14);
            } else if (n.type === 'frame') {
                svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="1.5" />\n`;
                svg += `<path d="M ${x} ${y+20} L ${x+40} ${y+20} L ${x+50} ${y} L ${x} ${y} Z" fill="${fill}" stroke="${stroke}" stroke-width="1.5" />\n`;
                const text = n.origName + (n.stereotype ? `\n${n.stereotype}` : "");
                svg += this.renderText(centerX, centerY + 5, text, 14);
            } else if (n.type === 'collections') {
                for (let i = 1; i >= 0; i--) {
                    svg += `<rect x="${x + i*10}" y="${y - i*10}" width="${w-10}" height="${h-10}" fill="${fill}" stroke="${stroke}" stroke-width="1.5" />\n`;
                }
                const text = n.origName + (n.stereotype ? `\n${n.stereotype}` : "");
                svg += this.renderText(x + w/2 - 5, y + h/2, text, 14);
            } else if (n.type === 'agent' || n.type === 'process' || n.type === 'action') {
                svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="1.5" />\n`;
                const text = n.origName + (n.stereotype ? `\n${n.stereotype}` : "");
                svg += this.renderText(centerX, centerY + 5, text, 14);
            } else if (n.type === 'usecase') {
                svg += `<ellipse cx="${centerX}" cy="${centerY}" rx="${w/2}" ry="${h/2}" fill="${fill}" stroke="${stroke}" stroke-width="1.5" />\n`;
                const text = n.origName + (n.stereotype ? `\n${n.stereotype}` : "");
                svg += this.renderText(centerX, centerY + 5, text, 14);
            } else if (n.type === 'hexagon') {
                const side = w / 4;
                svg += `<path d="M ${x+side} ${y} L ${x+w-side} ${y} L ${x+w} ${centerY} L ${x+w-side} ${y+h} L ${x+side} ${y+h} L ${x} ${centerY} Z" fill="${fill}" stroke="${stroke}" stroke-width="1.5" />\n`;
                const text = n.origName + (n.stereotype ? `\n${n.stereotype}` : "");
                svg += this.renderText(centerX, centerY + 5, text, 14);
            } else if (n.type === 'queue') {
                svg += `<path d="M ${x+10} ${y} L ${x+w} ${y} L ${x+w-10} ${y+h} L ${x} ${y+h} Z" fill="${fill}" stroke="${stroke}" stroke-width="1.5" />\n`;
                const text = n.origName + (n.stereotype ? `\n${n.stereotype}` : "");
                svg += this.renderText(centerX, centerY + 5, text, 14);
            } else if (n.type === 'stack') {
                for (let i = 2; i >= 0; i--) {
                    svg += `<rect x="${x + i*5}" y="${y - i*5}" width="${w-10}" height="${h-10}" fill="${fill}" stroke="${stroke}" stroke-width="1.5" />\n`;
                }
                const text = n.origName + (n.stereotype ? `\n${n.stereotype}` : "");
                svg += this.renderText(x + w/2 - 5, y + h/2, text, 14);
            } else if (n.type === 'boundary') {
                svg += `<circle cx="${x+15}" cy="${centerY}" r="15" fill="none" stroke="${stroke}" stroke-width="1.5" />\n`;
                svg += `<line x1="${x}" y1="${centerY-20}" x2="${x}" y2="${centerY+20}" stroke="${stroke}" stroke-width="1.5" />\n`;
                svg += `<line x1="${x+30}" y1="${centerY}" x2="${x+w}" y2="${centerY}" stroke="${stroke}" stroke-width="1.5" />\n`;
                const text = n.origName + (n.stereotype ? `\n${n.stereotype}` : "");
                svg += this.renderText(centerX, y + h + 15, text, 14);
            } else if (n.type === 'control') {
                svg += `<circle cx="${centerX}" cy="${centerY}" r="20" fill="none" stroke="${stroke}" stroke-width="1.5" />\n`;
                svg += `<path d="M ${centerX} ${centerY-20} L ${centerX+5} ${centerY-25} M ${centerX} ${centerY-20} L ${centerX-5} ${centerY-25}" fill="none" stroke="${stroke}" stroke-width="1.5" />\n`;
                const text = n.origName + (n.stereotype ? `\n${n.stereotype}` : "");
                svg += this.renderText(centerX, y + h + 15, text, 14);
            } else if (n.type === 'entity') {
                svg += `<circle cx="${centerX}" cy="${centerY-5}" r="20" fill="none" stroke="${stroke}" stroke-width="1.5" />\n`;
                svg += `<line x1="${centerX-25}" y1="${y+h-15}" x2="${centerX+25}" y2="${y+h-15}" stroke="${stroke}" stroke-width="1.5" />\n`;
                const text = n.origName + (n.stereotype ? `\n${n.stereotype}` : "");
                svg += this.renderText(centerX, y + h + 15, text, 14);
            } else {
                const isClass = n.type === 'class' || n.type === 'interface' || n.type === 'enum' || n.type === 'struct';
                svg += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="1.5" rx="5" />\n`;
                // Render icon if present
                if (n.iconCode) {
                    svg += this.renderIcon(x + 5, y + 15, n.iconCode, 16);
                }
                if (isClass) {
                    svg += `<line x1="${x}" y1="${y + 30}" x2="${x + w}" y2="${y + 30}" stroke="${stroke}" stroke-width="1" />\n`;
                    let titleY = y + 15;
                    if (n.type === 'interface') {
                        svg += this.renderText(x + w/2, y + 12, "<<interface>>", 10, "middle", "black");
                        titleY = y + 22;
                    } else if (n.stereotype) {
                        svg += this.renderText(x + w/2, y + 10, n.stereotype, 10, "middle", "black");
                        titleY = y + 22;
                    }
                    svg += this.renderText(x + w/2, titleY, n.origName, 12, "middle", "black", false, false);
                    
                    if (n.members) {
                        const fields = n.members.filter((m: any) => m.isField);
                        const methods = n.members.filter((m: any) => m.isMethod);
                        let currentY = y + 45;

                        fields.forEach((m: any) => {
                            svg += this.getMemberSvg(x, currentY, m);
                            currentY += 18;
                        });

                        const fieldsHeight = Math.max(18, fields.length * 18);
                        const separatorY = y + 30 + fieldsHeight;
                        svg += `<line x1="${x}" y1="${separatorY}" x2="${x + w}" y2="${separatorY}" stroke="${stroke}" stroke-width="1" />\n`;
                        
                        currentY = separatorY + 12;
                        methods.forEach((m: any) => {
                            svg += this.getMemberSvg(x, currentY, m);
                            currentY += 18;
                        });
                    }
                } else {
                    const text = n.origName + (n.stereotype ? `\n${n.stereotype}` : "");
                    svg += this.renderText(x + w/2, y + h/2 + 5, text, 14);
                }
            }
        });

        // 5. Connections
        map.connections.forEach(c => {
            const originNode = map.nodes[c.from];
            const targetNode = map.nodes[c.to];
            const fromExternal = c.from === "[" || c.from === "]";
            const toExternal = c.to === "[" || c.to === "]";

            if ((!originNode && !fromExternal) || (!targetNode && !toExternal)) return;

            let ox: number, oy: number, tx: number, ty: number;
            const yPos = isSequence ? (c.calculatedY || (c.position ? c.position.y : 200)) : 0;

            if (isSequence) {
                const isSelf = c.from === c.to;
                let rawOx = fromExternal ? (targetNode?.position.x || 100) - 50 : (originNode.position.x + originNode.size.width / 2);
                let rawTx = toExternal ? (originNode?.position.x || 100) + (originNode?.size.width || 0) + 50 : (targetNode.position.x + targetNode.size.width / 2);
                
                if (fromExternal && !toExternal) rawOx = rawTx - 100;
                else if (toExternal && !fromExternal) rawTx = rawOx + 100;

                ox = fromExternal ? rawOx : this.getAdjustedX(map, c.from, rawTx, yPos);
                tx = toExternal ? rawTx : this.getAdjustedX(map, c.to, rawOx, yPos);
                
                if (isSelf) {
                    ox = this.getAdjustedX(map, c.from, rawOx + 1, yPos); // Force right edge
                    tx = ox; 
                }
                
                oy = yPos;
                ty = yPos;
            } else {
                const oCenterX = originNode.position.x + originNode.size.width / 2;
                const oCenterY = originNode.position.y + originNode.size.height / 2;
                const tCenterX = targetNode.position.x + targetNode.size.width / 2;
                const tCenterY = targetNode.position.y + targetNode.size.height / 2;

                const oRect = { x: originNode.position.x, y: originNode.position.y, width: originNode.size.width, height: originNode.size.height };
                const tRect = { x: targetNode.position.x, y: targetNode.position.y, width: targetNode.size.width, height: targetNode.size.height };

                const startPt = getIntersection({ x: tCenterX, y: tCenterY }, { x: oCenterX, y: oCenterY }, oRect);
                const endPt = getIntersection({ x: oCenterX, y: oCenterY }, { x: tCenterX, y: tCenterY }, tRect);

                ox = startPt.x; oy = startPt.y;
                tx = endPt.x; ty = endPt.y;
            }
            
            // Parse bracket styles
            const bracketMatch = c.type.match(/\[([^\]]+)\]/);
            const bracketStyle = bracketMatch ? bracketMatch[1].toLowerCase() : '';
            if (bracketStyle === 'hidden') return; // Skip hidden connections

            const isDotted = c.type.includes("..") || bracketStyle === 'dotted';
            const isDashed = c.type.includes("--") || bracketStyle === 'dashed';
            const isBold = bracketStyle === 'bold';
            const isPlain = bracketStyle === 'plain';
            const strokeDash = isDotted ? 'stroke-dasharray="2,2"' : isDashed ? 'stroke-dasharray="8,4"' : "";
            const strokeWidth = isBold ? 'stroke-width="4"' : 'stroke-width="2"';
            const markerEnd = isPlain ? '' : ` marker-end="url(#arrowhead)"`;
            const connColor = (c as any).color || '#A80036';
            
            if (c.from === c.to && isSequence) {
                const loopW = c.selfMessageWidth ? Math.min(40, c.selfMessageWidth / 2) : 30;
                const path = `M ${ox} ${oy} L ${ox + loopW} ${oy} L ${ox + loopW} ${oy + 20} L ${ox + 7} ${oy + 20}`;
                svg += `<path d="${path}" fill="none" stroke="${connColor}" ${strokeWidth} ${strokeDash} />\n`;
                if (!isPlain) svg += `<path d="M ${ox + 17} ${oy + 15} L ${ox + 7} ${oy + 20} L ${ox + 17} ${oy + 25} Z" fill="${connColor}" />\n`;
                if (c.label) {
                    svg += this.renderText(ox + loopW + 5, oy + 10, c.label, 12, "start");
                }
            } else {
                svg += `<line x1="${ox}" y1="${oy}" x2="${tx}" y2="${ty}" stroke="${connColor}" ${strokeWidth} ${strokeDash} />\n`;
                
                const drawHead = (x: number, y: number, fromX: number, fromY: number, direction: number, type: string, isStart: boolean) => {
                    const angle = Math.atan2(y - fromY, x - fromX);
                    const headStr = isStart ? type.split(/[-.=]+/)[0] : type.split(/[-.=]+/)[type.split(/[-.=]+/).length - 1];
                    
                    if (isSequence) {
                        const isLost = headStr.includes("x");
                        const isCircle = headStr.includes("o");
                        const isHalfTop = headStr.includes("\\");
                        const isHalfBottom = headStr.includes("/");
                        const isUnknown = headStr.includes("?");
                        // In sequence diagrams, ->> is open (>), -> is solid (filled triangle)
                        const isOpen = headStr.includes(">>") || headStr.includes("<<") || headStr.includes(")") || headStr.includes("(");
                        const isSolid = (headStr.includes(">") || headStr.includes("<")) && !isOpen && !isCircle && !isLost && !isUnknown;

                        if (isLost) {
                            svg += `<line x1="${x - 5}" y1="${y - 5}" x2="${x + 5}" y2="${y + 5}" stroke="${connColor}" stroke-width="2" />\n`;
                            svg += `<line x1="${x + 5}" y1="${y - 5}" x2="${x - 5}" y2="${y + 5}" stroke="${connColor}" stroke-width="2" />\n`;
                            return;
                        }

                        if (isUnknown) {
                            svg += this.renderText(x, y - 5, "?", 14, "middle", connColor);
                            return;
                        }

                        let currentX = x;
                        if (isCircle) {
                            svg += `<circle cx="${x - 5 * direction}" cy="${y}" r="5" fill="white" stroke="${connColor}" stroke-width="2" />\n`;
                            currentX -= 10 * direction;
                        }

                        if (isHalfTop) {
                            svg += `<line x1="${currentX - 10 * direction}" y1="${y - 5}" x2="${currentX}" y2="${y}" stroke="${connColor}" stroke-width="2" />\n`;
                        } else if (isHalfBottom) {
                            svg += `<line x1="${currentX - 10 * direction}" y1="${y + 5}" x2="${currentX}" y2="${y}" stroke="${connColor}" stroke-width="2" />\n`;
                        } else if (isOpen) {
                            svg += `<path d="M ${currentX - 10 * direction} ${y - 5} L ${currentX} ${y} L ${currentX - 10 * direction} ${y + 5}" fill="none" stroke="${connColor}" stroke-width="2" />\n`;
                        } else if (isSolid) {
                            const headPath = `M ${currentX - 10 * direction} ${y - 5} L ${currentX} ${y} L ${currentX - 10 * direction} ${y + 5} Z`;
                            svg += `<path d="${headPath}" fill="${connColor}" />\n`;
                        }
                    } else {
                        // Class Diagram specific heads
                        let headType = "default";
                        if (headStr.includes("<|") || headStr.includes("|>")) headType = "extend";
                        else if (headStr.includes("*")) headType = "compose";
                        else if (headStr.includes("o")) headType = "aggregate";
                        else if (headStr.includes(">") || headStr.includes("<")) headType = "nav";

                        const size = 10;
                        const dx = Math.cos(angle);
                        const dy = Math.sin(angle);
                        const px = -dy;
                        const py = dx;

                        if (headType === "extend") {
                            const p1x = x - size * 1.5 * dx - size * px;
                            const p1y = y - size * 1.5 * dy - size * py;
                            const p2x = x - size * 1.5 * dx + size * px;
                            const p2y = y - size * 1.5 * dy + size * py;
                            svg += `<path d="M ${x} ${y} L ${p1x} ${p1y} L ${p2x} ${p2y} Z" fill="white" stroke="${connColor}" stroke-width="1.5" />\n`;
                        } else if (headType === "compose" || headType === "aggregate") {
                            const p1x = x - size * dx - size * 0.6 * px;
                            const p1y = y - size * dy - size * 0.6 * py;
                            const p2x = x - size * 2 * dx;
                            const p2y = y - size * 2 * dy;
                            const p3x = x - size * dx + size * 0.6 * px;
                            const p3y = y - size * dy + size * 0.6 * py;
                            const fill = headType === "compose" ? connColor : "white";
                            svg += `<path d="M ${x} ${y} L ${p1x} ${p1y} L ${p2x} ${p2y} L ${p3x} ${p3y} Z" fill="${fill}" stroke="${connColor}" stroke-width="1.5" />\n`;
                        } else if (headType === "nav") {
                            const p1x = x - size * dx - size * px;
                            const p1y = y - size * dy - size * py;
                            const p2x = x - size * dx + size * px;
                            const p2y = y - size * dy + size * py;
                            svg += `<path d="M ${p1x} ${p1y} L ${x} ${y} L ${p2x} ${p2y}" fill="none" stroke="${connColor}" stroke-width="2" />\n`;
                        }
                    }
                };

                const dir = tx > ox ? 1 : -1;
                
                const hasEndHead = c.type.includes(">") || c.type.includes("*") || c.type.includes("o") || c.type.includes("\\") || c.type.includes("/") || c.type.includes("x") || c.type.includes(")");
                const hasStartHead = c.type.includes("<") || (c.type.startsWith("o") && c.type.length > 1) || c.type.startsWith("*") || c.type.includes("(");

                if (hasEndHead) {
                    drawHead(tx, ty, ox, oy, dir, c.type, false);
                }
                if (hasStartHead) {
                    drawHead(ox, oy, tx, ty, -dir, c.type, true);
                }

                if (c.label) {
                    const label = (c.number ? `(${c.number}) ` : "") + c.label;
                    svg += this.renderText((ox + tx) / 2, (oy + ty) / 2 - 10, label, 12);
                }

                // Cardinality
                if (!isSequence) {
                    const dx = tx - ox;
                    const dy = ty - oy;
                    let offsetX = 10;
                    let offsetY = -10;
                    if (Math.abs(dy) > Math.abs(dx)) { offsetX = 15; offsetY = -5; }

                    if (c.fromLabel) {
                        const fx = ox + dx * 0.1;
                        const fy = oy + dy * 0.1;
                        svg += this.renderText(fx + offsetX, fy + offsetY, c.fromLabel, 10, "start", "black", true); // Italic
                    }
                    if (c.toLabel) {
                        const fx = ox + dx * 0.9;
                        const fy = oy + dy * 0.9;
                        svg += this.renderText(fx + offsetX, fy + offsetY, c.toLabel, 10, "start", "black", true); // Italic
                    }
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
            const isInitialization = d.label.toLowerCase().includes('initialization');
            
            if (isInitialization) {
                const textWidth = d.label.length * 9;
                const midX = (minX + maxX) / 2;
                svg += `<rect x="${midX - textWidth/2 - 5}" y="${d.position.y}" width="${textWidth + 10}" height="${d.size.height}" fill="#EEEEEE" stroke="#A80036" stroke-width="1" />\n`;
                svg += this.renderText(midX, y + 5, d.label, 14, "middle", "#A80036");
                // Double lines on sides
                svg += `<line x1="${minX + 20}" y1="${y - 2}" x2="${midX - textWidth/2 - 10}" y2="${y - 2}" stroke="#A80036" stroke-width="2" />\n`;
                svg += `<line x1="${minX + 20}" y1="${y + 2}" x2="${midX - textWidth/2 - 10}" y2="${y + 2}" stroke="#A80036" stroke-width="2" />\n`;
                svg += `<line x1="${midX + textWidth/2 + 10}" y1="${y - 2}" x2="${maxX - 20}" y2="${y - 2}" stroke="#A80036" stroke-width="2" />\n`;
                svg += `<line x1="${midX + textWidth/2 + 10}" y1="${y + 2}" x2="${maxX - 20}" y2="${y + 2}" stroke="#A80036" stroke-width="2" />\n`;
            } else {
                svg += `<line x1="${minX + 20}" y1="${y}" x2="${maxX - 20}" y2="${y}" stroke="#A80036" stroke-width="2" />\n`;
                svg += `<line x1="${minX + 20}" y1="${y + 4}" x2="${maxX - 20}" y2="${y + 4}" stroke="#A80036" stroke-width="2" />\n`;
                const textWidth = d.label.length * 10;
                svg += `<rect x="${(minX + maxX)/2 - textWidth/2}" y="${d.position.y}" width="${textWidth}" height="${d.size.height}" fill="white" />\n`;
                svg += this.renderText((minX + maxX)/2, y + 5, d.label, 14, "middle", "#A80036");
            }
        });

        // 8. Delays (dots)
        map.delays?.forEach(delay => {
            const midX = (minX + maxX) / 2;
            for (let i = 0; i < 3; i++) {
                svg += `<circle cx="${midX}" cy="${delay.position.y + i * 10}" r="2" fill="#A80036" />\n`;
            }
            if (delay.text) {
                svg += this.renderText(midX + 15, delay.position.y + 15, delay.text, 12, "start", "#A80036", true);
            }
        });

        svg += '</svg>';
        return svg;
    }
}
