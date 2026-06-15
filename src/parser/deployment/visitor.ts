import { CstNode, IToken } from "chevrotain";
import { IRDiagram, IREdge, IRNode, IRStatement, IRContainer, IRGroup, IRNote } from "../../ir/types";
import { DeploymentParser } from "./parser";

const parser = new DeploymentParser();
const BaseVisitor = parser.getBaseCstVisitorConstructor();

export class DeploymentAstVisitor extends BaseVisitor {
    constructor() {
        super();
        this.validateVisitor();
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

    stereotype(ctx: any): string {
        return this.visit(ctx.name[0]);
    }

    nodeOrContainer(ctx: any): IRNode | IRContainer {
        const keywordToken = Object.keys(ctx).find(k => !["name", "LBrace", "RBrace", "statement", "Newline", "stereo", "color"].includes(k));
        const keyword = keywordToken ? keywordToken.toLowerCase() : "package";
        const name = this.visit(ctx.name[0]);
        
        let stereo: string | undefined = undefined;
        if (ctx.stereo) {
            stereo = ctx.stereo[0].image; // Keep brackets as per test expectations
        }

        let color: string | undefined = undefined;
        if (ctx.color) {
            color = ctx.color[0].image;
        }

        if (ctx.LBrace) {
            return {
                type: "container",
                keyword,
                name,
                stereotype: stereo,
                color,
                statements: ctx.statement ? ctx.statement.map((s: any) => this.visit(s)).filter(Boolean).flat() : [],
                offset: { start: 0, end: 0 }
            };
        } else {
            return {
                type: "node",
                shape: keyword,
                name,
                origName: name,
                stereotype: stereo,
                color,
                offset: { start: 0, end: 0 }
            };
        }
    }

    connectionDeclaration(ctx: any): IREdge {
        return {
            type: "edge",
            from: this.visit(ctx.from[0]),
            to: this.visit(ctx.to[0]),
            arrow: ctx.arrow[0].image,
            offset: { start: 0, end: 0 }
        };
    }

    ignoredStatement(ctx: any): null {
        return null;
    }

    anyToken(ctx: any): string {
        const values = Object.values(ctx);
        if (values.length > 0) {
            const tokens = values[0] as IToken[];
            return tokens[0].image;
        }
        return "";
    }
}

export const visitor = new DeploymentAstVisitor();
