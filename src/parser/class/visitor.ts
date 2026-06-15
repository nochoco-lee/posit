import { CstNode, IToken } from "chevrotain";
import { IRDiagram, IREdge, IRNode, IRStatement, IRContainer, IRGroup, IRNote, IROffset } from "../../ir/types";
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
        const shapeToken = Object.keys(ctx).find(k => !["name", "LBrace", "RBrace", "classMember", "Newline", "parents", "color", "layout"].includes(k));
        const shape = shapeToken ? shapeToken.toLowerCase() : "class";
        
        const members: any[] = [];
        if (ctx.classMember) {
            ctx.classMember.forEach((m: any) => {
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
            const match = firstComment.match(/@pos\s*\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/);
            if (match) layout = { x: parseInt(match[1]), y: parseInt(match[2]) };
        }

        const node: IRNode = {
            type: "node",
            shape,
            name,
            origName: name,
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

    classMember(ctx: any): any {
        const visibility = ctx.Visibility ? ctx.Visibility[0].image : undefined;
        const isStatic = !!ctx.StaticModifier;
        const isAbstract = !!ctx.AbstractModifier;
        const text = this.visit(ctx.tokens[0]);
        
        const isMethod = text.includes("(");
        return {
            text,
            visibility,
            isStatic,
            isAbstract,
            isMethod,
            isField: !isMethod
        };
    }

    memberLabel(ctx: any): string {
        let result = "";
        if (ctx.anyToken) {
            ctx.anyToken.forEach((t: any) => {
                result += this.visit(t) + " ";
            });
        }
        return result.trim();
    }

    connectionDeclaration(ctx: any): IREdge {
        let from = this.visit(ctx.from[0]);
        let to = this.visit(ctx.to[0]);
        let arrow = ctx.arrow[0].image;

        if (arrow === "<|--" || arrow === "<|..") {
            const temp = from;
            from = to;
            to = temp;
            arrow = arrow === "<|--" ? "--|>" : "..|>";
        }

        let layout: any = undefined;
        if (ctx.layout) {
            const firstComment = ctx.layout[0].image;
            const match = firstComment.match(/@pos\s*\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/);
            if (match) layout = { x: parseInt(match[1]), y: parseInt(match[2]) };
        }

        return {
            type: "edge",
            from,
            to,
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
