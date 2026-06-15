export const POS_COMMENT_REGEX = /@pos\s*\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/;

export const formatPosComment = (x: number, y: number, syntax: 'plantuml' | 'mermaid') =>
    syntax === 'mermaid' ? ` %% @pos(${Math.round(x)}, ${Math.round(y)})` : ` /' @pos(${Math.round(x)}, ${Math.round(y)}) '/`;
