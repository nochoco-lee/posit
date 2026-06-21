import { CstNode, IToken } from "chevrotain";
import { IRDiagram, IREdge, IRNode, IRStatement, IRContainer, IRGroup, IRNote, IROffset, IRDivider } from "../../ir/types";
import { POS_COMMENT_REGEX } from "../../ir/constants";
import { ClassParser } from "./parser";
import * as common from "../common/tokens";

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
                Object.values(obj).forEach(collectTokens);
            }
        };
        collectTokens(ctx);
        
        if (allTokens.length === 0) return { start: 0, end: 0 };
        
        allTokens.sort((a, b) => a.startOffset - b.startOffset);
        const start = allTokens[0].startOffset;
        const lastToken = allTokens[allTokens.length - 1];
        const end = (lastToken.endOffset !== undefined ? lastToken.endOffset + 1 : lastToken.startOffset + (lastToken.image?.length || 0));

        let layoutStart: number | undefined = undefined;
        let layoutEnd: number | undefined = undefined;
        
        if (layoutTokens && layoutTokens.length > 0) {
            layoutTokens.sort((a, b) => a.startOffset - b.startOffset);
            layoutStart = layoutTokens[0].startOffset;
            const lastLayoutToken = layoutTokens[layoutTokens.length - 1];
            layoutEnd = (lastLayoutToken.endOffset !== undefined ? lastLayoutToken.endOffset + 1 : lastLayoutToken.startOffset + (lastLayoutToken.image?.length || 0));
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
        if (ctx.implicitMemberDeclaration) return this.visit(ctx.implicitMemberDeclaration[0]);
        return null;
    }

    implicitMemberDeclaration(ctx: any): IRNode {
        const name = this.visit(ctx.className[0]);
        return {
            type: "node",
            shape: "class",
            name,
            origName: name,
            members: [],
            offset: this.getOffsets(ctx)
        };
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
        if (ctx.noteText) {
            text = ctx.noteText[0].image.slice(1, -1);
        }

        if (ctx.noteBody) {
             const bodyText = this.visit(ctx.noteBody[0]);
             if (text) text += " " + bodyText;
             else text = bodyText;
        }

        const placement = ctx.placement ? ctx.placement[0].image.toLowerCase() : "right";
        const targets = ctx.target ? [this.visit(ctx.target[0])] : [];
        const alias = ctx.alias ? this.visit(ctx.alias[0]) : undefined;

        let layout: any = undefined;
        if (ctx.layout) {
            const firstComment = ctx.layout[0].image;
            const match = firstComment.match(POS_COMMENT_REGEX);
            if (match) layout = { x: parseFloat(match[1]), y: parseFloat(match[2]) };
        }

        return {
            type: "note",
            name: alias || "note_" + Math.random().toString(36).substr(2, 9),
            placement,
            targets,
            text,
            label: text,
            layout,
            offset: this.getOffsets(ctx, ctx.layout)
        };
    }

    noteBody(ctx: any): string {
        let text = "";
        const allChildren = this.getTokensFromCst(ctx);
        
        if (allChildren.length > 0) {
            allChildren.sort((a, b) => a.startOffset - b.startOffset);
            
            let result = "";
            let started = false;
            allChildren.forEach((child, index) => {
                const isNewline = child.tokenType === common.Newline;
                if (!started) {
                    if (isNewline) started = true;
                    else {
                        if (child.tokenType !== common.Colon) {
                            result += child.image + " ";
                        }
                    }
                    return;
                }
                if (isNewline) {
                    result += "\n";
                } else {
                    result += child.image + " ";
                }
            });
            text = result.trim();
        }
        return text;
    }

    private getTokensFromCst(ctx: any): IToken[] {
        const tokens: IToken[] = [];
        const collect = (obj: any) => {
            if (!obj) return;
            if (Array.isArray(obj)) obj.forEach(collect);
            else if (obj.image) tokens.push(obj);
            else if (obj.children) Object.values(obj.children).forEach(collect);
            else if (typeof obj === 'object') {
                 Object.values(obj).forEach(collect);
            }
        };
        collect(ctx);
        return tokens;
    }

    name(ctx: any): string {
        const allChildren = this.getTokensFromCst(ctx);
        allChildren.sort((a, b) => a.startOffset - b.startOffset);
        return allChildren.map(c => {
             if (c.tokenType && (c.tokenType.name === "StringLiteral" || c.tokenType.name === "NamePartStringLiteral")) return c.image.slice(1, -1);
             return c.image;
        }).join("");
    }

    connectionName(ctx: any): string {
        const allChildren = this.getTokensFromCst(ctx);
        allChildren.sort((a, b) => a.startOffset - b.startOffset);
        return allChildren.map(c => {
             if (c.tokenType && (c.tokenType.name === "StringLiteral" || c.tokenType.name === "NamePartStringLiteral")) return c.image.slice(1, -1);
             return c.image;
        }).join("");
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

    classDeclaration(ctx: any): IRStatement[] {
        const name = this.visit(ctx.name[0]);
        let shape = "class";
        if (ctx.LParen && ctx.RParen) {
            shape = "circle";
        } else if (ctx.LAngle && ctx.RAngle) {
            shape = "diamond";
        } else {
            const shapeToken = Object.keys(ctx).find(k => !["name", "LBrace", "RBrace", "classMember", "Newline", "parents", "color", "layout", "LParen", "RParen", "memberDeclaration", "Stereotype", "RecordKeyword", "dividers", "Plus", "Minus", "Hash", "Tilde"].includes(k));
            if (shapeToken) {
                shape = shapeToken.toLowerCase().replace("keyword", "");
            } else {
                shape = "class";
            }
        }
        
        const stereotype = ctx.Stereotype ? ctx.Stereotype[0].image : undefined;
        
        const members: any[] = [];
        const bodyDividers: IRDivider[] = [];
        
        if (ctx.memberDeclaration) {
            ctx.memberDeclaration.forEach((m: any) => {
                members.push(this.visit(m));
            });
        }
        
        if (ctx.dividers) {
            ctx.dividers.forEach((d: IToken) => {
                bodyDividers.push({
                    type: "divider",
                    label: d.image.replace(/[.=_ -]+/g, "").trim(),
                    offset: { start: d.startOffset, end: d.endOffset! + 1 }
                });
            });
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

        let visibility: string | undefined = undefined;
        if (ctx.Plus) visibility = "+";
        else if (ctx.Minus) visibility = "-";
        else if (ctx.Hash) visibility = "#";
        else if (ctx.Tilde) visibility = "~";

        const node: IRNode = {
            type: "node",
            shape,
            name,
            origName: name,
            stereotype,
            members,
            color,
            layout,
            visibility,
            offset: this.getOffsets(ctx, ctx.layout)
        };

        const results: IRStatement[] = [node];
        if (ctx.parents) {
            ctx.parents.forEach((p: any) => {
                results.push({
                    type: "edge",
                    from: name,
                    to: this.visit(p),
                    arrow: "<|--",
                    offset: this.getOffsets(ctx, ctx.layout)
                } as any);
            });
        }
        
        if (bodyDividers.length > 0) {
            results.push(...bodyDividers);
        }

        return results;
    }

    memberDeclaration(ctx: any): any {
        const allTokens = this.getTokensFromCst(ctx);
        allTokens.sort((a, b) => a.startOffset - b.startOffset);
        
        let isStatic = allTokens.some(t => t.image === "static" || t.image === "{static}");
        let isAbstract = allTokens.some(t => t.image === "abstract" || t.image === "{abstract}");
        
        const cleanTokens = allTokens.filter(t => !["static", "{static}", "abstract", "{abstract}", "{", "}"].includes(t.image));
        const text = cleanTokens.map(t => t.image).join(" ").trim();
        
        const visibilityMatch = text.match(/^[+#-~]/);
        const visibility = visibilityMatch ? visibilityMatch[0] : undefined;
        const textWithoutVisibility = text.replace(/^[+#-~]\s*/, "").trim();
        
        const isMethod = textWithoutVisibility.includes("(");
        
        const colonSplit = textWithoutVisibility.split(":");
        let namePart = colonSplit[0].trim();
        let type = colonSplit[1] ? colonSplit[1].split(/[()]/)[0].trim() : undefined;
        
        // Handle methods where type might be after )
        if (isMethod && textWithoutVisibility.includes(")")) {
             const afterParen = textWithoutVisibility.split(")")[1].trim();
             if (afterParen.startsWith(":")) {
                 type = afterParen.slice(1).trim();
             }
        }
        
        const name = namePart.split("(")[0].trim();

        const parameters: string[] = [];
        if (textWithoutVisibility.includes("(") && textWithoutVisibility.includes(")")) {
             const paramStr = textWithoutVisibility.split("(")[1].split(")")[0].trim();
             if (paramStr) {
                 paramStr.split(",").forEach(p => {
                     parameters.push(p.replace(/\s*:\s*/g, ": ").trim());
                 });
             }
        }

        return {
            text: allTokens.map(t => t.image).join(" ").trim(),
            visibility,
            name,
            type,
            parameters: isMethod ? parameters : undefined,
            isStatic,
            isAbstract,
            isMethod,
            isField: !isMethod
        };
    }

    label(ctx: any): string {
        const allTokens = this.getTokensFromCst(ctx);
        allTokens.sort((a, b) => a.startOffset - b.startOffset);
        return allTokens.map(t => t.image).join(" ").trim();
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

        const fromLabel = ctx.fromMultiplicity ? ctx.fromMultiplicity[0].image.slice(1, -1) : undefined;
        const toLabel = ctx.toMultiplicity ? ctx.toMultiplicity[0].image.slice(1, -1) : undefined;

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

    memberToken(ctx: any): string {
        return "";
    }

    anyToken(ctx: any): string {
        return "";
    }
}

export const visitor = new ClassAstVisitor();
