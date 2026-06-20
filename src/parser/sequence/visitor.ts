import * as parser from "./parser";
import * as lexer from "./lexer";
import * as common from "../common/tokens";
import { IRDiagram, IRStatement, IRNode, IREdge, IRGroup, IRMetadata, IROffset } from "../../ir/types";
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

    private getOffsets(ctx: any): IROffset {
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

        return { start, end };
    }

    statement(ctx: any): any {
        let result: any = null;
        if (ctx.timingDeclaration) result = this.visit(ctx.timingDeclaration[0]);
        else if (ctx.autoactivateDeclaration) result = this.visit(ctx.autoactivateDeclaration[0]);
        else if (ctx.participantDeclaration) result = this.visit(ctx.participantDeclaration[0]);
        else if (ctx.connectionDeclaration) result = this.visit(ctx.connectionDeclaration[0]);
        else if (ctx.noteDeclaration) result = this.visit(ctx.noteDeclaration[0]);
        else if (ctx.refDeclaration) result = this.visit(ctx.refDeclaration[0]);
        else if (ctx.blockDeclaration) result = this.visit(ctx.blockDeclaration[0]);
        else if (ctx.ignoredStatement) return null;
        else if (ctx.Return) {
            const label = ctx.returnPayload ? this.visit(ctx.returnPayload[0]) : undefined;
            result = { type: "return", label };
        }
        
        // Handle standalone commands
        else if (ctx.Activate) result = { type: "activation", action: "activate", target: this.visit(ctx.activeNode[0]) };
        else if (ctx.Deactivate) result = { type: "activation", action: "deactivate", target: this.visit(ctx.activeNode[0]) };
        else if (ctx.Destroy) result = { type: "activation", action: "destroy", target: this.visit(ctx.activeNode[0]) };
        else if (ctx.Bye) result = { type: "activation", action: "destroy", target: this.visit(ctx.activeNode[0]) };
        else if (ctx.Return) {
            const label = ctx.returnPayload ? this.visit(ctx.returnPayload[0]) : undefined;
            result = { type: "return", label };
        }
        else if (ctx.Delay) {
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
                if (idx < children.length - 1) {
                    const nextChild = children[idx + 1];
                    const endOfCurrent = child.endOffset !== undefined ? child.endOffset + 1 : (child.location ? child.location.endOffset + 1 : 0);
                    const startOfNext = nextChild.startOffset !== undefined ? nextChild.startOffset : (nextChild.location ? nextChild.location.startOffset : 0);
                    if (startOfNext > endOfCurrent) text += " ";
                }
            });
            text = text.replace(/\.\.\./g, "").trim();
            result = { type: "delay", text };
        }
        else if (ctx.Divider) {
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
                if (idx < children.length - 1) {
                    const nextChild = children[idx + 1];
                    const endOfCurrent = child.endOffset !== undefined ? child.endOffset + 1 : (child.location ? child.location.endOffset + 1 : 0);
                    const startOfNext = nextChild.startOffset !== undefined ? nextChild.startOffset : (nextChild.location ? nextChild.location.startOffset : 0);
                    if (startOfNext > endOfCurrent) label += " ";
                }
            });
            label = label.replace(/==+/g, "").trim();
            result = { type: "divider", label };
        }

        if (result && !result.offset) {
            result.offset = this.getOffsets(ctx);
        }
        return result;
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

    timingDeclaration(ctx: any): any {
        const name = ctx.anyToken ? ctx.anyToken.map((t: any) => this.visit(t)).join("") : "";
        return {
            type: "metadata",
            name: "timing",
            value: name,
            offset: this.getOffsets(ctx)
        };
    }

    autoactivateDeclaration(ctx: any): any {
        return {
            type: "autoactivate",
            value: ctx.on !== undefined,
            offset: this.getOffsets(ctx)
        };
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
        else if (ctx.Class) shape = "class";
        else if (ctx.ObjectKeyword) shape = "object";

        let stereotype = ctx.stereo ? ctx.stereo[0].image : undefined;

        const node: IRNode = {
            type: "node",
            name: alias,
            origName: name,
            label,
            shape,
            stereotype,
            layout: undefined,
            offset: this.getOffsets(ctx)
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
            layout: undefined,
            offset: this.getOffsets(ctx)
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
                    const endOfCurrent = child.endOffset !== undefined ? child.endOffset + 1 : (child.location ? child.location.endOffset + 1 : 0);
                    const startOfNext = nextChild.startOffset !== undefined ? nextChild.startOffset : (nextChild.location ? nextChild.location.startOffset : 0);
                    if (startOfNext > endOfCurrent && image !== "\n") {
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
            type: "note",
            name: "note_" + Math.random().toString(36).substr(2, 9),
            text,
            label: text,
            shape: "note",
            placement,
            targets,
            offset: this.getOffsets(ctx)
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
            if (index < children.length - 1) {
                const nextChild = children[index + 1];
                const endOfCurrent = child.endOffset !== undefined ? child.endOffset + 1 : (child.location ? child.location.endOffset + 1 : 0);
                const startOfNext = nextChild.startOffset !== undefined ? nextChild.startOffset : (nextChild.location ? nextChild.location.startOffset : 0);
                
                if (startOfNext > endOfCurrent && image !== "\n") {
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
        if (ctx.Partition) keyword = "partition";
        if (ctx.Box) keyword = "box";

        const label = ctx.label ? this.visit(ctx.label[0]) : "";
        const color = ctx.color ? ctx.color[0].image : undefined;
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
            color,
            sections,
            offset: this.getOffsets(ctx)
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
            statements,
            offset: this.getOffsets(ctx)
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
                const endOfCurrent = child.endOffset !== undefined ? child.endOffset + 1 : (child.location ? child.location.endOffset + 1 : 0);
                const startOfNext = nextChild.startOffset !== undefined ? nextChild.startOffset : (nextChild.location ? nextChild.location.startOffset : 0);
                
                if (startOfNext > endOfCurrent && image !== "\n") {
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
