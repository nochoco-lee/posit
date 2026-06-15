export interface IROffset {
    start: number;
    end: number;
    layoutStart?: number;
    layoutEnd?: number;
}

export interface IRStatement {
    type: string; 
    offset?: IROffset;
}

export interface IRNode extends IRStatement {
    type: 'node';
    name: string;      // The unique identifier (e.g. EU or UserService)
    origName?: string; // The display label (e.g. "External User")
    shape: string;     // Generic shape term: "class", "interface", "participant", "actor", "database"
    stereotype?: string; // <<stereotype>>
    isCreation?: boolean;
    color?: string;
    visibility?: string;
    layout?: { 
        x: number; 
        y: number 
    };
    // Phase 6: Class Diagram expansion
    members?: IRMember[];
    parents?: string[];
}

export interface IRMember {
    visibility?: string;
    isStatic?: boolean;
    isAbstract?: boolean;
    isField?: boolean;
    isMethod?: boolean;
    name: string;
    type?: string;
    parameters?: string[];
}

export interface IREdge extends IRStatement {
    type: 'edge';
    from: string;      // Name of origin IRNode
    fromLabel?: string; // Cardinality/Multiplicity for origin (e.g., "1")
    to: string;        // Name of target IRNode
    toLabel?: string;   // Cardinality/Multiplicity for target (e.g., "0..*")
    arrow: string;     // Standardized generic arrow string (e.g., '->', '-->', '*--')
    label?: string;    // Text payload attached to the connection
    color?: string;
    isCreation?: boolean;
    isDeletion?: boolean;
    layout?: { 
        x: number; 
        y: number 
    };
}

export interface IRGroup extends IRStatement {
    type: 'group';
    keyword: string;   // 'alt', 'opt', 'loop', 'par'
    label?: string;
    color?: string;
    layout?: {
        x: number;
        y: number;
    };
    sections: {
        label?: string;
        statements: IRStatement[];
    }[];
}

export interface IRNote extends IRStatement {
    type: 'note';
    placement: string; // 'left', 'right', 'over', 'across'
    targets?: string[];
    text: string;
    color?: string;
    layout?: {
        x: number;
        y: number;
    };
}

export interface IRActivation extends IRStatement {
    type: 'activation';
    action: string;    // 'activate', 'deactivate', 'destroy'
    target: string;
    color?: string;
}

export interface IRReturn extends IRStatement {
    type: 'return';
    label?: string;
}

export interface IRAutoactivate extends IRStatement {
    type: 'autoactivate';
    value: boolean;
}

export interface IRAutonumber extends IRStatement {
    type: 'autonumber';
    start?: number;
    step?: number;
    format?: string;
}

export interface IRDivider extends IRStatement {
    type: 'divider';
    label: string;
    layout?: {
        x: number;
        y: number;
    };
}

export interface IRDelay extends IRStatement {
    type: 'delay';
}

export interface IRRef extends IRStatement {
    type: 'ref';
    targets: string[];
    text: string;
    layout?: {
        x: number;
        y: number;
    };
}

export interface IRMainframe extends IRStatement {
    type: 'mainframe';
    label: string;
}

export interface IRContainer extends IRStatement {
    type: 'container';
    keyword: string;   // 'package', 'namespace', 'folder', etc.
    name?: string;
    stereotype?: string;
    color?: string;
    statements: IRStatement[];
}

export interface IRDiagram {
    type: "Diagram";
    syntax: 'plantuml' | 'mermaid';
    diagramType: 'sequence' | 'class' | 'deployment' | 'unknown';
    statements: IRStatement[];
}
