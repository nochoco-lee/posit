import { CstNode, IToken } from "chevrotain";
import { IRDiagram, IREdge, IRNode, IRStatement, IRContainer, IRGroup, IRNote, IROffset } from "../../ir/types";
import { POS_COMMENT_REGEX } from "../../ir/constants";
import { ClassParser } from "./parser";

const parser = new ClassParser();
const BaseVisitor = parser.getBaseCstVisitorConstructor();

export class ClassAstVisitor extends BaseVisitor {
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
            diagramType: "class",
            statements,
        };
    }

    statement(ctx: any): IRStatement | IRStatement[] | null {
        if (ctx.ignoredStatement) return null;
        if (ctx.classDeclaration) return this.visit(ctx.classDeclaration[0]);
        if (ctx.connectionDeclaration) return this.visit(ctx.connectionDeclaration[0]);
        if (ctx.noteDeclaration) return this.visit(ctx.noteDeclaration[0]);
        if (ctx.containerDeclaration) return this.visit(ctx.containerDeclaration[0]);
        return null;
    }

    containerDeclaration(ctx: any): IRContainer {
        const keywordToken = ctx.keyword ? ctx.keyword[0].image : "package";
        let name = ctx.name ? this.visit(ctx.name[0]) : undefined;
        if (name && name.startsWith('"') && name.endsWith('"')) {
            name = name.slice(1, -1);
        }

        let layout: any = undefined;
        if (ctx.layout) {
            const firstComment = ctx.layout[0].image;
            const match = firstComment.match(POS_COMMENT_REGEX);
            if (match) layout = { x: parseFloat(match[1]), y: parseFloat(match[2]) };
        }

        const statements = ctx.statement ? ctx.statement.map((s: any) => this.visit(s)).filter(Boolean).flat() : [];

        return {
            type: "container",
            keyword: keywordToken.toLowerCase(),
            name,
            statements,
            layout,
            offset: this.getOffsets(ctx, ctx.layout)
        };
    }

    noteDeclaration(ctx: any): IRNote {
        let text = "";
        const allChildren: any[] = [];
        if (ctx.anyToken) allChildren.push(...ctx.anyToken.map((t: any) => ({ node: t, offset: t.location?.startOffset ?? t.startOffset ?? 0 })));
        
        if (allChildren.length > 0) {
            allChildren.sort((a, b) => a.offset - b.offset);
            text = allChildren.map(c => this.visit(c.node)).join(" ").trim();
        }

        const placement = ctx.placement ? ctx.placement[0].image.toLowerCase() : "top";
        const targets = ctx.target ? [this.visit(ctx.target[0])] : [];

        let layout: any = undefined;
        if (ctx.layout) {
            const firstComment = ctx.layout[0].image;
            const match = firstComment.match(POS_COMMENT_REGEX);
            if (match) layout = { x: parseFloat(match[1]), y: parseFloat(match[2]) };
        }

        return {
            type: "note",
            placement,
            targets,
            text,
            layout,
            offset: this.getOffsets(ctx, ctx.layout)
        };
    }

    name(ctx: any): string {
        let prefix = ctx.leadingDot ? "." : "";
        let result = prefix + this.visit(ctx.part[0]);
        if (ctx.sep) {
            for (let i = 0; i < ctx.sep.length; i++) {
                result += ctx.sep[i].image + this.visit(ctx.part[i + 1]);
            }
        }
        return result;
    }

    namePart(ctx: any): string {
        if (ctx.nodeIdentifier) return this.visit(ctx.nodeIdentifier[0]);
        if (ctx.StringLiteral) return ctx.StringLiteral[0].image.slice(1, -1);
        return "";
    }

    nodeIdentifier(ctx: any): string {
        const values = Object.values(ctx);
        if (values.length > 0) {
            const tokens = values[0] as IToken[];
            return tokens[0].image;
        }
        return "";
    }

    classDeclaration(ctx: any): IRNode | IRStatement[] {
        const name = this.visit(ctx.name[0]);
        let shape = "class";
        if (ctx.LParen && ctx.RParen) {
            shape = "circle";
        } else if (ctx.LAngle && ctx.RAngle) {
            shape = "diamond";
        } else {
            const shapeToken = Object.keys(ctx).find(k => !["name", "LBrace", "RBrace", "classMember", "Newline", "parents", "color", "layout", "LParen", "RParen", "LAngle", "RAngle", "memberDeclaration", "Stereotype", "RecordKeyword"].includes(k));
            shape = shapeToken ? shapeToken.toLowerCase() : "class";
        }
        
        const stereotype = ctx.Stereotype ? ctx.Stereotype[0].image : undefined;
        
        const members: any[] = [];
        if (ctx.memberDeclaration) {
            ctx.memberDeclaration.forEach((m: any) => {
                members.push(this.visit(m));
            });
        }

        let color: string | undefined = undefined;
        if (ctx.color) {
            color = this.visit(ctx.color[0]);
        }

        let layout: any = undefined;
        if (ctx.layout) {
            const firstComment = ctx.layout[0].image;
            const match = firstComment.match(POS_COMMENT_REGEX);
            if (match) layout = { x: parseFloat(match[1]), y: parseFloat(match[2]) };
        }

        const node: IRNode = {
            type: "node",
            shape,
            name,
            origName: name,
            stereotype,
            members,
            color,
            layout,
            offset: this.getOffsets(ctx, ctx.layout)
        };

        if (ctx.parents) {
            const results: IRStatement[] = [node];
            ctx.parents.forEach((p: any) => {
                results.push({
                    type: "edge",
                    from: name,
                    to: this.visit(p),
                    arrow: "<|--",
                    offset: this.getOffsets(ctx, ctx.layout)
                } as any);
            });
            return results;
        }

        return node;
    }

    colorValue(ctx: any): string {
        const values = Object.values(ctx);
        if (values.length > 0) {
            const tokens = values[0] as IToken[];
            return tokens[0].image;
        }
        return "";
    }

    memberDeclaration(ctx: any): any {
        const visibility = ctx.Plus || ctx.Minus || ctx.Hash || ctx.Tilde ? (ctx.Plus || ctx.Minus || ctx.Hash || ctx.Tilde)[0].image : undefined;
        const isStatic = !!ctx.Static;
        const text = ctx.anyToken ? ctx.anyToken.map((t: any) => this.visit(t)).join(" ").trim() : "";
        
        const isMethod = text.includes("(");
        return {
            text,
            visibility,
            isStatic,
            isMethod,
            isField: !isMethod
        };
    }

    label(ctx: any): string {
        let result = "";
        if (ctx.anyToken) {
            ctx.anyToken.forEach((t: any) => {
                result += this.visit(t) + " ";
            });
        }
        return result.trim();
    }

    connectionDeclaration(ctx: any): IREdge | IREdge[] {
        let arrow = ctx.arrow[0].image;
        let from = this.visit(ctx.from[0]);
        let to = this.visit(ctx.to[0]);

        if (ctx.assoc) {
            const assoc = this.visit(ctx.assoc[0]);
            return [
                { type: "edge", from, to: assoc, arrow, offset: this.getOffsets(ctx) } as IREdge,
                { type: "edge", from: to, to: assoc, arrow, offset: this.getOffsets(ctx) } as IREdge
            ];
        }

        const fromLabel = ctx.fromLabel ? ctx.fromLabel[0].image.slice(1, -1) : undefined;
        const toLabel = ctx.toLabel ? ctx.toLabel[0].image.slice(1, -1) : undefined;

        if (arrow === "<|--" || arrow === "<|..") {
            const temp = from;
            from = to;
            to = temp;
            arrow = arrow === "<|--" ? "--|>" : "..|>";
        }

        let layout: any = undefined;
        if (ctx.layout) {
            const firstComment = ctx.layout[0].image;
            const match = firstComment.match(POS_COMMENT_REGEX);
            if (match) layout = { x: parseFloat(match[1]), y: parseFloat(match[2]) };
        }

        return {
            type: "edge",
            from,
            to,
            fromLabel,
            toLabel,
            arrow,
            label: ctx.payload ? this.visit(ctx.payload[0]) : undefined,
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

export const visitor = new ClassAstVisitor();
