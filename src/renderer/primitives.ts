/**
 * Shared rendering calculations, utilities, and constants for Posit Diagramming Engine.
 *
 * `THEME` is mutable — it is populated by `syncThemeFromCSS()` which reads
 * CSS custom properties from `document.documentElement`. All renderers
 * (Konva canvas + SVG) read from this single object.
 */

import { readThemeFromCSS, parseShadow } from "./themes";

export const THEME = {
    stroke: '#4A5568',
    nodeFill: '#FFFFFF',
    noteFill: '#FFFDE7',
    headerFill: '#EDF2F7',
    sequenceFill: '#EBF4FF',
    activationFill: '#EBF4FF',
    boxFill: '#E2E8F0',
    text: '#1A202C',
    bg: '#F7FAFC',
    nodeRadius: 6,
    noteRadius: 4,
    shadowColor: 'rgba(0,0,0,0.08)',
    shadowBlur: 8,
    shadowOffsetX: 0,
    shadowOffsetY: 2,
    shadowOpacity: 0.08,
    strokeWidth: 1.5,
    fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
    fontSize: 14,
    boxTop: '#E8EDF4',
    boxSide: '#D4DBE8',
    arrowFill: '#4A5568',
    // New structural parameters loaded from theme CSS
    fontWeightHeader: '600',
    fontWeightBody: 'normal',
    actorStrokeWidth: 2.0,
    connectionStrokeWidth: 1.5,
    nodeBorderDash: undefined as number[] | undefined,
    lifelineDash: [5, 5] as number[] | undefined,
};

function parseDashPattern(dashStr: string): number[] | undefined {
    if (!dashStr || dashStr.trim() === 'none') return undefined;
    const parts = dashStr.split(',').map(p => parseFloat(p.trim()));
    if (parts.some(isNaN)) return undefined;
    return parts;
}

/**
 * Read CSS custom properties into the mutable THEME object.
 * Call this before each render cycle or when the theme changes.
 */
export function syncThemeFromCSS() {
    const t = readThemeFromCSS();
    THEME.stroke = t['--pos-stroke'];
    THEME.nodeFill = t['--pos-node-fill'];
    THEME.noteFill = t['--pos-note-fill'];
    THEME.headerFill = t['--pos-header-fill'];
    THEME.sequenceFill = t['--pos-sequence-fill'];
    THEME.activationFill = t['--pos-activation-fill'];
    THEME.boxFill = t['--pos-box-fill'];
    THEME.text = t['--pos-text'];
    THEME.bg = t['--pos-bg'];
    THEME.nodeRadius = parseFloat(t['--pos-node-radius']) || 6;
    THEME.noteRadius = parseFloat(t['--pos-note-radius']) || 4;
    THEME.strokeWidth = parseFloat(t['--pos-stroke-width']) || 1.5;
    THEME.fontFamily = t['--pos-font-family'];
    THEME.fontSize = parseFloat(t['--pos-font-size']) || 14;
    THEME.boxTop = t['--pos-box-top'];
    THEME.boxSide = t['--pos-box-side'];
    THEME.arrowFill = t['--pos-arrow-fill'];
    
    // Sync the new properties
    THEME.fontWeightHeader = t['--pos-font-weight-header'] || '600';
    THEME.fontWeightBody = t['--pos-font-weight-body'] || 'normal';
    THEME.actorStrokeWidth = parseFloat(t['--pos-actor-stroke-width']) || 2.0;
    THEME.connectionStrokeWidth = parseFloat(t['--pos-connection-stroke-width']) || 1.5;
    THEME.nodeBorderDash = parseDashPattern(t['--pos-node-border-dash']);
    THEME.lifelineDash = parseDashPattern(t['--pos-lifeline-dash']);

    const shadow = parseShadow(t['--pos-shadow']);
    if (shadow) {
        THEME.shadowColor = shadow.shadowColor;
        THEME.shadowBlur = shadow.shadowBlur;
        THEME.shadowOffsetX = shadow.shadowOffsetX;
        THEME.shadowOffsetY = shadow.shadowOffsetY;
        THEME.shadowOpacity = shadow.shadowOpacity;
    } else {
        // Clear shadow config if set to none/null
        THEME.shadowColor = 'transparent';
        THEME.shadowBlur = 0;
        THEME.shadowOffsetX = 0;
        THEME.shadowOffsetY = 0;
        THEME.shadowOpacity = 0;
    }
}

/**
 * Calculates the intersection point between a line segment and a rectangle boundary.
 * Used for routing connection lines cleanly to node edges.
 */
export function getIntersection(
    p1: { x: number; y: number },
    p2: { x: number; y: number },
    rect: { x: number; y: number; width: number; height: number }
): { x: number; y: number } {
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

/**
 * Formats a class member object visibility and descriptors into its standard UML text format.
 */
export function getMemberText(member: any): string {
    let memberText = "";
    const v = member.visibility;
    if (v === "+" || v === "-" || v === "#" || v === "~") memberText += v + " ";
    else if (v === "public") memberText += "+ ";
    else if (v === "private") memberText += "- ";
    else if (v === "protected") memberText += "# ";
    else if (v === "package") memberText += "~ ";
    else if (v) memberText += v + " ";

    if (member.isStatic) memberText += "{static} ";
    if (member.isAbstract) memberText += "{abstract} ";
    memberText += member.name;
    if (member.parameters) memberText += "(" + member.parameters.join(", ") + ")";
    if (member.type) memberText += " : " + member.type;
    return memberText;
}
