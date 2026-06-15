import * as parser from "./parser";
import * as lexer from "./lexer";
import * as common from "../common/tokens";
import { IRDiagram, IRStatement, IRNode, IREdge, IRGroup, IRMetadata } from "../../ir/types";
import { POS_COMMENT_REGEX } from "../../ir/constants";
import { IToken } from "chevrotain";

const BaseVisitor = parser.parser.getBaseCstVisitorConstructor();

export class SequenceAstVisitor extends BaseVisitor {
    constructor() {
        super();
        this.validateVisitor();
    }

    diagram(ctx: any): IRDiagram {
        const statements: IRStatement[] = [];
        if (ctx.statement) {
            ctx.statement.forEach((stmt: any) => {
                const s = this.visit(stmt);
                if (Array.isArray(s)) {
                    statements.push(...s);
                } else if (s) {
                    statements.push(s);
                }
            });
        }
        return {
            type: "Diagram",
            syntax: "plantuml",
            diagramType: "sequence",
            statements
        };
    }

    statement(ctx: any): any {
        if (ctx.participantDeclaration) return this.visit(ctx.participantDeclaration[0]);
        if (ctx.connectionDeclaration) return this.visit(ctx.connectionDeclaration[0]);
        if (ctx.noteDeclaration) return this.visit(ctx.noteDeclaration[0]);
        if (ctx.refDeclaration) return this.visit(ctx.refDeclaration[0]);
        if (ctx.blockDeclaration) return this.visit(ctx.blockDeclaration[0]);
        if (ctx.ignoredStatement) return null;
        
        // Handle standalone commands
        if (ctx.Activate) return { type: "activation", action: "activate", target: this.visit(ctx.activeNode[0]) };
        if (ctx.Deactivate) return { type: "activation", action: "deactivate", target: this.visit(ctx.activeNode[0]) };
        if (ctx.Destroy) return { type: "activation", action: "destroy", target: this.visit(ctx.activeNode[0]) };
        if (ctx.Bye) return { type: "activation", action: "destroy", target: this.visit(ctx.activeNode[0]) };
        if (ctx.Return) {
            const label = ctx.returnPayload ? this.visit(ctx.returnPayload[0]) : undefined;
            return { type: "return", label };
        }
        if (ctx.Delay) {
            let text = "";
            const children = Object.values(ctx).flat().filter((c: any) => c !== undefined) as any[];
            children.sort((a, b) => {
                const startA = a.startOffset !== undefined ? a.startOffset : (a.location ? a.location.startOffset : 0);
                const startB = b.startOffset !== undefined ? b.startOffset : (b.location ? b.location.startOffset : 0);
                return startA - startB;
            });
            children.forEach((child, idx) => {
                const image = child.image || this.visit(child);
                text += image;
                if (idx < children.length - 1) text += " ";
            });
            text = text.replace(/\.\.\./g, "").trim();
            return { type: "delay", text };
        }
        if (ctx.Divider) {
            let label = "";
            const children = Object.values(ctx).flat().filter((c: any) => c !== undefined) as any[];
            children.sort((a, b) => {
                const startA = a.startOffset !== undefined ? a.startOffset : (a.location ? a.location.startOffset : 0);
                const startB = b.startOffset !== undefined ? b.startOffset : (b.location ? b.location.startOffset : 0);
                return startA - startB;
            });
            children.forEach((child, idx) => {
                const image = child.image || this.visit(child);
                label += image;
                if (idx < children.length - 1) label += " ";
            });
            label = label.replace(/==+/g, "").trim();
            return { type: "divider", label };
        }

        return null;
    }

    name(ctx: any): string {
        return ctx.part.map((p: any) => this.visit(p)).join(".");
    }

    namePart(ctx: any): string {
        const children = Object.values(ctx).flat();
        if (children.length > 0) {
            const child = children[0];
            if ((child as any).image !== undefined) {
                // It's a token
                let image = (child as any).image;
                if ((child as any).tokenType === common.StringLiteral) {
                    return image.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"');
                }
                return image;
            } else {
                // It's a CST node
                return this.visit(child);
            }
        }
        return "";
    }

    multilineLabel(ctx: any): string {
        if (ctx.StringLiteral) {
            return ctx.StringLiteral[0].image.replace(/^"|"$/g, "");
        }
        return this.visit(ctx.nodeIdentifier[0]);
    }

    nodeIdentifier(ctx: any): string {
        const firstChild = Object.values(ctx)[0] as any[];
        if (firstChild && firstChild[0]) return firstChild[0].image;
        return "";
    }

    participantDeclaration(ctx: any): IRNode {
        const name = this.visit(ctx.name[0]);
        const alias = ctx.alias ? this.visit(ctx.alias[0]) : name;
        let label = alias;
        if (ctx.multilineLabel) {
             label = this.visit(ctx.multilineLabel[0]);
        }

        let shape = "participant";
        if (ctx.Actor) shape = "actor";
        else if (ctx.Boundary) shape = "boundary";
        else if (ctx.Control) shape = "control";
        else if (ctx.Entity) shape = "entity";
        else if (ctx.Database) shape = "database";
        else if (ctx.Collections) shape = "collections";
        else if (ctx.Queue) shape = "queue";

        const node: IRNode = {
            type: "node",
            name: alias,
            origName: name,
            label,
            shape,
            layout: undefined
        };

        if (ctx.layout) {
            const comment = ctx.layout[0].image;
            const match = comment.match(POS_COMMENT_REGEX);
            if (match) {
                node.layout = { x: parseFloat(match[1]), y: parseFloat(match[2]) };
            }
        }
        return node;
    }

    connectionDeclaration(ctx: any): IREdge {
        let arrowToken = ctx.arrow[0];
        let arrow = arrowToken.image;

        const prefixTokens: any[] = [];
        if (ctx.prefixPlus) prefixTokens.push(...ctx.prefixPlus);
        if (ctx.prefixMinus) prefixTokens.push(...ctx.prefixMinus);
        prefixTokens.sort((a, b) => a.startOffset - b.startOffset);
        const prefix = prefixTokens.map(t => t.image).join("");

        const suffixTokens: any[] = [];
        if (ctx.suffixPlus) suffixTokens.push(...ctx.suffixPlus);
        if (ctx.suffixMinus) suffixTokens.push(...ctx.suffixMinus);
        suffixTokens.sort((a, b) => a.startOffset - b.startOffset);
        const suffix = suffixTokens.map(t => t.image).join("");

        arrow = prefix + arrow + suffix;

        let from = ctx.from ? this.visit(ctx.from[0]) : "[";
        let to = ctx.to ? this.visit(ctx.to[0]) : "]";
        let label = "";
        
        if (ctx.payload) {
            label = this.visit(ctx.payload[0]);
        }

        // Normalize direction
        const isBackward = arrow.includes("<") && !arrow.includes(">");
        if (isBackward) {
            const temp = from;
            from = to;
            to = temp;
            arrow = arrow.replace(/</g, "") + ">";
        }

        const edge: IREdge = {
            type: "edge",
            from,
            fromLabel: "",
            to,
            toLabel: "",
            arrow: arrow,
            label,
            isCreation: false,
            isDeletion: false,
            layout: undefined
        };

        if (ctx.layout) {
             const comment = ctx.layout[0].image;
             const match = comment.match(POS_COMMENT_REGEX);
             if (match) {
                 edge.layout = { x: parseFloat(match[1]), y: parseFloat(match[2]) };
             }
        }

        return edge;
    }

    noteDeclaration(ctx: any): any {
        let text = "";
        if (ctx.payload) {
            text = this.visit(ctx.payload[0]);
        } else {
            // Handle multiline note
            const children = Object.values(ctx).flat().filter((c: any) => {
                if (!c) return false;
                // Exclude keywords and structural tokens
                return (
                    c.name === "anyToken" ||
                    c.tokenType === common.Newline ||
                    (c.tokenType === undefined && c.name === undefined && c.image !== undefined) // It's a token
                ) && 
                c.tokenType !== lexer.Note && 
                c.tokenType !== lexer.Hnote && 
                c.tokenType !== lexer.Rnote &&
                c.tokenType !== lexer.Left &&
                c.tokenType !== lexer.Right &&
                c.tokenType !== lexer.Over &&
                c.tokenType !== lexer.Across &&
                c.tokenType !== lexer.Of &&
                c.tokenType !== lexer.On &&
                c.tokenType !== lexer.EndNote &&
                c.tokenType !== lexer.EndHnote &&
                c.tokenType !== lexer.EndRnote &&
                c.tokenType !== lexer.End &&
                c.tokenType !== common.Color;
            }) as any[];

            children.sort((a, b) => {
                const startA = a.startOffset !== undefined ? a.startOffset : (a.location ? a.location.startOffset : 0);
                const startB = b.startOffset !== undefined ? b.startOffset : (b.location ? b.location.startOffset : 0);
                return startA - startB;
            });

            // The multiline content starts after the first Newline.
            let started = false;
            children.forEach((child, index) => {
                if (!started) {
                    if (child.tokenType === common.Newline) started = true;
                    return;
                }
                const image = child.image || (child.name === "anyToken" ? this.visit(child) : "CST");
                text += image;
                if (index < children.length - 1) {
                    const nextChild = children[index + 1];
                    const nextImage = nextChild.image || (nextChild.name ? this.visit(nextChild) : "");
                    if (image !== "\n" && nextImage !== "\n" && nextImage !== "" && !image.endsWith(" ") && !".:!,?;".includes(nextImage[0])) {
                        text += " ";
                    }
                }
            });
        }
        text = text.trim();

        let placement = "right";
        if (ctx.Left) placement = "left";
        if (ctx.Right) placement = "right";
        if (ctx.Over) placement = "over";
        if (ctx.Across) placement = "across";

        const targets: string[] = [];
        if (ctx.target) targets.push(this.visit(ctx.target[0]));
        if (ctx.targets) ctx.targets.forEach((t: any) => targets.push(this.visit(t)));

        return {
            type: "node",
            name: "note_" + Math.random().toString(36).substr(2, 9),
            text,
            label: text,
            shape: "note",
            placement,
            targets
        };
    }

    returnPayload(ctx: any): string {
        return this.payload(ctx);
    }

    payload(ctx: any): string {
        if (!ctx.anyToken && !ctx.Newline) return "";
        let result = "";
        const children = Object.values(ctx).flat().filter((c: any) => c !== undefined && c !== null && c.tokenType !== common.Colon) as any[];
        
        // Sort children by their startOffset to preserve order including newlines
        children.sort((a, b) => {
            const startA = a.startOffset !== undefined ? a.startOffset : (a.location ? a.location.startOffset : 0);
            const startB = b.startOffset !== undefined ? b.startOffset : (b.location ? b.location.startOffset : 0);
            return startA - startB;
        });
        
        children.forEach((child, index) => {
            const image = child.image || (child.name === "anyToken" ? this.visit(child) : "CST");
            result += image;
            // Add space only if needed (not before newline, not after newline, not before punctuation)
            if (index < children.length - 1) {
                const nextChild = children[index + 1];
                const nextImage = nextChild.image || (nextChild.name ? this.visit(nextChild) : "");
                if (image !== "\n" && nextImage !== "\n" && nextImage !== "" && !image.endsWith(" ") && !".:!,?;".includes(nextImage[0])) {
                    result += " ";
                }
            }
        });

        return result.replace(/\\ n/g, "\n").replace(/\\n/g, "\n").trim();
    }

    refDeclaration(ctx: any): IRStatement[] {
        return [];
    }

    blockDeclaration(ctx: any): IRGroup {
        const statements: IRStatement[] = [];
        if (ctx.statement) {
            ctx.statement.forEach((s: any) => {
                const visited = this.visit(s);
                if (visited) statements.push(visited);
            });
        }
        
        let keyword = "group";
        if (ctx.Alt) keyword = "alt";
        if (ctx.Opt) keyword = "opt";
        if (ctx.Loop) keyword = "loop";
        if (ctx.Par) keyword = "par";
        if (ctx.Group) keyword = "group";

        const label = ctx.label ? this.visit(ctx.label[0]) : "";
        const sections: any[] = [];
        sections.push({ label, statements: [...statements] });
        
        if (ctx.elseBlock) {
            ctx.elseBlock.forEach((eb: any) => {
                sections.push(this.visit(eb));
            });
        }

        return {
            type: "group",
            name: "block",
            keyword,
            label,
            sections
        };
    }

    elseBlock(ctx: any): any {
        const statements: IRStatement[] = [];
        if (ctx.statement) {
            ctx.statement.forEach((s: any) => {
                const visited = this.visit(s);
                if (visited) statements.push(visited);
            });
        }
        return {
            label: ctx.label ? this.visit(ctx.label[0]) : "",
            statements
        };
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

    label(ctx: any): string {
        if (!ctx.anyToken) return "";
        return ctx.anyToken.map((t: any) => this.visit(t)).join(" ");
    }

    participantLabel(ctx: any): string {
        if (!ctx.anyToken) return "";
        let result = "";
        const children = Object.values(ctx).flat().filter(c => c !== undefined) as any[];
        children.sort((a, b) => {
            const startA = a.startOffset !== undefined ? a.startOffset : (a.location ? a.location.startOffset : 0);
            const startB = b.startOffset !== undefined ? b.startOffset : (b.location ? b.location.startOffset : 0);
            return startA - startB;
        });

        children.forEach((child, index) => {
            const image = child.image || (child.name === "anyToken" ? this.visit(child) : "CST");
            result += image;
            if (index < children.length - 1) {
                const nextChild = children[index + 1];
                const nextImage = nextChild.image || (nextChild.name ? this.visit(nextChild) : "");
                if (image !== "\n" && nextImage !== "\n" && nextImage !== "" && !image.endsWith(" ") && !".:!,?;".includes(nextImage[0])) {
                    result += " ";
                }
            }
        });
        return result.replace(/\\ n/g, "\n").replace(/\\n/g, "\n").trim();
    }

    ignoredStatement(ctx: any): any {
        return null;
    }
}

export const visitor = new SequenceAstVisitor();
