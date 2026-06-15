import { CstNode, IToken } from "chevrotain";
import { IRDiagram, IREdge, IRNode, IRStatement } from "../ir/types";
import { parser } from "./parser";

const BaseVisitor = parser.getBaseCstVisitorConstructor();

export class MermaidAstVisitor extends BaseVisitor {
    constructor() {
        super();
        this.validateVisitor();
    }

    diagram(ctx: any): IRDiagram {
        let statements: any[] = [];
        if (ctx.MANY1) {
            statements = ctx.MANY1.map((m: any) => {
                const inner = m.children;
                if (inner.sequenceStatement) return this.visit(inner.sequenceStatement[0]);
                return null;
            });
        } else if (ctx.MANY2) {
            statements = ctx.MANY2.map((m: any) => {
                const inner = m.children;
                if (inner.classStatement) return this.visit(inner.classStatement[0]);
                return null;
            });
        } else if (ctx.MANY3) {
            statements = ctx.MANY3.map((m: any) => {
                const inner = m.children;
                if (inner.flowchartStatement) return this.visit(inner.flowchartStatement[0]);
                return null;
            });
        }
        
        const flatStatements = statements.filter((s: any) => s).flat();
        
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
        if (ctx.Autonumber) return { type: "autonumber" } as any;
        return null;
    }

    genericName(ctx: any): string {
        const token = (ctx.Identifier || ctx.StringLiteral || ctx.BacktickIdentifier || ctx.Word)[0];
        let name = token.image;
        if (token.tokenType.name === "StringLiteral") {
            name = name.substring(1, name.length - 1).replace(/\\"/g, '"');
        } else if (token.tokenType.name === "BacktickIdentifier") {
            name = name.substring(1, name.length - 1);
        }
        return name;
    }

    participantDeclaration(ctx: any): IRNode {
        const shape = ctx.Participant ? "participant" : "actor";
        const name = this.visit(ctx.name[0]);
        if (ctx.metadata) this.visit(ctx.metadata[0]);
        const alias = ctx.alias ? this.visit(ctx.alias[0]) : name;
        const label = ctx.label ? this.visit(ctx.label[0]) : alias;

        const isCreate = !!ctx.Create;
        const isDestroy = !!ctx.Destroy;
        
        return {
            type: "node",
            shape,
            name: alias,
            origName: label,
            isCreate,
            isDestroy
        } as any;
    }

    activateDeclaration(ctx: any): IRStatement {
        const isActivate = !!ctx.Activate;
        const name = this.visit(ctx.name[0]);
        return {
            type: "activation",
            nodeId: name,
            isActivate
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
        const keywordToken = (ctx.Loop || ctx.Alt || ctx.Opt || ctx.Par || ctx.Rect || ctx.Box)[0];
        const keyword = keywordToken.image.toLowerCase();
        const label = ctx.label ? this.visit(ctx.label[0]) : "";
        
        let statements: any[] = [];
        if (ctx.MANY1) {
            statements = ctx.MANY1.map((m: any) => {
                const inner = m.children;
                if (inner.sequenceStatement) return this.visit(inner.sequenceStatement[0]);
                return null;
            }).filter((s: any) => s).flat();
        }
        
        if (ctx.Else || ctx.And) {
            if (ctx.MANY3) {
                const extra = ctx.MANY3.map((m: any) => {
                    const inner = m.children;
                    if (inner.sequenceStatement) return this.visit(inner.sequenceStatement[0]);
                    return null;
                }).filter((s: any) => s).flat();
                statements.push(...extra);
            }
        }

        return {
            type: "group",
            keyword,
            label,
            statements
        } as any;
    }

    classDeclaration(ctx: any): IRNode {
        const shape = ctx.Class ? "class" : "interface";
        const name = this.visit(ctx.name[0]);
        
        const members: any[] = [];
        if (ctx.MANY) {
            ctx.MANY.forEach((m: any) => {
                const inner = m.children;
                if (inner.classMemberLine) {
                    const member = this.visit(inner.classMemberLine[0]);
                    if (member) members.push(member);
                }
                if (inner.classStatement) {
                    const statement = this.visit(inner.classStatement[0]);
                    if (statement) {
                        if (Array.isArray(statement)) members.push(...statement);
                        else members.push(statement);
                    }
                }
            });
        }

        return {
            type: "node",
            shape,
            name,
            members,
            offset: { start: 0, end: 0 }
        };
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

    connectionDeclaration(ctx: any): IREdge[] {
        const edges: IREdge[] = [];
        let currentFrom = this.visit(ctx.from[0]);

        if (ctx.MANY) {
            ctx.MANY.forEach((m: any, i: number) => {
                const inner = m.children;
                const to = this.visit(inner.to[0]);
                const arrow = inner.arrow[0].image;
                
                let label: string | undefined = undefined;
                if (inner.edgeLabel) label = this.visit(inner.edgeLabel[0]);

                edges.push({
                    type: "edge",
                    from: currentFrom,
                    to: to,
                    arrow,
                    label,
                    offset: { start: 0, end: 0 }
                });
                currentFrom = to;
            });
        }

        if (ctx.payload || ctx.edgeLabel2) {
            const lastEdge = edges[edges.length - 1];
            if (lastEdge) {
                lastEdge.label = this.visit((ctx.payload || ctx.edgeLabel2)[0]);
            }
        }

        return edges;
    }

    flowchartNodeDeclaration(ctx: any): IRNode {
        const id = ctx.id[0].image;
        let label = id;
        let shape = "box";
        if (ctx.label) {
            label = this.visit(ctx.label[0]);
            if (ctx.LBrace || ctx.LBrace1) {
                shape = "diamond";
            }
        }
        return {
            type: "node",
            shape: shape,
            name: id,
            origName: label,
        };
    }

    subgraphDeclaration(ctx: any): IRStatement {
        const id = this.visit(ctx.id[0]);
        const label = ctx.label ? this.visit(ctx.label[0]) : id;
        
        let statements: any[] = [];
        if (ctx.MANY) {
            statements = ctx.MANY.map((m: any) => {
                const inner = m.children;
                if (inner.flowchartStatement) return this.visit(inner.flowchartStatement[0]);
                return null;
            }).filter((s: any) => s).flat();
        }

        return {
            type: "group",
            keyword: "subgraph",
            label,
            statements
        } as any;
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
        // Don't join with space if it was a single word
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
