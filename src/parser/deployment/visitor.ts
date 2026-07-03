import { CstNode, IToken } from "chevrotain";
import { IRDiagram, IREdge, IRNode, IRStatement, IRContainer, IRGroup, IRNote, IROffset } from "../../ir/types";
import { POS_COMMENT_REGEX } from "../../ir/constants";
import { DeploymentParser } from "./parser";

const parser = new DeploymentParser();
const BaseVisitor = parser.getBaseCstVisitorConstructor();

export class DeploymentAstVisitor extends BaseVisitor {
    constructor() {
        super();
        this.validateVisitor();
    }

    private getOffsets(ctx: any, layoutTokens?: IToken[]): IROffset {
        const allTokens: IToken[] = [];
        const collectTokens = (obj: any) => {
            if (!obj) return;
            if (Array.isArray(obj)) {
                obj.forEach(collectTokens);
            } else if (obj.image) {
                allTokens.push(obj);
            } else if (obj.children) {
                Object.values(obj.children).forEach(collectTokens);
            } else {
                // Handle the case where obj is the children object itself
                Object.values(obj).forEach(collectTokens);
            }
        };
        collectTokens(ctx);
        
        if (allTokens.length === 0) return { start: 0, end: 0 };
        
        allTokens.sort((a, b) => a.startOffset - b.startOffset);
        const start = allTokens[0].startOffset;
        const end = (allTokens[allTokens.length - 1].endOffset !== undefined ? allTokens[allTokens.length - 1].endOffset! + 1 : allTokens[allTokens.length - 1].startOffset + (allTokens[allTokens.length - 1].image?.length || 0));

        let layoutStart: number | undefined = undefined;
        let layoutEnd: number | undefined = undefined;
        
        if (layoutTokens && layoutTokens.length > 0) {
            layoutTokens.sort((a, b) => a.startOffset - b.startOffset);
            layoutStart = layoutTokens[0].startOffset;
            layoutEnd = (layoutTokens[layoutTokens.length - 1].endOffset !== undefined ? layoutTokens[layoutTokens.length - 1].endOffset! + 1 : layoutTokens[layoutTokens.length - 1].startOffset + (layoutTokens[layoutTokens.length - 1].image?.length || 0));
        }

        return { start, end, layoutStart, layoutEnd };
    }

    diagram(ctx: any): IRDiagram {
        const statements = ctx.statement ? ctx.statement.map((s: any) => this.visit(s)).filter((s: any) => s).flat() : [];
        return {
            type: "Diagram",
            syntax: "plantuml",
            diagramType: "deployment",
            statements,
        };
    }

    statement(ctx: any): IRStatement | IRStatement[] | null {
        if (ctx.ignoredStatement) return null;
        if (ctx.nodeOrContainer) return this.visit(ctx.nodeOrContainer[0]);
        if (ctx.connectionDeclaration) return this.visit(ctx.connectionDeclaration[0]);
        return null;
    }

    name(ctx: any): string {
        let result = this.visit(ctx.part[0]);
        if (ctx.sep) {
            for (let i = 0; i < ctx.sep.length; i++) {
                result += ctx.sep[i].image + this.visit(ctx.part[i + 1]);
            }
        }
        return result;
    }

    namePart(ctx: any): string {
        if (ctx.nodeIdentifier) return this.visit(ctx.nodeIdentifier[0]);
        if (ctx.StringLiteral) return ctx.StringLiteral[0].image.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"');
        if (ctx.LBracket) {
            if (!ctx.anyToken) return "";
            return ctx.anyToken.map((t: any) => this.visit(t)).join(" ");
        }
        if (ctx.LParen) {
            if (!ctx.anyToken) return "";
            return ctx.anyToken.map((t: any) => this.visit(t)).join(" ");
        }
        if (ctx.Colon) {
            if (!ctx.anyToken) return "";
            return ":" + ctx.anyToken.map((t: any) => this.visit(t)).join(" ") + ":";
        }
        return "";
    }

    nodeIdentifier(ctx: any): string {
        const firstKey = Object.keys(ctx)[0];
        const tokens = ctx[firstKey] as IToken[];
        let image = tokens[0].image;
        if (tokens[0].tokenType.name === "StringLiteral") {
            image = image.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"');
        }
        return image;
    }

    payload(ctx: any): string {
        if (!ctx.anyToken) return "";
        const parts: string[] = [];
        ctx.anyToken.forEach((t: any) => {
            parts.push(this.visit(t));
        });
        return parts.join("").trim();
    }

    nodeOrContainer(ctx: any): IRNode | IRContainer {
        const keywordToken = Object.keys(ctx).find(k => !["name", "LBrace", "RBrace", "LBracket", "RBracket", "statement", "Newline", "stereo", "color", "alias", "layout", "As"].includes(k));
        const rawKeyword = keywordToken ? keywordToken.toLowerCase() : "package";
        // Normalize token names: NodeKeyword -> node, Database -> database, etc.
        const keyword = rawKeyword.replace(/keyword$/, '');
        const name = this.visit(ctx.name[0]);
        const alias = ctx.alias ? this.visit(ctx.alias[0]) : name;
        
        let stereo: string | undefined = undefined;
        if (ctx.stereo) {
            stereo = ctx.stereo[0].image;
        }

        let color: string | undefined = undefined;
        if (ctx.color) {
            color = ctx.color[0].image;
        }

        let layout: any = undefined;
        if (ctx.layout) {
            const firstComment = ctx.layout[0].image;
            const match = firstComment.match(POS_COMMENT_REGEX);
            if (match) layout = { x: parseFloat(match[1]), y: parseFloat(match[2]) };
        }

        if (ctx.LBrace) {
            return {
                type: "container",
                keyword,
                name: alias,
                origName: name,
                stereotype: stereo,
                color,
                layout,
                statements: ctx.statement ? ctx.statement.map((s: any) => this.visit(s)).filter(Boolean).flat() : [],
                offset: this.getOffsets(ctx, ctx.layout)
            } as any;
        } else {
            return {
                type: "node",
                shape: keyword,
                name: alias,
                origName: name,
                stereotype: stereo,
                color,
                layout,
                offset: this.getOffsets(ctx, ctx.layout)
            };
        }
    }

    connectionDeclaration(ctx: any): IREdge {
        let layout: any = undefined;
        if (ctx.layout) {
            const firstComment = ctx.layout[0].image;
            const match = firstComment.match(POS_COMMENT_REGEX);
            if (match) layout = { x: parseFloat(match[1]), y: parseFloat(match[2]) };
        }

        const color = ctx.color ? ctx.color[0].image : undefined;

        return {
            type: "edge",
            from: this.visit(ctx.from[0]),
            to: this.visit(ctx.to[0]),
            arrow: ctx.arrow[0].image,
            label: ctx.payload ? this.visit(ctx.payload[0]) : undefined,
            color,
            layout,
            offset: this.getOffsets(ctx, ctx.layout)
        };
    }

    ignoredStatement(ctx: any): null {
        return null;
    }

    anyToken(ctx: any): string {
        const values = Object.values(ctx);
        if (values.length > 0) {
            const tokens = values[0] as IToken[];
            let image = tokens[0].image;
            if (tokens[0].tokenType.name === "StringLiteral") {
                return image.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"');
            }
            return image;
        }
        return "";
    }
}

export const visitor = new DeploymentAstVisitor();
