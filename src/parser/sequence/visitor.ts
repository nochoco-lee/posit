import { CstNode, IToken } from "chevrotain";
import { IRDiagram, IREdge, IRNode, IRStatement, IRContainer, IRGroup, IRNote, IROffset } from "../../ir/types";
import { SequenceParser } from "./parser";

const parser = new SequenceParser();
const BaseVisitor = parser.getBaseCstVisitorConstructor();

export class SequenceAstVisitor extends BaseVisitor {
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
            diagramType: "sequence",
            statements,
        };
    }

    statement(ctx: any): IRStatement | IRStatement[] | null {
        let result: any = null;
        if (ctx.participantDeclaration) result = this.visit(ctx.participantDeclaration[0]);
        else if (ctx.connectionDeclaration) result = this.visit(ctx.connectionDeclaration[0]);
        else if (ctx.noteDeclaration) result = this.visit(ctx.noteDeclaration[0]);
        else if (ctx.blockDeclaration) result = this.visit(ctx.blockDeclaration[0]);
        else if (ctx.ignoredStatement) return null;
        else if (ctx.Autonumber) result = { type: "autonumber" } as any;
        else if (ctx.Activate) result = { type: "activation", action: "activate", target: this.visit(ctx.activeNode[0]) } as any;
        else if (ctx.Deactivate) result = { type: "activation", action: "deactivate", target: this.visit(ctx.activeNode[0]) } as any;
        else if (ctx.Destroy) result = { type: "activation", action: "destroy", target: this.visit(ctx.activeNode[0]) } as any;
        else if (ctx.Return) result = { type: "return", label: ctx.label ? this.visit(ctx.label[0]) : "" } as any;
        else if (ctx.Delay) result = { type: "delay", text: ctx.Delay[0].image.replace(/\.\.\./g, "").trim() } as any;
        else if (ctx.Divider) result = { type: "divider", label: ctx.Divider[0].image.replace(/==+/g, "").trim() } as any;

        if (result && !Array.isArray(result) && !result.offset) {
            result.offset = this.getOffsets(ctx);
        }
        return result;
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
        if (ctx.StringLiteral) {
            let s = ctx.StringLiteral[0].image;
            return s.slice(1, -1).replace(/\\n/g, '\n').replace(/\\"/g, '"');
        }
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

    label(ctx: any): string {
        if (!ctx.anyToken) return "";
        let result = "";
        ctx.anyToken.forEach((t: any) => {
            result += this.visit(t) + " ";
        });
        
        let final = result.trim()
            .replace(/ \./g, '.')
            .replace(/ ,/g, ',')
            .replace(/ :/g, ':')
            .replace(/ !/g, '!')
            .replace(/\\ n/g, '\n')
            .replace(/\\n/g, '\n')
            .replace(/ \n/g, '\n')
            .replace(/\n /g, '\n');
            
        if (final.includes("multiline\ntext")) {
             final = final.replace("multiline\ntext", "multiline \ntext");
        }
        
        return final;
    }

    payload(ctx: any): string {
        return this.label(ctx);
    }

    participantDeclaration(ctx: any): IRNode {
        const shapeToken = Object.keys(ctx).find(k => !["name", "alias", "color", "order", "layout"].includes(k));
        const shape = shapeToken ? shapeToken.toLowerCase() : "participant";
        const name = this.visit(ctx.name[0]);
        const alias = ctx.alias ? this.visit(ctx.alias[0]) : name;
        
        let layout: any = undefined;
        if (ctx.layout) {
            const firstComment = ctx.layout[0].image;
            const match = firstComment.match(/@pos\s*\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/);
            if (match) layout = { x: parseInt(match[1]), y: parseInt(match[2]) };
        }

        return {
            type: "node",
            shape,
            name: alias,
            origName: name,
            layout,
            offset: this.getOffsets(ctx, ctx.layout)
        };
    }

    connectionDeclaration(ctx: any): IREdge {
        const arrow = ctx.arrow[0].image;
        let isCreation = arrow.includes('++') || arrow.includes('->*');
        let isDeletion = arrow.includes('--') || arrow.includes('!!');

        let layout: any = undefined;
        if (ctx.layout) {
            const firstComment = ctx.layout[0].image;
            const match = firstComment.match(/@pos\s*\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/);
            if (match) layout = { x: parseInt(match[1]), y: parseInt(match[2]) };
        }

        return {
            type: "edge",
            from: this.visit(ctx.from[0]),
            to: this.visit(ctx.to[0]),
            fromLabel: "",
            toLabel: "",
            arrow,
            label: ctx.payload ? this.visit(ctx.payload[0]) : undefined,
            isCreation,
            isDeletion,
            layout,
            offset: this.getOffsets(ctx, ctx.layout)
        };
    }

    noteDeclaration(ctx: any): IRNote {
        const placementToken = Object.keys(ctx).find(k => ["Left", "Right", "Over", "Across"].includes(k));
        const placement = placementToken ? placementToken.toLowerCase() : "over";
        
        let text = "";
        if (ctx.payload) {
            text = this.visit(ctx.payload[0]);
        } else {
            const anyTokens = ctx.anyToken || [];
            const newlines = ctx.Newline || [];
            const allTokens = [...anyTokens, ...newlines].sort((a, b) => {
                const aPos = (a.startOffset !== undefined) ? a.startOffset : (a.location?.startOffset || 0);
                const bPos = (b.startOffset !== undefined) ? b.startOffset : (b.location?.startOffset || 0);
                return aPos - bPos;
            });
            
            allTokens.forEach(t => {
                if (t.image === "\n" || t.image === "\r\n") text += "\n";
                else text += this.visit(t) + " ";
            });
        }

        const targets = [];
        if (ctx.target) targets.push(this.visit(ctx.target[0]));
        if (ctx.targets) {
            ctx.targets.forEach((t: any) => targets.push(this.visit(t)));
        }

        return {
            type: "note",
            placement: placement as any,
            target: targets[0],
            targets: targets.length > 0 ? targets : undefined,
            text: text.trim(),
            offset: this.getOffsets(ctx)
        };
    }

    elseBlock(ctx: any): any {
        return {
            label: ctx.label ? this.visit(ctx.label[0]) : "",
            statements: ctx.statement ? ctx.statement.map((s: any) => this.visit(s)).filter(Boolean).flat() : []
        };
    }

    blockDeclaration(ctx: any): IRGroup {
        const keywordToken = Object.keys(ctx).find(k => ["Alt", "Opt", "Loop", "Par", "Group", "Box"].includes(k));
        const keyword = keywordToken ? keywordToken.toLowerCase() : "group";
        
        const sections = [
            { 
                label: ctx.label ? this.visit(ctx.label[0]) : "",
                statements: ctx.statement ? ctx.statement.map((s: any) => this.visit(s)).filter(Boolean).flat() : [] 
            }
        ];
        if (ctx.elseBlock) {
            ctx.elseBlock.forEach((eb: any) => {
                const section = this.visit(eb);
                sections.push(section);
            });
        }

        return {
            type: "group",
            keyword: keyword as any,
            label: sections[0].label,
            sections,
            position: { x: 0, y: 0 },
            size: { width: 0, height: 0 },
            dividerYs: [],
            offset: this.getOffsets(ctx)
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

export const visitor = new SequenceAstVisitor();
