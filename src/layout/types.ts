export interface Size {
    width: number;
    height: number;
}

export interface Position {
    x: number;
    y: number;
}

export interface LayoutNode {
    id: string; // "Alice" or "UserService"
    type: string; // "class", "interface", "participant", "actor"
    origName: string; // Original parsed name
    stereotype?: string;
    position: Position;
    size: Size;
    members?: any[]; // IRMember[]
    // Sequence-specific properties
    lifelineX?: number; 
    lifelineY?: number;
    color?: string;
    isCreate?: boolean;
    isDestroy?: boolean;
}

export interface LayoutConnection {
    from: string; // id
    fromLabel?: string;
    to: string; // id
    toLabel?: string;
    type: string; // arrow type e.g. "->", "*--"
    label: string | null | undefined;
    number?: string; // Autonumber
    position: Position | null; // Optional waypoint /pos metadata
    calculatedY?: number; // Internal calculated Y for sequence diagrams
}

export interface LayoutActivation {
    type: 'activation';
    nodeId: string;
    startPosition: Position;
    size: Size;
    startMessageIndex?: number;
    endMessageIndex?: number;
    isDestroy?: boolean;
    depth?: number;
}

export interface LayoutNote {
    type: 'note';
    placement: string;
    targets: string[];
    text: string;
    position: Position;
    size: Size;
}

export interface LayoutGroup {
    type: 'group';
    id: string;
    keyword: string;
    label: string;
    stereotype?: string;
    sections: {
        label?: string;
        statements: any[]; // Recursive IRStatement or Layout equivalent
    }[];
    position: Position;
    size: Size;
    dividerYs: number[]; // Y-offsets relative to group position or absolute
    color?: string;
    participants?: string[];
}

export interface LayoutDivider {
    type: 'divider';
    label: string;
    position: Position;
    size: Size;
}

export interface LayoutDelay {
    type: 'delay';
    text?: string;
    position: Position;
}

export interface LayoutMap {
    diagramType: 'sequence' | 'class' | 'deployment' | 'unknown';
    nodes: Record<string, LayoutNode>;
    connections: LayoutConnection[];
    notes: LayoutNote[];
    groups: LayoutGroup[];
    activations?: LayoutActivation[];
    dividers?: LayoutDivider[];
    delays?: LayoutDelay[];
}

export const DEFAULTS = {
    // Default sizes
    PARTICIPANT_WIDTH: 100,
    PARTICIPANT_HEIGHT: 50,
    CLASS_WIDTH: 150,
    CLASS_HEIGHT: 80,
    NOTE_WIDTH: 120,
    NOTE_HEIGHT: 40,

    // Starting origins
    SEQUENCE_START_X: 100,
    SEQUENCE_START_Y: 100,

    CLASS_START_X: 100,
    CLASS_START_Y: 100,

    // Paddings
    ACTOR_PADDING_X: 150,
    CLASS_PADDING_Y: 150,
    NOTE_PADDING_Y: 30,
    SEQUENCE_MIN_Y_GAP: 40,
    SEQUENCE_DEFAULT_Y_STEP: 60,
    DIVIDER_HEIGHT: 30
};
