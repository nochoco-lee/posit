import { CstNode, IToken } from "chevrotain";
import { IRDiagram, IREdge, IRNode, IRStatement, IRGroup, IRNote, IRActivation, IRMember, IRReturn, IRAutoactivate, IRAutonumber, IRDivider, IRDelay, IRRef, IRMainframe, IRContainer } from "../ir/types";
import { parser } from "./parser";
import { Colon, Star, Exclamation, Ampersand } from "./lexer";

const BaseVisitor = parser.getBaseCstVisitorConstructor();

export class SequenceAstVisitor extends BaseVisitor {
    constructor() {
        super();
        this.validateVisitor();
    }

    diagram(ctx: any): IRDiagram {
        const statements = ctx.statement ? ctx.statement.map((s: any) => this.visit(s)).filter((s: any) => s !== null) : [];
        return {
            type: "Diagram",
            diagramType: "unknown",
            statements,
        };
    }

    statement(ctx: any): IRStatement {
        if (ctx.participantDeclaration) return this.visit(ctx.participantDeclaration[0]);
        if (ctx.classDeclaration) return this.visit(ctx.classDeclaration[0]);
        if (ctx.connectionDeclaration) return this.visit(ctx.connectionDeclaration[0]);
        if (ctx.noteDeclaration) return this.visit(ctx.noteDeclaration[0]);
        if (ctx.refDeclaration) return this.visit(ctx.refDeclaration[0]);
        if (ctx.shortFormDeclaration) return this.visit(ctx.shortFormDeclaration[0]);
        if (ctx.groupingBlock) return this.visit(ctx.groupingBlock[0]);
        if (ctx.activationDeclaration) return this.visit(ctx.activationDeclaration[0]);
        if (ctx.autoactivateStatement) return this.visit(ctx.autoactivateStatement[0]);
        if (ctx.autonumberStatement) return this.visit(ctx.autonumberStatement[0]);
        if (ctx.dividerStatement) return this.visit(ctx.dividerStatement[0]);
        if (ctx.returnStatement) return this.visit(ctx.returnStatement[0]);
        if (ctx.createStatement) return this.visit(ctx.createStatement[0]);
        if (ctx.containerBlock) return this.visit(ctx.containerBlock[0]);
        if (ctx.jsonBlock) return this.visit(ctx.jsonBlock[0]);
        if (ctx.togetherBlock) return this.visit(ctx.togetherBlock[0]);
        if (ctx.mainframeStatement) return this.visit(ctx.mainframeStatement[0]);
        if (ctx.anchor) return this.visit(ctx.anchor[0]);
        if (ctx.ignoredStatement) return this.visit(ctx.ignoredStatement[0]);
        return { type: "UnknownStatement" };
    }

    jsonBlock(ctx: any): IRContainer {
        const nameToken = this.visit(ctx.name[0]);
        const name = nameToken.image;
        return {
            type: "container",
            keyword: "json",
            name,
            statements: [],
            offset: { start: ctx.Json[0].startOffset, end: ctx.RBrace[0].endOffset }
        };
    }

    styleBlock(ctx: any) { return null; }

    togetherBlock(ctx: any): IRContainer {
        const statements = ctx.statement ? ctx.statement.map((s: any) => this.visit(s)).filter((s: any) => s !== null) : [];
        return {
            type: "container",
            keyword: "together",
            statements,
            offset: { start: ctx.Together[0].startOffset, end: ctx.RBrace[0].endOffset }
        };
    }

    ignoredStatement(ctx: any): null { return null; }
    anchor(ctx: any): null { return null; }

    colorValue(ctx: any): string {
        if (ctx.Color) return ctx.Color[0].image;
        if (ctx.Visibility && ctx.Identifier) return ctx.Visibility[0].image + ctx.Identifier[0].image;
        return "";
    }

    shortFormDeclaration(ctx: any): IRNode {
        const nameToken = this.visit(ctx.name[0]);
        let name = nameToken.image;
        let origName = name;
        if (nameToken.tokenType && nameToken.tokenType.name === "StringLiteral") origName = this.unquoteString(name);
        if (ctx.alias) {
            const aliasToken = this.visit(ctx.alias[0]);
            name = aliasToken.image;
        }
        let shape = "participant";
        if (ctx.Colon) shape = "actor";
        else if (ctx.LBracket) shape = "component";
        else if (ctx.LParen && ctx.RParen && ctx.name[0].startOffset > ctx.RParen[0].startOffset) shape = "interface";
        else if (ctx.LParen) shape = "usecase";
        let color: string | undefined = undefined;
        if (ctx.color) color = this.visit(ctx.color[0]);
        let stereotype: string | undefined = undefined;
        if (ctx.stereotype) stereotype = this.visit(ctx.stereotype[0]);
        let layout: { x: number; y: number } | undefined = undefined;
        let layoutStart: number | undefined;
        let layoutEnd: number | undefined;
        if (ctx.PosComment) {
            const layoutToken = ctx.PosComment[0];
            layoutStart = layoutToken.startOffset;
            layoutEnd = layoutToken.endOffset;
            layout = this.parsePosComment(layoutToken.image);
        }
        const startToken = ctx.Colon ? ctx.Colon[0] : ctx.LBracket ? ctx.LBracket[0] : ctx.LParen ? ctx.LParen[0] : nameToken;
        let endToken = ctx.Colon && ctx.Colon.length > 1 ? ctx.Colon[1] : (ctx.RBracket ? ctx.RBracket[0] : (ctx.RParen ? ctx.RParen[0] : nameToken));
        if (ctx.PosComment) endToken = ctx.PosComment[0];
        else if (ctx.colorValue) {
            const c = ctx.colorValue[0];
            endToken = c.tokenType ? c : (c.children.Identifier ? c.children.Identifier[0] : c.children.Color[0]);
        }
        else if (ctx.multilineLabel) endToken = this.visit(ctx.multilineLabel[0]);
        else if (ctx.stereotype) endToken = ctx.stereotype[0];
        else if (ctx.alias) endToken = this.visit(ctx.alias[0]);
        return {
            type: "node", shape, name, origName, stereotype, layout, color,
            offset: { start: startToken.startOffset, end: endToken.endOffset, layoutStart, layoutEnd }
        };
    }

    participantDeclaration(ctx: any): IRNode {
        const shape = ctx.Participant ? "participant" : ctx.Actor ? "actor" : ctx.Boundary ? "boundary" : ctx.Control ? "control" : ctx.Entity ? "entity" : ctx.Database ? "database" : ctx.Collections ? "collections" : ctx.Queue ? "queue" : ctx.Artifact ? "artifact" : ctx.Storage ? "storage" : ctx.Rectangle ? "rectangle" : ctx.Card ? "card" : ctx.FileKeyword ? "file" : ctx.Stack ? "stack" : ctx.Hexagon ? "hexagon" : ctx.Person ? "person" : ctx.Process ? "process" : ctx.Agent ? "agent" : ctx.LabelKeyword ? "label" : ctx.Usecase ? "usecase" : ctx.Component ? "component" : ctx.Action ? "action" : ctx.Port ? "port" : ctx.PortIn ? "portin" : ctx.PortOut ? "portout" : ctx.NodeKeyword ? "node" : ctx.Circle ? "circle" : ctx.Interface ? "interface" : ctx.Class ? "class" : ctx.Enum ? "enum" : ctx.Struct ? "struct" : ctx.Annotation ? "annotation" : ctx.Abstract ? "abstract" : ctx.Cloud ? "cloud" : ctx.Frame ? "frame" : ctx.Folder ? "folder" : ctx.Package ? "package" : "participant";
        const nameToken = this.visit(ctx.name[0]);
        let name = nameToken.image;
        let origName = name;
        if (nameToken.tokenType && nameToken.tokenType.name === "StringLiteral") origName = this.unquoteString(name);
        if (ctx.alias) {
            const aliasToken = this.visit(ctx.alias[0]);
            name = aliasToken.image;
        }
        let color: string | undefined = undefined;
        if (ctx.color) color = this.visit(ctx.color[0]);
        let stereotype: string | undefined = undefined;
        if (ctx.stereotype) stereotype = this.visit(ctx.stereotype[0]);
        let layout: { x: number; y: number } | undefined = undefined;
        let layoutStart: number | undefined;
        let layoutEnd: number | undefined;
        if (ctx.layout) {
            const layoutToken = ctx.layout[0];
            layoutStart = layoutToken.startOffset;
            layoutEnd = layoutToken.endOffset;
            layout = this.parsePosComment(layoutToken.image);
        }
        const startToken = ctx.Participant ? ctx.Participant[0] : ctx.Actor ? ctx.Actor[0] : ctx.Boundary ? ctx.Boundary[0] : ctx.Control ? ctx.Control[0] : ctx.Entity ? ctx.Entity[0] : ctx.Database ? ctx.Database[0] : ctx.Collections ? ctx.Collections[0] : ctx.Queue ? ctx.Queue[0] : ctx.Artifact ? ctx.Artifact[0] : ctx.Storage ? ctx.Storage[0] : ctx.Rectangle ? ctx.Rectangle[0] : ctx.Card ? ctx.Card[0] : ctx.FileKeyword ? ctx.FileKeyword[0] : ctx.Stack ? ctx.Stack[0] : ctx.Hexagon ? ctx.Hexagon[0] : ctx.Person ? ctx.Person[0] : ctx.Process ? ctx.Process[0] : ctx.Agent ? ctx.Agent[0] : ctx.LabelKeyword ? ctx.LabelKeyword[0] : ctx.Usecase ? ctx.Usecase[0] : ctx.Component ? ctx.Component[0] : ctx.Action ? ctx.Action[0] : ctx.Port ? ctx.Port[0] : ctx.PortIn ? ctx.PortIn[0] : ctx.PortOut ? ctx.PortOut[0] : ctx.NodeKeyword ? ctx.NodeKeyword[0] : ctx.Circle ? ctx.Circle[0] : ctx.Interface ? ctx.Interface[0] : ctx.Cloud ? ctx.Cloud[0] : ctx.Frame ? ctx.Frame[0] : ctx.Folder ? ctx.Folder[0] : ctx.Package ? ctx.Package[0] : nameToken;
        let endToken = nameToken;
        if (ctx.layout) endToken = ctx.layout[0];
        else if (ctx.colorValue) {
            const c = ctx.colorValue[0];
            endToken = c.tokenType ? c : (c.children.Identifier ? c.children.Identifier[0] : c.children.Color[0]);
        }
        else if (ctx.order) endToken = ctx.order[0];
        else if (ctx.multilineLabel) endToken = this.visit(ctx.multilineLabel[0]);
        else if (ctx.stereotype) endToken = ctx.stereotype[0];
        else if (ctx.alias) endToken = this.visit(ctx.alias[0]);
        return {
            type: "node", shape, name, origName, stereotype, layout, color,
            offset: { start: startToken.startOffset, end: endToken.endOffset, layoutStart, layoutEnd }
        };
    }

    multilineLabel(ctx: any): IToken { return ctx.RBracket[0]; }
    namePart(ctx: any): IToken {
        if (ctx.nodeIdentifier) return this.visit(ctx.nodeIdentifier[0]);
        if (ctx.StringLiteral) return ctx.StringLiteral[0];
        return null as any;
    }

    stereotype(ctx: any): string {
        const tokens: IToken[] = [];
        if (ctx.anyToken) ctx.anyToken.forEach((at: any) => {
            const token = this.visit(at);
            if (token) tokens.push(token);
        });
        const innerText = tokens.map(t => t.image).join("").trim();
        return `<<${innerText}>>`;
    }

    name(ctx: any): IToken {
        if (ctx.StringLiteral) return ctx.StringLiteral[0];
        if (ctx.part) {
            const parts = ctx.part.map((p: any) => this.visit(p));
            if (parts.length === 1 && !ctx.generic && !ctx.leadingSep) return parts[0];
            const seps = ctx.sep ? ctx.sep.map((s: IToken) => s.image) : [];
            let image = (ctx.leadingSep ? ctx.leadingSep[0].image : "") + parts[0].image;
            for (let i = 0; i < seps.length; i++) image += seps[i] + parts[i + 1].image;
            let endOffset = parts[parts.length - 1].endOffset;
            if (ctx.generic) {
                const genericToken = this.visit(ctx.generic[0]);
                image += genericToken.image;
                endOffset = genericToken.endOffset;
            }
            return { ...(ctx.leadingSep ? ctx.leadingSep[0] : parts[0]), image, endOffset };
        }
        return null as any;
    }

    generic(ctx: any): IToken {
        if (ctx.Generic) return ctx.Generic[0];
        if (ctx.LAngle) {
            const startToken = ctx.LAngle[0];
            const endToken = ctx.RAngle[0];
            const tokens: IToken[] = [startToken];
            if (ctx.anyToken) ctx.anyToken.forEach((at: any) => {
                const token = this.visit(at);
                if (token) tokens.push(token);
            });
            if (ctx.Newline) tokens.push(...ctx.Newline);
            tokens.sort((a, b) => a.startOffset - b.startOffset);
            const image = tokens.map(t => t.image).join("");
            return { ...startToken, image, endOffset: endToken.endOffset } as IToken;
        }
        return null as any;
    }

    nodeIdentifier(ctx: any): IToken {
        const keys = Object.keys(ctx);
        if (keys.length > 0) return ctx[keys[0]][0];
        return null as any;
    }

    classDeclaration(ctx: any): IRNode {
        const visibility = ctx.Visibility ? ctx.Visibility[0].image : undefined;
        const shape = ctx.Class ? "class" : ctx.Interface ? "interface" : ctx.Enum ? "enum" : ctx.Struct ? "struct" : ctx.Annotation ? "annotation" : ctx.Abstract ? "abstract" : ctx.Circle ? "circle" : ctx.Diamond ? "diamond" : ctx.Exception ? "exception" : ctx.Metaclass ? "metaclass" : ctx.Protocol ? "protocol" : ctx.Record ? "record" : ctx.Stereotype ? "stereotype" : ctx.Dataclass ? "dataclass" : ctx.ObjectKeyword ? "object" : ctx.LParen ? "circle" : ctx.DiamondShort ? "diamond" : "class";
        const nameToken = this.visit(ctx.name[0]);
        let name = nameToken.image;
        if (nameToken.tokenType && nameToken.tokenType.name === "StringLiteral") name = this.unquoteString(name);
        let layout: { x: number; y: number } | undefined = undefined;
        let layoutStart: number | undefined;
        let layoutEnd: number | undefined;
        if (ctx.layout) {
            const layoutToken = ctx.layout[0];
            layoutStart = layoutToken.startOffset;
            layoutEnd = layoutToken.endOffset;
            layout = this.parsePosComment(layoutToken.image);
        }
        const members: IRMember[] = [];
        if (ctx.classMember) ctx.classMember.forEach((cm: any) => { members.push(this.visit(cm)); });
        const parents: string[] = [];
        if (ctx.parents) ctx.parents.forEach((p: any) => { parents.push(this.visit(p).image); });
        const startToken = ctx.Visibility ? ctx.Visibility[0] : (ctx.Class ? ctx.Class[0] : ctx.Interface ? ctx.Interface[0] : ctx.Enum ? ctx.Enum[0] : ctx.Struct ? ctx.Struct[0] : ctx.Annotation ? ctx.Annotation[0] : ctx.Abstract ? ctx.Abstract[0] : ctx.Circle ? ctx.Circle[0] : ctx.Diamond ? ctx.Diamond[0] : ctx.Exception ? ctx.Exception[0] : ctx.Metaclass ? ctx.Metaclass[0] : ctx.Protocol ? ctx.Protocol[0] : ctx.Record ? ctx.Record[0] : ctx.Stereotype ? ctx.Stereotype[0] : ctx.Dataclass ? ctx.Dataclass[0] : ctx.ObjectKeyword ? ctx.ObjectKeyword[0] : ctx.LParen ? ctx.LParen[0] : ctx.DiamondShort ? ctx.DiamondShort[0] : nameToken);
        const endToken = ctx.RBrace ? ctx.RBrace[0] : (ctx.layout ? ctx.layout[0] : nameToken);
        return {
            type: "node", shape, name, members, parents, layout, visibility,
            offset: { start: startToken.startOffset, end: endToken.endOffset, layoutStart, layoutEnd }
        };
    }

    classMember(ctx: any): IRMember {
        let visibility = ctx.Visibility ? ctx.Visibility[0].image : undefined;
        const isStatic = !!ctx.StaticModifier;
        const isAbstract = !!ctx.AbstractModifier;
        const isField = !!ctx.FieldMarker;
        const isMethod = !!ctx.MethodMarker;
        let allTokens: IToken[] = [];
        if (ctx.tokens) {
            const memberLabelCtx = ctx.tokens[0].children;
            if (memberLabelCtx.anyToken) allTokens = memberLabelCtx.anyToken.map((at: any) => this.visit(at));
        }
        let typeSeparatorIndex = -1;
        let parenDepth = 0;
        for (let i = 0; i < allTokens.length; i++) {
            const t = allTokens[i];
            const typeName = t.tokenType ? t.tokenType.name : (t as any).name;
            if (typeName === "LParen") parenDepth++;
            else if (typeName === "RParen") parenDepth--;
            else if (typeName === "Colon" && parenDepth === 0) typeSeparatorIndex = i;
        }
        let name = "";
        let type = undefined;
        let parameters: string[] | undefined = undefined;
        if (typeSeparatorIndex !== -1) {
            const nameTokens = allTokens.slice(0, typeSeparatorIndex);
            const typeTokens = allTokens.slice(typeSeparatorIndex + 1);
            name = this.processUnquotedLabel(nameTokens);
            type = this.processUnquotedLabel(typeTokens);
        } else {
            name = this.processUnquotedLabel(allTokens);
        }
        if (!visibility && allTokens.length > 0) {
            const firstToken = allTokens[0];
            const firstTypeName = firstToken.tokenType ? firstToken.tokenType.name : (firstToken as any).name;
            if (firstTypeName === "Color") {
                const colorImage = firstToken.image;
                if (colorImage.startsWith("#")) {
                    visibility = "#";
                    name = name.substring(colorImage.length).trim();
                }
            }
        }
        if (name.includes("(") && name.includes(")")) {
            const openParen = name.indexOf("(");
            const closeParen = name.lastIndexOf(")");
            const paramsStr = name.substring(openParen + 1, closeParen).trim();
            name = name.substring(0, openParen).trim();
            parameters = paramsStr ? paramsStr.split(",").map(s => s.trim()) : [];
        }
        const hasParens = parameters !== undefined;
        const isMethodGuessed = isMethod || (hasParens && !isField);
        return { visibility, isStatic, isAbstract, isField: isField || (!isMethodGuessed && !hasParens), isMethod: isMethodGuessed, name, type, parameters };
    }

    memberLabel(ctx: any): null { return null; }
    parameter(ctx: any) {
        const name = ctx.name[0].image;
        const type = ctx.type ? ctx.type[0].image : undefined;
        return { name, type };
    }

    connectionDeclaration(ctx: any): IREdge {
        let fromData: any;
        let toData: any;
        let arrow: string = ctx.arrow[0].image;
        if (ctx.from) {
            const t = this.visit(ctx.from[0]);
            let name = t.image;
            if (t.tokenType && t.tokenType.name === "StringLiteral") name = this.unquoteString(name);
            fromData = t.image ? { name, offset: { start: t.startOffset, end: t.endOffset } } : t;
        }
        else fromData = { name: "[", offset: { start: ctx.arrow[0].startOffset, end: ctx.arrow[0].startOffset } };
        
        if (ctx.to) {
            const t = this.visit(ctx.to[0]);
            let name = t.image;
            if (t.tokenType && t.tokenType.name === "StringLiteral") name = this.unquoteString(name);
            toData = t.image ? { name, offset: { start: t.startOffset, end: t.endOffset } } : t;
        }
        else toData = { name: "]", offset: { start: ctx.arrow[0].endOffset, end: ctx.arrow[0].endOffset } };
        
        let from = fromData.name;
        let to = toData.name;
        
        let fromLabel = fromData.label;
        let toLabel = toData.label;
        const isLeftArrow = arrow.startsWith("<") && !arrow.endsWith(">");
        if (isLeftArrow) {
            [from, to] = [to, from];
            [fromLabel, toLabel] = [toLabel, fromLabel];
            // Reverse the arrow string to maintain correct head placement
            arrow = arrow.split('').reverse().map(c => {
                if (c === '<') return '>';
                if (c === '>') return '<';
                if (c === '/') return '\\';
                if (c === '\\') return '/';
                if (c === '[') return ']';
                if (c === ']') return '[';
                if (c === '(') return ')';
                if (c === ')') return '(';
                return c;
            }).join('');
        }
        let label: string | undefined = undefined;
        let payloadEndOffset: number | undefined = undefined;
        if (ctx.payload) {
            const payloadData = this.visit(ctx.payload[0]);
            label = payloadData.text;
            payloadEndOffset = payloadData.endOffset;
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
        let color: string | undefined = undefined;
        if (ctx.colorValue) color = this.visit(ctx.colorValue[0]);
        if (ctx.colorValue1) color = this.visit(ctx.colorValue1[0]);
        if (ctx.colorValue2) color = this.visit(ctx.colorValue2[0]);
        let isCreation = false;
        if (ctx.Star && ctx.Star.length >= 2) isCreation = true;
        let isDeletion = false;
        if (ctx.Exclamation && ctx.Exclamation.length >= 2) isDeletion = true;
        const startOffset = fromData.offset.start;
        let endOffset = toData.offset.end;
        if (ctx.layout) endOffset = Math.max(endOffset, ctx.layout[0].endOffset);
        if (ctx.payload) endOffset = Math.max(endOffset, payloadEndOffset!);
        if (ctx.Color) endOffset = Math.max(endOffset, ctx.Color[ctx.Color.length - 1].endOffset);
        if (ctx.Star) endOffset = Math.max(endOffset, ctx.Star[ctx.Star.length - 1].endOffset);
        if (ctx.Exclamation) endOffset = Math.max(endOffset, ctx.Exclamation[ctx.Exclamation.length - 1].endOffset);
        if (ctx.Visibility) endOffset = Math.max(endOffset, ctx.Visibility[ctx.Visibility.length - 1].endOffset);
        return { type: "edge", from, fromLabel, to, toLabel, arrow, label, color, isCreation, isDeletion, layout, offset: { start: startOffset, end: endOffset, layoutStart, layoutEnd } };
    }

    payload(ctx: any): { text: string, endOffset: number } {
        if (ctx.StringLiteral) {
            const token = ctx.StringLiteral[0];
            return { text: this.unquoteString(token.image), endOffset: token.endOffset! };
        }
        const tokens: IToken[] = [];
        if (ctx.anyToken) ctx.anyToken.forEach((at: any) => {
            const token = this.visit(at);
            if (token) tokens.push(token);
        });
        const labelText = this.processUnquotedLabel(tokens);
        const lastToken = tokens.length > 0 ? tokens[tokens.length - 1] : { endOffset: 0 } as any;
        return { text: labelText, endOffset: lastToken.endOffset! };
    }

    endpoint(ctx: any) {
        let name = "";
        let label = "";
        let startToken: IToken;
        let endToken: IToken;
        if (ctx.Colon) {
            startToken = ctx.Colon[0];
            name = ":" + this.visit(ctx.name[0]).image + ":";
            endToken = ctx.Colon[1];
        } else if (ctx.label && ctx.name) {
            const labelToken = ctx.label[0];
            const nameToken = this.visit(ctx.name[0]);
            label = this.unquoteString(labelToken.image);
            name = nameToken.image;
            startToken = labelToken.startOffset < nameToken.startOffset ? labelToken : nameToken;
            const asToken = ctx.As ? ctx.As[0] : null;
            let endRef = labelToken.endOffset > nameToken.endOffset ? labelToken : nameToken;
            if (asToken && asToken.endOffset > endRef.endOffset) endRef = asToken;
            endToken = endRef;
        } else if (ctx.label) {
            const labelToken = ctx.label[0];
            name = this.unquoteString(labelToken.image);
            label = "";
            startToken = labelToken;
            endToken = labelToken;
        } else if (ctx.labelTokens) {
            label = ctx.labelTokens.map((t: IToken) => t.image).join(" ");
            if (ctx.name) name = this.visit(ctx.name[0]).image;
            else name = "";
            startToken = ctx.q1[0];
            const q2Token = ctx.q2[0];
            let endRef = q2Token;
            if (ctx.name) {
                const nameToken = this.visit(ctx.name[0]);
                if (nameToken.endOffset > endRef.endOffset) endRef = nameToken;
            }
            const asToken = ctx.As ? ctx.As[0] : null;
            if (asToken && asToken.endOffset > endRef.endOffset) endRef = asToken;
            endToken = endRef;
        } else if (ctx.LParen) {
            startToken = ctx.LParen[0];
            if (ctx.part1) {
                const part1Token = this.visit(ctx.part1[0]);
                name = "(" + part1Token.image;
                if (ctx.parts) ctx.parts.forEach((p: any) => { name += ", " + this.visit(p).image; });
                name += ")";
            } else if (ctx.name) {
                name = "() " + this.visit(ctx.name[0]).image;
            } else {
                name = "()";
            }
            endToken = ctx.RParen[0];
        } else if (ctx.LBracket) {
            startToken = ctx.LBracket[0];
            if (ctx.name) {
                const nameToken = this.visit(ctx.name[0]);
                name = nameToken.image;
                endToken = ctx.RBracket ? ctx.RBracket[0] : nameToken;
            } else {
                name = "[";
                label = "";
                endToken = startToken;
            }
        } else if (ctx.RBracket) {
            startToken = ctx.RBracket[0];
            name = "]";
            label = "";
            endToken = startToken;
        } else if (ctx.QuestionMark) {
            startToken = ctx.QuestionMark[0];
            name = "?";
            label = "";
            endToken = startToken;
        } else if (ctx.anchorWithName) {
            return this.visit(ctx.anchorWithName[0]);
        } else {
            const nameToken = this.visit(ctx.name[0]);
            name = nameToken.image;
            startToken = nameToken;
            endToken = nameToken;
            if (ctx.optionalAnchor) {
                const anchorResult = this.visit(ctx.optionalAnchor[0]);
                if (anchorResult && anchorResult.token) {
                    const anchorToken = anchorResult.token;
                    if (anchorToken.endOffset !== undefined && endToken.endOffset !== undefined && anchorToken.endOffset > endToken.endOffset) endToken = anchorToken;
                }
            }
        }
        return { name, label, offset: { start: startToken.startOffset, end: endToken.endOffset } };
    }

    optionalAnchor(ctx: any) {
        if (ctx.anchor) {
            const anchorToken = ctx.anchor[0];
            return { token: anchorToken, offset: { start: anchorToken.startOffset, end: anchorToken.endOffset } };
        }
        return null;
    }

    anchorWithName(ctx: any) {
        const anchorToken = ctx.anchor[0];
        let name = "";
        let startToken = anchorToken;
        let endToken = anchorToken;
        if (ctx.name) {
            const nameToken = this.visit(ctx.name[0]);
            name = nameToken.image;
            endToken = nameToken;
        } else name = anchorToken.image || "";
        return { name, label: "", offset: { start: startToken.startOffset, end: endToken.endOffset } };
    }

    groupingBlock(ctx: any): IRGroup {
        const startToken = ctx.Alt ? ctx.Alt[0] : ctx.Opt ? ctx.Opt[0] : ctx.Loop ? ctx.Loop[0] : ctx.Par ? ctx.Par[0] : ctx.Group ? ctx.Group[0] : ctx.Partition ? ctx.Partition[0] : ctx.Box[0];
        const keyword = ctx.Alt ? "alt" : ctx.Opt ? "opt" : ctx.Loop ? "loop" : ctx.Par ? "par" : ctx.Group ? "group" : ctx.Partition ? "partition" : "box";
        let label = this.visit(ctx.label[0]);
        if (ctx.payload) {
            const payload = this.visit(ctx.payload[0]);
            label = label ? `${label}: ${payload.text}` : payload.text;
        }
        if (ctx.label && ctx.label.length > 1) {
            const secondaryLabel = this.visit(ctx.label[1]);
            label = label ? `${label} [${secondaryLabel}]` : `[${secondaryLabel}]`;
        }
        const sections = [];
        sections.push({ label, statements: ctx.statement ? ctx.statement.map((s: any) => this.visit(s)) : [] });
        if (ctx.elseBlock) ctx.elseBlock.forEach((eb: any) => { sections.push(this.visit(eb)); });
        const endToken = ctx.End[0];
        let endOffset = endToken.endOffset;
        if (ctx.Box && ctx.Box.length > 1) endOffset = ctx.Box[1].endOffset;
        let color: string | undefined = undefined;
        if (ctx.colorValue) color = this.visit(ctx.colorValue[0]);
        if (ctx.colorValue1) color = this.visit(ctx.colorValue1[0]);
        if (ctx.colorValue2) color = this.visit(ctx.colorValue2[0]);
        return { type: "group", keyword, label, color, sections, offset: { start: startToken.startOffset, end: endOffset } };
    }

    elseBlock(ctx: any) {
        let label = this.visit(ctx.label[0]);
        if (ctx.payload) {
            const payload = this.visit(ctx.payload[0]);
            label = label ? `${label}: ${payload.text}` : payload.text;
        }
        return { label, statements: ctx.statement ? ctx.statement.map((s: any) => this.visit(s)) : [] };
    }

    label(ctx: any): string {
        if (ctx.StringLiteral) return this.unquoteString(ctx.StringLiteral[0].image);
        const tokens: IToken[] = [];
        if (ctx.anyToken) ctx.anyToken.forEach((at: any) => {
            const token = this.visit(at);
            if (token) tokens.push(token);
        });
        return this.processUnquotedLabel(tokens);
    }

    noteDeclaration(ctx: any): IRNote {
        const startToken = this.visit(ctx.type[0]);
        let placement = "over";
        if (ctx.Left) placement = "left";
        else if (ctx.Right) placement = "right";
        else if (ctx.Top) placement = "top";
        else if (ctx.Bottom) placement = "bottom";
        else if (ctx.Over) placement = "over";
        else if (ctx.Across) placement = "across";
        const targets: string[] = [];
        if (ctx.target) ctx.target.forEach((t: any) => targets.push(this.visit(t).image));
        let color: string | undefined = undefined;
        if (ctx.colorValue) color = this.visit(ctx.colorValue[0]);
        let text = "";
        let endOffset = startToken.endOffset;
        if (ctx.payload) {
            const payloadData = this.visit(ctx.payload[0]);
            text = payloadData.text;
            endOffset = payloadData.endOffset;
        } else if (ctx.noteBlock) {
            const blockData = this.visit(ctx.noteBlock[0]);
            text = blockData.text;
            endOffset = blockData.endOffset;
        } else if (ctx.floatingContent) {
            const contentToken = this.visit(ctx.floatingContent[0]);
            text = this.unquoteString(contentToken.image);
            endOffset = contentToken.endOffset;
            if (ctx.alias) endOffset = this.visit(ctx.alias[0]).endOffset;
        } else if (ctx.alias) endOffset = this.visit(ctx.alias[0]).endOffset;
        else if (ctx.target) endOffset = this.visit(ctx.target[ctx.target.length - 1]).endOffset;
        return { type: "note", placement, targets, text, color, offset: { start: startToken.startOffset, end: endOffset } };
    }

    noteType(ctx: any): IToken {
        if (ctx.Note) return ctx.Note[0];
        if (ctx.Hnote) return ctx.Hnote[0];
        if (ctx.Rnote) return ctx.Rnote[0];
        return null as any;
    }

    refDeclaration(ctx: any): IRRef {
        const startToken = ctx.Ref[0];
        const targets: string[] = [];
        if (ctx.target) ctx.target.forEach((t: any) => targets.push(this.visit(t).image));
        let text = "";
        let endOffset = startToken.endOffset;
        if (ctx.payload) {
            const payloadData = this.visit(ctx.payload[0]);
            text = payloadData.text;
            endOffset = payloadData.endOffset;
        } else if (ctx.noteBlock) {
            const blockData = this.visit(ctx.noteBlock[0]);
            text = blockData.text;
            endOffset = blockData.endOffset;
        } else if (ctx.target) endOffset = this.visit(ctx.target[ctx.target.length - 1]).endOffset;
        return { type: "ref", targets, text, offset: { start: startToken.startOffset, end: endOffset } };
    }

    noteBlock(ctx: any): { text: string, endOffset: number } {
        const tokens: IToken[] = [];
        if (ctx.anyToken) ctx.anyToken.forEach((at: any) => {
            const token = this.visit(at);
            if (token) tokens.push(token);
        });
        if (ctx.Newline) tokens.push(...ctx.Newline);
        tokens.sort((a, b) => a.startOffset - b.startOffset);
        const text = this.processUnquotedLabel(tokens);
        const lastToken = tokens.length > 0 ? tokens[tokens.length - 1] : { endOffset: 0 } as any;
        return { text, endOffset: lastToken.endOffset };
    }

    activationDeclaration(ctx: any): IRActivation {
        const startToken = ctx.Activate ? ctx.Activate[0] : (ctx.Deactivate ? ctx.Deactivate[0] : ctx.Destroy[0]);
        const action = ctx.Activate ? "activate" : (ctx.Deactivate ? "deactivate" : "destroy");
        const target = ctx.Identifier[0].image;
        let color: string | undefined = undefined;
        if (ctx.colorValue) color = this.visit(ctx.colorValue[0]);
        return { type: "activation", action, target, color, offset: { start: startToken.startOffset, end: color ? startToken.endOffset : ctx.Identifier[0].endOffset } };
    }

    autoactivateStatement(ctx: any): IRAutoactivate {
        const startToken = ctx.Autoactivate[0];
        const value = !!ctx.On;
        return { type: "autoactivate", value, offset: { start: startToken.startOffset, end: (ctx.On || ctx.Off)[0].endOffset } };
    }

    autonumberStatement(ctx: any): IRAutonumber {
        const startToken = ctx.Autonumber[0];
        let start: number | undefined = undefined;
        let step: number | undefined = undefined;
        let format: string | undefined = undefined;
        
        // Simple heuristic for now: find the first and second numbers
        const numbers = ctx.Number ? ctx.Number.map((n: any) => parseInt(n.image, 10)) : [];
        if (numbers.length > 0) start = numbers[0];
        if (numbers.length > 1) step = numbers[1];
        
        const strings = ctx.StringLiteral ? ctx.StringLiteral.map((s: any) => this.unquoteString(s.image)) : [];
        if (strings.length > 0) format = strings[0];
        
        let endOffset = startToken.endOffset;
        const allChildren = Object.values(ctx).flat() as any[];
        allChildren.forEach(child => {
            if (child.endOffset !== undefined && child.endOffset > endOffset) endOffset = child.endOffset;
        });
        
        return { type: "autonumber", start, step, format, offset: { start: startToken.startOffset, end: endOffset } };
    }

    dividerStatement(ctx: any): IRDivider {
        const token = ctx.Divider[0];
        const image = token.image;
        const match = image.match(/==+\s*(.*?)\s*==+/);
        const label = match ? match[1] : "";
        return { type: "divider", label, offset: { start: token.startOffset, end: token.endOffset } };
    }

    delayStatement(ctx: any): IRDelay {
        const token = ctx.Delay[0];
        return { type: "delay", offset: { start: token.startOffset, end: token.endOffset } };
    }

    returnStatement(ctx: any): IRReturn {
        const startToken = ctx.Return[0];
        let label: string | undefined = undefined;
        let endOffset = startToken.endOffset;
        if (ctx.label) label = this.visit(ctx.label[0]);
        return { type: "return", label, offset: { start: startToken.startOffset, end: endOffset } };
    }

    createStatement(ctx: any): IRNode {
        if (ctx.participantDeclaration) {
            const node = this.visit(ctx.participantDeclaration[0]);
            node.isCreation = true;
            node.offset.start = ctx.Create[0].startOffset;
            return node;
        }
        const nameToken = this.visit(ctx.name[0]);
        return { type: "node", shape: "participant", name: nameToken.image, origName: nameToken.image, isCreation: true, offset: { start: ctx.Create[0].startOffset, end: nameToken.endOffset } };
    }

    mainframeStatement(ctx: any): IRMainframe {
        const label = this.visit(ctx.label[0]);
        return { type: "mainframe", label, offset: { start: ctx.Mainframe[0].startOffset, end: ctx.label[0].endOffset } };
    }

    anyToken(ctx: any): IToken {
        const keys = Object.keys(ctx);
        if (keys.length > 0) return ctx[keys[0]][0];
        return null as any;
    }

    containerBlock(ctx: any): IRContainer {
        const keywordToken = ctx.Package ? ctx.Package[0] : ctx.Namespace ? ctx.Namespace[0] : ctx.Folder ? ctx.Folder[0] : ctx.Cloud ? ctx.Cloud[0] : ctx.Frame ? ctx.Frame[0] : ctx.Rect ? ctx.Rect[0] : ctx.NodeKeyword ? ctx.NodeKeyword[0] : ctx.Artifact ? ctx.Artifact[0] : ctx.Storage ? ctx.Storage[0] : ctx.Rectangle ? ctx.Rectangle[0] : ctx.Card ? ctx.Card[0] : ctx.FileKeyword ? ctx.FileKeyword[0] : ctx.Stack ? ctx.Stack[0] : ctx.Hexagon ? ctx.Hexagon[0] : ctx.Person ? ctx.Person[0] : ctx.Process ? ctx.Process[0] : ctx.Agent ? ctx.Agent[0] : ctx.LabelKeyword ? ctx.LabelKeyword[0] : ctx.Usecase ? ctx.Usecase[0] : ctx.Component ? ctx.Component[0] : ctx.Action ? ctx.Action[0] : null;
        const keyword = keywordToken ? keywordToken.image : "package";
        let name: string | undefined = undefined;
        if (ctx.name) {
            const nameToken = this.visit(ctx.name[0]);
            name = nameToken.image;
            if (nameToken.tokenType && nameToken.tokenType.name === "StringLiteral" && name !== undefined) name = this.unquoteString(name);
        }
        let stereotype: string | undefined = undefined;
        if (ctx.stereotype) stereotype = this.visit(ctx.stereotype[0]);
        let color: string | undefined = undefined;
        if (ctx.color) color = this.visit(ctx.color[0]);
        const statements = ctx.statement ? ctx.statement.map((s: any) => this.visit(s)).filter((s: any) => s !== null) : [];
        let endOffset = 0;
        if (ctx.RBrace) endOffset = ctx.RBrace[0].endOffset;
        else if (ctx.multilineLabel) endOffset = this.visit(ctx.multilineLabel[0]).endOffset;
        return { type: "container", keyword, name, stereotype, color, statements, offset: { start: keywordToken ? keywordToken.startOffset : 0, end: endOffset } };
    }

    private unquoteString(str: string): string {
        if (str.startsWith('"') && str.endsWith('"')) return str.slice(1, -1).replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
        return str;
    }

    private processUnquotedLabel(tokens: IToken[]): string {
        if (tokens.length === 0) return "";
        let result = "";
        for (let i = 0; i < tokens.length; i++) {
            const current = tokens[i];
            let image = current.image;
            if (current.tokenType && current.tokenType.name === "StringLiteral") image = this.unquoteString(image);
            result += image;
            if (i < tokens.length - 1) {
                const next = tokens[i + 1];
                if (next.startOffset > (current.endOffset || 0) + 1 && current.tokenType?.name !== "Newline" && next.tokenType?.name !== "Newline") result += " ";
            }
        }
        return result.replace(/\\n/g, "\n");
    }

    private parsePosComment(commentStr: string) {
        const match = commentStr.match(/@pos\s*\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/);
        if (match) return { x: parseInt(match[1], 10), y: parseInt(match[2], 10) };
        return undefined;
    }
}

export const visitor = new SequenceAstVisitor();
