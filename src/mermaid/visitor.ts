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
        const statements = ctx.statement ? ctx.statement.map((s: any) => this.visit(s)).filter((s: any) => s) : [];
        return {
            type: "Diagram",
            syntax: "mermaid",
            diagramType: "unknown",
            statements,
        };
    }

    statement(ctx: any): IRStatement | null {
        if (ctx.participantDeclaration) {
            return this.visit(ctx.participantDeclaration[0]);
        }
        if (ctx.classDeclaration) {
            return this.visit(ctx.classDeclaration[0]);
        }
        if (ctx.connectionDeclaration) {
            return this.visit(ctx.connectionDeclaration[0]);
        }
        return null;
    }

    participantDeclaration(ctx: any): IRNode {
        const shape = ctx.Participant ? "participant" : "actor";
        const nameToken = ctx.name[0];
        const name = nameToken.image;
        let layout: { x: number; y: number } | undefined = undefined;
        let layoutStart: number | undefined;
        let layoutEnd: number | undefined;

        if (ctx.layout) {
            const layoutToken = ctx.layout[0];
            layoutStart = layoutToken.startOffset;
            layoutEnd = layoutToken.endOffset;
            layout = this.parsePosComment(layoutToken.image);
        }

        const startToken = ctx.Participant ? ctx.Participant[0] : ctx.Actor[0];
        const endToken = ctx.layout ? ctx.layout[0] : nameToken;

        return {
            type: "node",
            shape,
            name,
            layout,
            offset: {
                start: startToken.startOffset,
                end: endToken.endOffset,
                layoutStart,
                layoutEnd,
            }
        };
    }

    classDeclaration(ctx: any): IRNode {
        const shape = ctx.Class ? "class" : "interface";
        const nameToken = ctx.name[0];
        const name = nameToken.image;
        let layout: { x: number; y: number } | undefined = undefined;
        let layoutStart: number | undefined;
        let layoutEnd: number | undefined;

        if (ctx.layout) {
            const layoutToken = ctx.layout[0];
            layoutStart = layoutToken.startOffset;
            layoutEnd = layoutToken.endOffset;
            layout = this.parsePosComment(layoutToken.image);
        }

        const startToken = ctx.Class ? ctx.Class[0] : ctx.Interface[0];
        const endToken = ctx.layout ? ctx.layout[0] : nameToken;

        return {
            type: "node",
            shape,
            name,
            layout,
            offset: {
                start: startToken.startOffset,
                end: endToken.endOffset,
                layoutStart,
                layoutEnd,
            }
        };
    }

    connectionDeclaration(ctx: any): IREdge {
        const startToken = ctx.from[0];
        const from = startToken.image;
        const toToken = ctx.to[0];
        const to = toToken.image;
        const arrow = ctx.arrow[0].image;

        let payload: string | undefined = undefined;
        if (ctx.payload) {
            const rawPayload = ctx.payload[0].image;
            payload = rawPayload.replace(/^:\s*/, "").trim();
        }

        let layout: { x: number; y: number } | undefined = undefined;
        let layoutStart: number | undefined;
        let layoutEnd: number | undefined;

        if (ctx.layout) {
            const layoutToken = ctx.layout[0];
            layoutStart = layoutToken.startOffset;
            layoutEnd = layoutToken.endOffset;
            layout = this.parsePosComment(layoutToken.image);
        }

        const endToken = ctx.layout ? ctx.layout[0] : (ctx.payload ? ctx.payload[0] : toToken);

        return {
            type: "edge",
            from,
            to,
            arrow,
            label: payload,
            layout,
            offset: {
                start: startToken.startOffset,
                end: endToken.endOffset,
                layoutStart,
                layoutEnd,
            }
        };
    }

    private parsePosComment(commentStr: string) {
        // Expected format: %% @pos(100, 200)
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
