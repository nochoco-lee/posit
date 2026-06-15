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

    private getIntersection(p1: { x: number, y: number }, p2: { x: number, y: number }, rect: { x: number, y: number, width: number, height: number }): { x: number, y: number } {
        const { x, y, width, height } = rect;
        const left = x;
        const right = x + width;
        const top = y;
        const bottom = y + height;

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;

        if (dx === 0 && dy === 0) return p2;

        let tMin = -Infinity;
        let tMax = Infinity;

        if (dx !== 0) {
            const t1 = (left - p1.x) / dx;
            const t2 = (right - p1.x) / dx;
            tMin = Math.max(tMin, Math.min(t1, t2));
            tMax = Math.min(tMax, Math.max(t1, t2));
        } else if (p1.x < left || p1.x > right) return p2;

        if (dy !== 0) {
            const t1 = (top - p1.y) / dy;
            const t2 = (bottom - p1.y) / dy;
            tMin = Math.max(tMin, Math.min(t1, t2));
            tMax = Math.min(tMax, Math.max(t1, t2));
        } else if (p1.y < top || p1.y > bottom) return p2;

        if (tMin <= tMax && tMin >= 0 && tMin <= 1) {
            return { x: p1.x + tMin * dx, y: p1.y + tMin * dy };
        }

        return p2;
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
        }

        // Add padding
        minX -= 40; minY -= 40; maxX += 40; maxY += 40;
        this.width = maxX - minX;
        this.height = maxY - minY;

        let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${this.width}" height="${this.height}" viewBox="${minX} ${minY} ${this.width} ${this.height}">\n`;
        svg += `<rect x="${minX}" y="${minY}" width="${this.width}" height="${this.height}" fill="white" />\n`;

        // 1. Groups (background)
        map.groups.forEach(g => {
            if (g.keyword === 'package' || g.keyword === 'namespace' || g.keyword === 'folder') {
                // Classic package shape with a tab
                const tabWidth = Math.min(g.size.width * 0.4, 100);
                const tabHeight = 20;
                svg += `<path d="M ${g.position.x} ${g.position.y} 
                           L ${g.position.x + tabWidth} ${g.position.y} 
                           L ${g.position.x + tabWidth + 5} ${g.position.y + tabHeight} 
                           L ${g.position.x + g.size.width} ${g.position.y + tabHeight} 
                           L ${g.position.x + g.size.width} ${g.position.y + g.size.height} 
                           L ${g.position.x} ${g.position.y + g.size.height} Z" 
                           fill="${g.color || 'white'}" fill-opacity="0.1" stroke="${g.color || '#A80036'}" stroke-width="2" />\n`;
                svg += this.renderText(g.position.x + tabWidth/2, g.position.y + 14, g.label || "", 11, "middle", g.color || '#A80036');
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
            } else if (n.type === 'node') {
                // 3D Cube for Node
                const offset = 10;
                const w = n.size.width - offset;
                const h = n.size.height - offset;
                const x = n.position.x;
                const y = n.position.y + offset;
                
                svg += `<path d="M ${x} ${y} L ${x+w} ${y} L ${x+w} ${y+h} L ${x} ${y+h} Z" fill="#E2E2F0" stroke="#A80036" stroke-width="1.5" />\n`;
                svg += `<path d="M ${x} ${y} L ${x+offset} ${y-offset} L ${x+w+offset} ${y-offset} L ${x+w} ${y} Z" fill="#F2F2FF" stroke="#A80036" stroke-width="1.5" />\n`;
                svg += `<path d="M ${x+w} ${y} L ${x+w+offset} ${y-offset} L ${x+w+offset} ${y+h-offset} L ${x+w} ${y+h} Z" fill="#D2D2E0" stroke="#A80036" stroke-width="1.5" />\n`;
                const text = n.origName + (n.stereotype ? `\n${n.stereotype}` : "");
                svg += this.renderText(x + w/2, y + h/2 + 5, text, 14);
            } else if (n.type === 'cloud') {
                const x = n.position.x;
                const y = n.position.y;
                const w = n.size.width;
                const h = n.size.height;
                const cx = x + w/2;
                const cy = y + h/2;
                const r = Math.min(w, h) / 3;
                
                svg += `<path d="M ${cx - r*1.5} ${cy} 
                           A ${r} ${r} 0 0 1 ${cx - r*0.5} ${cy - r}
                           A ${r} ${r} 0 0 1 ${cx + r*0.5} ${cy - r}
                           A ${r} ${r} 0 0 1 ${cx + r*1.5} ${cy}
                           A ${r} ${r} 0 0 1 ${cx + r*0.5} ${cy + r}
                           A ${r} ${r} 0 0 1 ${cx - r*0.5} ${cy + r}
                           A ${r} ${r} 0 0 1 ${cx - r*1.5} ${cy} Z" 
                           fill="#E2E2F0" stroke="#A80036" stroke-width="1.5" />\n`;
                const text = n.origName + (n.stereotype ? `\n${n.stereotype}` : "");
                svg += this.renderText(cx, cy + 5, text, 14);
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
                        const fields = n.members.filter((m: any) => m.isField);
                        const methods = n.members.filter((m: any) => m.isMethod);
                        let currentY = n.position.y + 45;

                        fields.forEach((m: any) => {
                            let mText = `${m.visibility || ""} ${m.isStatic ? "{static} " : ""}${m.isAbstract ? "{abstract} " : ""}${m.name}${m.type ? " : " + m.type : ""}`;
                            svg += this.renderText(n.position.x + 5, currentY, mText, 10, "start", "black");
                            currentY += 18;
                        });

                        if (fields.length > 0 && methods.length > 0) {
                            svg += `<line x1="${n.position.x}" y1="${currentY - 5}" x2="${n.position.x + n.size.width}" y2="${currentY - 5}" stroke="#A80036" stroke-width="1" />\n`;
                            currentY += 5;
                        }

                        methods.forEach((m: any) => {
                            let mText = `${m.visibility || ""} ${m.isStatic ? "{static} " : ""}${m.isAbstract ? "{abstract} " : ""}${m.name}(${m.parameters?.join(", ") || ""})${m.type ? " : " + m.type : ""}`;
                            svg += this.renderText(n.position.x + 5, currentY, mText, 10, "start", "black");
                            currentY += 18;
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
            const isSequence = map.diagramType === "sequence";
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

                const startPt = this.getIntersection({ x: tCenterX, y: tCenterY }, { x: oCenterX, y: oCenterY }, oRect);
                const endPt = this.getIntersection({ x: oCenterX, y: oCenterY }, { x: tCenterX, y: tCenterY }, tRect);

                ox = startPt.x; oy = startPt.y;
                tx = endPt.x; ty = endPt.y;
            }
            
            const isDotted = c.type.includes("..");
            const isDashed = c.type.includes("--");
            const strokeDash = isDotted ? 'stroke-dasharray="2,2"' : isDashed ? 'stroke-dasharray="8,4"' : "";
            
            if (c.from === c.to && isSequence) {
                const path = `M ${ox} ${oy} L ${ox + 30} ${oy} L ${ox + 30} ${oy + 20} L ${ox + 7} ${oy + 20}`;
                svg += `<path d="${path}" fill="none" stroke="#A80036" stroke-width="2" ${strokeDash} />\n`;
                svg += `<path d="M ${ox + 12} ${oy + 16} L ${ox + 5} ${oy + 20} L ${ox + 12} ${oy + 24} Z" fill="#A80036" />\n`;
                if (c.label) {
                    svg += this.renderText(ox + 35, oy + 10, c.label, 12, "start");
                }
            } else {
                svg += `<line x1="${ox}" y1="${oy}" x2="${tx}" y2="${ty}" stroke="#A80036" stroke-width="2" ${strokeDash} />\n`;
                
                const drawHead = (x: number, y: number, fromX: number, fromY: number, direction: number, type: string, isStart: boolean) => {
                    const angle = Math.atan2(y - fromY, x - fromX);
                    const headStr = isStart ? type.split(/[-.=]+/)[0] : type.split(/[-.=]+/)[type.split(/[-.=]+/).length - 1];
                    
                    if (isSequence) {
                        const isLost = headStr.includes("x");
                        const isCircle = headStr.includes("o");
                        const isHalfTop = headStr.includes("\\");
                        const isHalfBottom = headStr.includes("/");
                        const isAsync = headStr.includes(">>") || (!headStr.includes(">") && (isHalfTop || isHalfBottom));
                        const isFullOpen = headStr.includes(">>") || (headStr.includes(">") && !headStr.includes("|>") && !isLost && !isCircle);

                        if (isLost) {
                            svg += `<line x1="${x - 5}" y1="${y - 5}" x2="${x + 5}" y2="${y + 5}" stroke="#A80036" stroke-width="2" />\n`;
                            svg += `<line x1="${x + 5}" y1="${y - 5}" x2="${x - 5}" y2="${y + 5}" stroke="#A80036" stroke-width="2" />\n`;
                            return;
                        }

                        let currentX = x;
                        if (isCircle) {
                            svg += `<circle cx="${x - 5 * direction}" cy="${y}" r="5" fill="white" stroke="#A80036" stroke-width="2" />\n`;
                            currentX -= 10 * direction;
                        }

                        if (isHalfTop) {
                            svg += `<line x1="${currentX - 10 * direction}" y1="${y - 5}" x2="${currentX}" y2="${y}" stroke="#A80036" stroke-width="2" />\n`;
                        } else if (isHalfBottom) {
                            svg += `<line x1="${currentX - 10 * direction}" y1="${y + 5}" x2="${currentX}" y2="${y}" stroke="#A80036" stroke-width="2" />\n`;
                        } else if (isFullOpen || isAsync) {
                            svg += `<path d="M ${currentX - 10 * direction} ${y - 5} L ${currentX} ${y} L ${currentX - 10 * direction} ${y + 5}" fill="none" stroke="#A80036" stroke-width="2" />\n`;
                        } else if (headStr.includes(">") || headStr.includes("<")) {
                            const headPath = `M ${currentX - 10 * direction} ${y - 5} L ${currentX} ${y} L ${currentX - 10 * direction} ${y + 5} Z`;
                            svg += `<path d="${headPath}" fill="#A80036" />\n`;
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
                            svg += `<path d="M ${x} ${y} L ${p1x} ${p1y} L ${p2x} ${p2y} Z" fill="white" stroke="#A80036" stroke-width="1.5" />\n`;
                        } else if (headType === "compose" || headType === "aggregate") {
                            const p1x = x - size * dx - size * 0.6 * px;
                            const p1y = y - size * dy - size * 0.6 * py;
                            const p2x = x - size * 2 * dx;
                            const p2y = y - size * 2 * dy;
                            const p3x = x - size * dx + size * 0.6 * px;
                            const p3y = y - size * dy + size * 0.6 * py;
                            const fill = headType === "compose" ? "#A80036" : "white";
                            svg += `<path d="M ${x} ${y} L ${p1x} ${p1y} L ${p2x} ${p2y} L ${p3x} ${p3y} Z" fill="${fill}" stroke="#A80036" stroke-width="1.5" />\n`;
                        } else if (headType === "nav") {
                            const p1x = x - size * dx - size * px;
                            const p1y = y - size * dy - size * py;
                            const p2x = x - size * dx + size * px;
                            const p2y = y - size * dy + size * py;
                            svg += `<path d="M ${p1x} ${p1y} L ${x} ${y} L ${p2x} ${p2y}" fill="none" stroke="#A80036" stroke-width="2" />\n`;
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
                    if (c.fromLabel) {
                        const fx = ox + (tx - ox) * 0.2;
                        const fy = oy + (ty - oy) * 0.2;
                        svg += this.renderText(fx + 10, fy - 5, c.fromLabel, 10, "start");
                    }
                    if (c.toLabel) {
                        const fx = ox + (tx - ox) * 0.8;
                        const fy = oy + (ty - oy) * 0.8;
                        svg += this.renderText(fx + 10, fy - 5, c.toLabel, 10, "start");
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
