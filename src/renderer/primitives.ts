/**
 * Shared rendering calculations, utilities, and constants for Posit Diagramming Engine.
 */

export const THEME = {
    stroke: '#A80036',
    nodeFill: '#FEFECE',
    noteFill: '#FBFB77',
    headerFill: '#EEEEEE',
    sequenceFill: '#E2E2F0',
    activationFill: '#E2E2F0',
    boxFill: '#DDDDDD'
};

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
