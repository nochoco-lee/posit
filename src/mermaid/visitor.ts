import { CstNode, IToken } from "chevrotain";
import { IRDiagram, IREdge, IRNode, IRStatement } from "../ir/types";
import { parser } from "./parser";

const BaseVisitor = parser.getBaseCstVisitorConstructor();

export class MermaidAstVisitor extends BaseVisitor {
    private aliasMap: Map<string, string> = new Map();
    private implicitNodes: Map<string, string> = new Map();
    private subgraphNames: Set<string> = new Set();

    constructor() {
        super();
        this.validateVisitor();
    }

    diagram(ctx: any): IRDiagram {
        this.aliasMap.clear();
        this.implicitNodes.clear();
        this.subgraphNames.clear();
        let statements: any[] = [];
        if (ctx.sequenceStatement) {
            statements = ctx.sequenceStatement.map((s: any) => this.visit(s));
        } else if (ctx.classStatement) {
            statements = ctx.classStatement.map((s: any) => this.visit(s));
        } else if (ctx.flowchartStatement) {
            statements = ctx.flowchartStatement.map((s: any) => this.visit(s));
        }
        
        const flatStatements = statements.filter((s: any) => s).flat();
        
        // Emit implicit nodes from shape suffixes (e.g., C{Decision} --> D)
        // Only emit if not already declared explicitly
        const declaredNames = new Set<string>();
        flatStatements.forEach((s: any) => {
            if (s && s.type === 'node') declaredNames.add(s.name);
        });
        this.implicitNodes.forEach((shape, name) => {
            if (!declaredNames.has(name) && !this.subgraphNames.has(name)) {
                flatStatements.unshift({
                    type: "node",
                    shape,
                    name,
                    origName: name,
                    layout: undefined
                });
            }
        });
        
        let diagramType: 'sequence' | 'class' | 'deployment' | 'unknown' = "unknown";
        if (ctx.SequenceDiagramHdr) diagramType = "sequence";
        else if (ctx.ClassDiagramHdr) diagramType = "class";
        else if (ctx.FlowchartHdr) diagramType = "deployment";

        return {
            type: "Diagram",
            syntax: "mermaid",
            diagramType,
            statements: flatStatements,
        };
    }

    sequenceStatement(ctx: any): IRStatement | IRStatement[] | null {
        return this.visitStatement(ctx);
    }

    classStatement(ctx: any): IRStatement | IRStatement[] | null {
        return this.visitStatement(ctx);
    }

    flowchartStatement(ctx: any): IRStatement | IRStatement[] | null {
        return this.visitStatement(ctx);
    }

    private visitStatement(ctx: any): IRStatement | IRStatement[] | null {
        if (ctx.participantDeclaration) return this.visit(ctx.participantDeclaration[0]);
        if (ctx.classDeclaration) return this.visit(ctx.classDeclaration[0]);
        if (ctx.activateDeclaration) return this.visit(ctx.activateDeclaration[0]);
        if (ctx.noteDeclaration) return this.visit(ctx.noteDeclaration[0]);
        if (ctx.blockDeclaration) return this.visit(ctx.blockDeclaration[0]);
        if (ctx.connectionDeclaration) return this.visit(ctx.connectionDeclaration[0]);
        if (ctx.flowchartNodeDeclaration) return this.visit(ctx.flowchartNodeDeclaration[0]);
        if (ctx.subgraphDeclaration) return this.visit(ctx.subgraphDeclaration[0]);
        if (ctx.memberDeclaration) return this.visit(ctx.memberDeclaration[0]);
        if (ctx.namespaceDeclaration) return this.visit(ctx.namespaceDeclaration[0]);
        if (ctx.styleDeclaration) return this.visit(ctx.styleDeclaration[0]);
        if (ctx.callbackDeclaration) return this.visit(ctx.callbackDeclaration[0]);
        if (ctx.classDefDeclaration) return this.visit(ctx.classDefDeclaration[0]);
        if (ctx.flowchartClassDeclaration) return this.visit(ctx.flowchartClassDeclaration[0]);
        if (ctx.stereotypeDeclaration) return this.visit(ctx.stereotypeDeclaration[0]);
        if (ctx.Autonumber) return { type: "autonumber" } as any;
        if (ctx.PosComment) return null; 
        return null;
    }

    genericName(ctx: any): string {
        const children = Object.values(ctx).flat() as any[];
        return children.map(c => {
            if (c.image) return c.image;
            return this.visit(c);
        }).join(" ");
    }

    participantDeclaration(ctx: any): IRNode | null {
        const isCreate = !!ctx.Create;
        const isDestroy = !!ctx.Destroy;

        // `destroy Carl` without participant/actor keyword should not create a new node
        if (isDestroy && !ctx.Participant && !ctx.Actor) {
            return null;
        }

        const shape = ctx.Participant ? "participant" : "actor";
        const name = this.visit(ctx.name[0]);
        if (ctx.metadata) this.visit(ctx.metadata[0]);
        const alias = ctx.alias ? this.visit(ctx.alias[0]) : name;
        const label = ctx.label ? this.visit(ctx.label[0]) : alias;

        if (name !== alias) {
            this.aliasMap.set(name, alias);
        }
        
        const node: IRNode = {
            type: "node",
            shape,
            name: alias,
            origName: label,
            isCreate,
            isDestroy,
            layout: undefined
        } as any;

        if (ctx.layout) {
            const pos = this.parsePosComment(ctx.layout[0].image);
            if (pos) node.layout = pos;
        }

        return node;
    }

    activateDeclaration(ctx: any): IRStatement {
        const isActivate = !!ctx.Activate;
        const name = this.visit(ctx.name[0]);
        return {
            type: "activation",
            target: name,
            action: isActivate ? 'activate' : 'deactivate'
        } as any;
    }

    noteDeclaration(ctx: any): IRStatement {
        let placement: string = "over";
        if (ctx.RightOf) placement = "right of";
        else if (ctx.LeftOf) placement = "left of";
        
        const target = ctx.target ? this.visit(ctx.target[0]) : "";
        let text = "";
        if (ctx.text) {
            text = this.visit(ctx.text[0]);
        } else if (ctx.textName) {
            text = this.visit(ctx.textName[0]);
        }

        return {
            type: "note",
            placement,
            target,
            text
        } as any;
    }

    blockDeclaration(ctx: any): IRStatement {
        const keywordToken = (ctx.Loop || ctx.Alt || ctx.Opt || ctx.Par || ctx.Rect || ctx.Box || ctx.Critical || ctx.Break)[0];
        const keyword = keywordToken.image.toLowerCase();
        const label = ctx.label ? this.visit(ctx.label[0]) : "";
        
        const sections: { label?: string; statements: any[] }[] = [];
        
        // Helper to find first token offset in a CST node
        const findFirstOffset = (node: any): number => {
            if (!node) return Infinity;
            if (node.startOffset !== undefined) return node.startOffset;
            if (node.children) {
                for (const val of Object.values(node.children)) {
                    if (Array.isArray(val)) {
                        for (const v of val) {
                            if (v && typeof v === 'object') {
                                const off = findFirstOffset(v);
                                if (off < Infinity) return off;
                            }
                        }
                    } else if (val && typeof val === 'object') {
                        const off = findFirstOffset(val);
                        if (off < Infinity) return off;
                    }
                }
            }
            return Infinity;
        };
        
        // Collect separator tokens and their offsets
        const separators: { offset: number; label: string }[] = [];
        const allSeps: any[] = [
            ...(ctx.Else || []),
            ...(ctx.And || []),
            ...(ctx.Option || [])
        ];
        allSeps.sort((a: any, b: any) => a.startOffset - b.startOffset);
        
        // elseLabel corresponds 1:1 with separator tokens
        const labels: string[] = [];
        if (ctx.elseLabel) {
            ctx.elseLabel.forEach((el: any) => labels.push(this.visit(el)));
        }
        
        for (let i = 0; i < allSeps.length; i++) {
            separators.push({ offset: allSeps[i].startOffset, label: labels[i] || "" });
        }
        
        if (separators.length === 0) {
            // No separators - all statements in one section
            if (ctx.sequenceStatement) {
                const stmts = ctx.sequenceStatement.map((s: any) => this.visit(s)).filter((s: any) => s).flat();
                sections.push({ label, statements: stmts });
            } else {
                sections.push({ label, statements: [] });
            }
        } else {
            // Split statements by separator offsets
            if (ctx.sequenceStatement) {
                const stmtOffsets: { cst: any; offset: number }[] = ctx.sequenceStatement.map((s: any) => ({
                    cst: s,
                    offset: findFirstOffset(s)
                }));
                
                // Initialize section arrays
                const sectionStmts: any[][] = [[]];
                for (let i = 0; i < separators.length; i++) sectionStmts.push([]);
                
                for (const { cst, offset } of stmtOffsets) {
                    let sectionIdx = 0;
                    for (let i = 0; i < separators.length; i++) {
                        if (offset > separators[i].offset) {
                            sectionIdx = i + 1;
                        } else {
                            break;
                        }
                    }
                    const visited = this.visit(cst);
                    if (visited) {
                        if (Array.isArray(visited)) {
                            sectionStmts[sectionIdx].push(...visited);
                        } else {
                            sectionStmts[sectionIdx].push(visited);
                        }
                    }
                }
                
                sections.push({ label, statements: sectionStmts[0] });
                for (let i = 0; i < separators.length; i++) {
                    sections.push({ label: separators[i].label, statements: sectionStmts[i + 1] });
                }
            } else {
                sections.push({ label, statements: [] });
            }
        }
        
        return {
            type: "group",
            keyword,
            label,
            sections
        } as any;
    }

    classDeclaration(ctx: any): IRNode {
        const shape = ctx.Class ? "class" : "interface";
        const name = this.visit(ctx.name[0]);
        
        const members: any[] = [];
        if (ctx.classMemberLine) {
            ctx.classMemberLine.forEach((m: any) => {
                const member = this.visit(m);
                if (member) members.push(member);
            });
        }
        if (ctx.memberDeclaration) {
            ctx.memberDeclaration.forEach((m: any) => {
                const member = this.visit(m);
                if (member) members.push(member);
            });
        }

        const node: IRNode = {
            type: "node",
            shape,
            name,
            members,
            offset: { start: 0, end: 0 },
            layout: undefined
        };

        if (ctx.layout) {
            const pos = this.parsePosComment(ctx.layout[0].image);
            if (pos) node.layout = pos;
        }

        return node;
    }

    classMemberLine(ctx: any): any {
        let visibility: string | undefined = undefined;
        if (ctx.Plus) visibility = "+";
        else if (ctx.Minus) visibility = "-";
        else if (ctx.Hash) visibility = "#";
        else if (ctx.Tilde) visibility = "~";

        const textParts = ctx.anyToken ? ctx.anyToken.map((t: any) => this.visit(t)) : [];
        const fullName = textParts.join(" ").trim();
        
        const isMethod = fullName.includes("(");
        
        return {
            name: fullName,
            visibility,
            isMethod,
            isField: !isMethod
        };
    }

    memberDeclaration(ctx: any): IRStatement {
        const className = this.visit(ctx.className[0]);
        const member = this.visit(ctx.classMemberLine[0]);
        
        return {
            type: "member",
            className,
            member
        } as any;
    }

    nodeShapeSuffix(ctx: any): { label: string, shape: string } {
        const label = ctx.payload ? this.visit(ctx.payload[0]) : "";
        let shape = "box";
        if (ctx.LBrace) shape = "diamond";
        else if (ctx.LBracket) shape = "square";
        else if (ctx.LParen) shape = "rounded";
        else if (ctx.LShape) {
            const img = ctx.LShape[0].image;
            if (img === "[[") shape = "subroutine";
            else if (img === "((") shape = "circle";
            else if (img === "(((") shape = "double-circle";
            else if (img === "{{") shape = "hexagon";
            else if (img === "([") shape = "stadium";
            else if (img === "[/") shape = "parallelogram";
            else if (img === "[\\") shape = "parallelogram_inv";
            else shape = "node";
        }
        return { label, shape };
    }

    connectionDeclaration(ctx: any): IREdge[] {
        const edges: IREdge[] = [];
        let currentFromRaw = this.visit(ctx.from[0]);
        let currentFrom = this.aliasMap.get(currentFromRaw) || currentFromRaw;

        // Check if from node has a shape suffix (e.g., C{Decision} --> D)
        if (ctx.nodeShapeSuffix && ctx.nodeShapeSuffix[0]) {
            const suffix = this.visit(ctx.nodeShapeSuffix[0]);
            if (!this.implicitNodes.has(currentFrom)) {
                this.implicitNodes.set(currentFrom, suffix.shape);
            }
        }

        if (ctx.to) {
            ctx.to.forEach((t: any, i: number) => {
                const toRaw = this.visit(t);
                const to = this.aliasMap.get(toRaw) || toRaw;
                const arrow = (ctx.arrow2 && ctx.arrow2[0]) ? ctx.arrow2[0].image : ctx.arrow[i].image;
                
                // Check if to node has a shape suffix (e.g., A --> B{Decision})
                if (ctx.nodeShapeSuffix && ctx.nodeShapeSuffix[i + 1]) {
                    const suffix = this.visit(ctx.nodeShapeSuffix[i + 1]);
                    if (!this.implicitNodes.has(to)) {
                        this.implicitNodes.set(to, suffix.shape);
                    }
                }
                
                let label: string | undefined = undefined;
                if (ctx.inlineLabel && i === 0) label = ctx.inlineLabel[0].image;
                if (ctx.edgeLabel && ctx.edgeLabel[i]) label = this.visit(ctx.edgeLabel[i]);
                if (ctx.edgeLabel2 && i === ctx.to.length - 1) label = this.visit(ctx.edgeLabel2[0]);
                if (ctx.payload && i === ctx.to.length - 1) label = this.visit(ctx.payload[0]);

                const edge: IREdge = {
                    type: "edge",
                    from: currentFrom,
                    to: to,
                    arrow,
                    label: label || "",
                    offset: { start: 0, end: 0 },
                    layout: undefined
                };
                
                if (ctx.layout) {
                    const pos = this.parsePosComment(ctx.layout[0].image);
                    if (pos) {
                        edge.layout = pos as any;
                    }
                }

                edges.push(edge);
                currentFrom = to;
            });
        }

        return edges;
    }

    flowchartNodeDeclaration(ctx: any): IRNode {
        const id = this.visit(ctx.id[0]);
        let label = id;
        let shape = "box";
        if (ctx.styleClass) {
            const styleClass = this.visit(ctx.styleClass[0]);
            label = `${id}:::${styleClass}`;
        }
        if (ctx.label) {
            label = this.visit(ctx.label[0]);
            if (ctx.LBrace) {
                shape = "diamond";
            } else if (ctx.LBracket) {
                shape = "square";
            } else if (ctx.LParen) {
                shape = "rounded";
            } else if (ctx.LShape) {
                const shapeImage = ctx.LShape[0].image;
                if (shapeImage === "[[") shape = "subroutine";
                else if (shapeImage === "((") shape = "circle";
                else if (shapeImage === "(((") shape = "double-circle";
                else if (shapeImage === "{{") shape = "hexagon";
                else if (shapeImage === "([") shape = "stadium";
                else if (shapeImage === "[/") shape = "parallelogram";
                else if (shapeImage === "[\\") shape = "parallelogram_inv";
                else shape = "node";
            }
        }
        const node: IRNode = {
            type: "node",
            shape: shape,
            name: id,
            origName: label,
            layout: undefined
        };

        if (ctx.layout) {
            const pos = this.parsePosComment(ctx.layout[0].image);
            if (pos) node.layout = pos;
        }

        return node;
    }

    subgraphDeclaration(ctx: any): IRStatement {
        const id = this.visit(ctx.id[0]);
        const label = ctx.label ? this.visit(ctx.label[0]) : id;
        this.subgraphNames.add(id);
        
        let statements: any[] = [];
        if (ctx.flowchartStatement) {
            statements = ctx.flowchartStatement.map((s: any) => this.visit(s)).filter((s: any) => s).flat();
        }

        return {
            type: "group",
            keyword: "subgraph",
            label,
            sections: [{ label, statements }]
        } as any;
    }

    namespaceDeclaration(ctx: any): IRStatement {
        const name = this.visit(ctx.name[0]);
        
        let statements: any[] = [];
        if (ctx.classStatement) {
            statements = ctx.classStatement.map((s: any) => this.visit(s)).filter((s: any) => s).flat();
        }

        const sections = [{ label: name, statements }];

        return {
            type: "group",
            keyword: "namespace",
            label: name,
            sections
        } as any;
    }

    styleDeclaration(ctx: any): null {
        return null;
    }

    callbackDeclaration(ctx: any): null {
        return null;
    }

    classDefDeclaration(ctx: any): null {
        return null;
    }

    flowchartClassDeclaration(ctx: any): null {
        return null;
    }

    stereotypeDeclaration(ctx: any): null {
        return null;
    }

    ignoredStatement(ctx: any): null {
        return null;
    }

    anyToken(ctx: any): string | null {
        const firstEntry = Object.values(ctx)[0] as any[];
        if (!firstEntry) return null;
        const actualToken = firstEntry[0];
        if (actualToken.tokenType) return actualToken.image;
        return this.visit(actualToken);
    }

    metadata(ctx: any): null {
        return null;
    }

    payload(ctx: any): string {
        if (!ctx.anyToken) return "";
        const parts = ctx.anyToken.map((t: any) => this.visit(t));
        return parts.join(" ").trim();
    }

    private parsePosComment(commentStr: string) {
        const match = commentStr.match(/@pos\s*\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/);
        if (match) {
            return {
                x: parseInt(match[1], 10),
                y: parseInt(match[2], 10),
            };
        }
        return undefined;
    }
}

export const visitor = new MermaidAstVisitor();
