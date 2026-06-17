import { CstParser, EOF, defaultParserErrorProvider } from "chevrotain";
import * as lexer from "./lexer";
import * as common from "../common/tokens";

export class ClassParser extends CstParser {
    constructor() {
        super(lexer.allClassTokens, { 
            skipValidations: false,
            nodeLocationTracking: "full"
        });
        this.performSelfAnalysis();
    }

    public memberToken = this.RULE("memberToken", () => {
        this.OR([
            { ALT: () => this.CONSUME(common.Identifier) },
            { ALT: () => this.CONSUME(common.NumberToken) },
            { ALT: () => this.CONSUME(common.StringLiteral) },
            { ALT: () => this.CONSUME(common.Color) },
            { ALT: () => this.CONSUME(common.LParen) },
            { ALT: () => this.CONSUME(common.RParen) },
            { ALT: () => this.CONSUME(lexer.LBrace) },
            { ALT: () => this.CONSUME(common.LBracket) },
            { ALT: () => this.CONSUME(common.RBracket) },
            { ALT: () => this.CONSUME(common.Colon) },
            { ALT: () => this.CONSUME(common.Comma) },
            { ALT: () => this.CONSUME(common.Dot) },
            { ALT: () => this.CONSUME(common.Star) },
            { ALT: () => this.CONSUME(common.VerticalBar) },
            { ALT: () => this.CONSUME(common.LAngle) },
            { ALT: () => this.CONSUME(common.RAngle) },
            { ALT: () => this.CONSUME(common.Plus) },
            { ALT: () => this.CONSUME(common.Minus) },
            { ALT: () => this.CONSUME(common.Slash) },
            { ALT: () => this.CONSUME(common.Backslash) },
            { ALT: () => this.CONSUME(common.Exclamation) },
            { ALT: () => this.CONSUME(common.QuestionMark) },
            { ALT: () => this.CONSUME(common.Skinparam) },
            { ALT: () => this.CONSUME(common.Hide) },
            { ALT: () => this.CONSUME(common.Show) },
            { ALT: () => this.CONSUME(common.Page) },
            { ALT: () => this.CONSUME(common.Header) },
            { ALT: () => this.CONSUME(common.Footer) },
            { ALT: () => this.CONSUME(common.Title) },
            { ALT: () => this.CONSUME(lexer.Class) },
            { ALT: () => this.CONSUME(lexer.Interface) },
            { ALT: () => this.CONSUME(lexer.Enum) },
            { ALT: () => this.CONSUME(lexer.Annotation) },
            { ALT: () => this.CONSUME(lexer.Abstract) },
            { ALT: () => this.CONSUME(lexer.Static) },
            { ALT: () => this.CONSUME(lexer.Entity) },
            { ALT: () => this.CONSUME(lexer.Struct) },
            { ALT: () => this.CONSUME(lexer.Protocol) },
            { ALT: () => this.CONSUME(lexer.RecordKeyword) },
            { ALT: () => this.CONSUME(lexer.Metaclass) },
            { ALT: () => this.CONSUME(lexer.StereotypeKeyword) },
            { ALT: () => this.CONSUME(lexer.Dataclass) },
            { ALT: () => this.CONSUME(lexer.Exception) },
            { ALT: () => this.CONSUME(lexer.ObjectKeyword) },
            { ALT: () => this.CONSUME(lexer.Circle) },
            { ALT: () => this.CONSUME(lexer.Diamond) },
            { ALT: () => this.CONSUME(lexer.Extends) },
            { ALT: () => this.CONSUME(lexer.Implements) },
            { ALT: () => this.CONSUME(lexer.Arrow) },
            { ALT: () => this.CONSUME(lexer.Stereotype) },
            { ALT: () => this.CONSUME(common.Tilde) },
            { ALT: () => this.CONSUME(common.Hash) },
            { ALT: () => this.CONSUME(lexer.As) },
            { ALT: () => this.CONSUME(lexer.Of) },
            { ALT: () => this.CONSUME(lexer.Note) },
            { ALT: () => this.CONSUME(lexer.End) },
            { ALT: () => this.CONSUME(lexer.Left) },
            { ALT: () => this.CONSUME(lexer.Right) },
            { ALT: () => this.CONSUME(lexer.Top) },
            { ALT: () => this.CONSUME(lexer.Bottom) },
            { ALT: () => this.CONSUME(lexer.Package) },
            { ALT: () => this.CONSUME(lexer.Namespace) },
            { ALT: () => this.CONSUME(lexer.Together) },
            { ALT: () => this.CONSUME(lexer.DividerDot) },
            { ALT: () => this.CONSUME(lexer.DividerEquals) },
            { ALT: () => this.CONSUME(lexer.DividerUnderscore) },
            { ALT: () => this.CONSUME(lexer.DividerMinus) }
        ]);
    });

    public anyToken = this.RULE("anyToken", () => {
        this.OR([
            { ALT: () => this.SUBRULE(this.memberToken) },
            { ALT: () => this.CONSUME(lexer.RBrace) },
            { ALT: () => this.CONSUME(common.Newline) }
        ]);
    });

    public nodeIdentifier = this.RULE("nodeIdentifier", () => {
        this.OR([
            { ALT: () => this.CONSUME(common.Identifier) },
            { ALT: () => this.CONSUME(lexer.Class) },
            { ALT: () => this.CONSUME(lexer.Interface) },
            { ALT: () => this.CONSUME(lexer.Enum) },
            { ALT: () => this.CONSUME(lexer.Annotation) },
            { ALT: () => this.CONSUME(lexer.Abstract) },
            { ALT: () => this.CONSUME(lexer.Entity) },
            { ALT: () => this.CONSUME(lexer.Struct) },
            { ALT: () => this.CONSUME(lexer.Protocol) },
            { ALT: () => this.CONSUME(lexer.RecordKeyword) },
            { ALT: () => this.CONSUME(lexer.Metaclass) },
            { ALT: () => this.CONSUME(lexer.StereotypeKeyword) },
            { ALT: () => this.CONSUME(lexer.Dataclass) },
            { ALT: () => this.CONSUME(lexer.Exception) },
            { ALT: () => this.CONSUME(lexer.ObjectKeyword) },
            { ALT: () => this.CONSUME(lexer.Circle) },
            { ALT: () => this.CONSUME(lexer.Diamond) },
            { ALT: () => this.CONSUME(lexer.Left) },
            { ALT: () => this.CONSUME(lexer.Right) },
            { ALT: () => this.CONSUME(lexer.Top) },
            { ALT: () => this.CONSUME(lexer.Bottom) },
            { ALT: () => this.CONSUME(lexer.Extends) },
            { ALT: () => this.CONSUME(lexer.Implements) }
        ]);
    });
    public namePart = this.RULE("namePart", () => { this.OR([{ ALT: () => this.SUBRULE(this.nodeIdentifier) }, { ALT: () => this.CONSUME(common.StringLiteral) }]); });

    public name = this.RULE("name", () => {
        this.OR([
            { ALT: () => this.CONSUME(common.StringLiteral) },
            { ALT: () => {
                this.AT_LEAST_ONE({
                    GATE: () => {
                        const next = this.LA(1).tokenType;
                        return next === common.Identifier || next === common.NumberToken || next === lexer.Class || next === lexer.ObjectKeyword || next === lexer.Interface || next === lexer.Enum || next === lexer.Annotation || next === lexer.Abstract || next === lexer.Entity || next === lexer.Struct || next === lexer.Protocol || next === lexer.RecordKeyword || next === lexer.Metaclass || next === lexer.StereotypeKeyword || next === lexer.Dataclass || next === lexer.Exception || next === lexer.Circle || next === lexer.Diamond || next === lexer.Left || next === lexer.Right || next === lexer.Top || next === lexer.Bottom || next === lexer.Extends || next === lexer.Implements || next === common.Dot || next === common.Tilde || next === common.LAngle || next === common.RAngle || next === common.QuestionMark || next === common.Comma || next === common.LParen || next === common.RParen;
                    },
                    DEF: () => {
                        this.OR1([
                            { ALT: () => this.SUBRULE(this.nodeIdentifier, { LABEL: "parts" }) },
                            { ALT: () => this.CONSUME(common.Dot, { LABEL: "seps" }) },
                            { ALT: () => this.CONSUME(common.Tilde, { LABEL: "seps" }) },
                            { ALT: () => this.CONSUME(common.LAngle, { LABEL: "seps" }) },
                            { ALT: () => this.CONSUME(common.RAngle, { LABEL: "seps" }) },
                            { ALT: () => this.CONSUME(common.QuestionMark, { LABEL: "seps" }) },
                            { ALT: () => this.CONSUME(common.Comma, { LABEL: "seps" }) },
                            { ALT: () => this.CONSUME(common.LParen, { LABEL: "seps" }) },
                            { ALT: () => this.CONSUME(common.RParen, { LABEL: "seps" }) }
                        ]);
                    }
                });
            }}
        ]);
    });

    public classDeclaration = this.RULE("classDeclaration", () => {
        this.OPTION(() => {
            this.OR([
                { ALT: () => this.CONSUME(common.Plus) },
                { ALT: () => this.CONSUME(common.Minus) },
                { ALT: () => this.CONSUME(common.Hash) },
                { ALT: () => this.CONSUME(common.Tilde) }
            ]);
        });
        this.OR1([
            { ALT: () => {
                this.CONSUME(lexer.Abstract);
                this.OPTION1(() => {
                    this.OR2([
                        { ALT: () => this.CONSUME(lexer.Class) },
                        { ALT: () => this.CONSUME(lexer.Interface) },
                        { ALT: () => this.CONSUME(lexer.Enum) },
                        { ALT: () => this.CONSUME(lexer.Annotation) },
                        { ALT: () => this.CONSUME(lexer.Entity) },
                        { ALT: () => this.CONSUME(lexer.Struct) },
                        { ALT: () => this.CONSUME(lexer.Protocol) },
                        { ALT: () => this.CONSUME(lexer.RecordKeyword) },
                        { ALT: () => this.CONSUME(lexer.Metaclass) },
                        { ALT: () => this.CONSUME(lexer.StereotypeKeyword) },
                        { ALT: () => this.CONSUME(lexer.Dataclass) },
                        { ALT: () => this.CONSUME(lexer.Exception) },
                        { ALT: () => this.CONSUME(lexer.ObjectKeyword) },
                        { ALT: () => this.CONSUME(lexer.Circle) },
                        { ALT: () => this.CONSUME(lexer.Diamond) }
                    ]);
                });
            }},
            { ALT: () => this.CONSUME1(lexer.Class) },
            { ALT: () => this.CONSUME1(lexer.ObjectKeyword) },
            { ALT: () => this.CONSUME1(lexer.Interface) },
            { ALT: () => this.CONSUME1(lexer.Enum) },
            { ALT: () => this.CONSUME1(lexer.Annotation) },
            { ALT: () => this.CONSUME1(lexer.Entity) },
            { ALT: () => this.CONSUME1(lexer.Struct) },
            { ALT: () => this.CONSUME1(lexer.Protocol) },
            { ALT: () => this.CONSUME1(lexer.RecordKeyword) },
            { ALT: () => this.CONSUME1(lexer.Metaclass) },
            { ALT: () => this.CONSUME1(lexer.StereotypeKeyword) },
            { ALT: () => this.CONSUME1(lexer.Dataclass) },
            { ALT: () => this.CONSUME1(lexer.Exception) },
            { ALT: () => this.CONSUME1(lexer.Circle) },
            { ALT: () => this.CONSUME1(lexer.Diamond) },
            { ALT: () => { this.CONSUME(common.LParen); this.CONSUME(common.RParen); } },
            { ALT: () => { this.CONSUME(common.LAngle); this.CONSUME(common.RAngle); } }
        ]);
        this.SUBRULE(this.name, { LABEL: "name" });
        this.OPTION2(() => this.CONSUME(lexer.Stereotype));
        this.MANY(() => {
            this.OR3([
                { ALT: () => {
                    this.OR4([
                        { ALT: () => this.CONSUME(lexer.Extends) },
                        { ALT: () => this.CONSUME(lexer.Implements) }
                    ]);
                    this.SUBRULE1(this.name, { LABEL: "parents" });
                }},
                { ALT: () => this.CONSUME(common.Color, { LABEL: "color" }) }
            ]);
        });
        this.MANY1(() => this.CONSUME(common.Newline));
        this.OPTION3(() => {
            this.CONSUME(lexer.LBrace);
            this.MANY2(() => {
                this.OR5([
                    { ALT: () => this.CONSUME1(common.Newline) },
                    { ALT: () => this.CONSUME(lexer.DividerDot, { LABEL: "dividers" }) },
                    { ALT: () => this.CONSUME(lexer.DividerEquals, { LABEL: "dividers" }) },
                    { ALT: () => this.CONSUME(lexer.DividerUnderscore, { LABEL: "dividers" }) },
                    { ALT: () => this.CONSUME(lexer.DividerMinus, { LABEL: "dividers" }) },
                    { GATE: () => this.isMemberStart(), ALT: () => this.SUBRULE(this.memberDeclaration) }
                ]);
            });
            this.CONSUME(lexer.RBrace);
        });
        this.OPTION4(() => this.CONSUME(common.PosComment, { LABEL: "layout" }));
    });

    public memberDeclaration = this.RULE("memberDeclaration", () => {
        this.SUBRULE(this.memberToken);
        this.MANY(() => {
            this.OR([
                { ALT: () => this.SUBRULE1(this.memberToken) },
                { GATE: () => this.LA(2).tokenType !== common.Newline && this.LA(2).tokenType !== common.EndUml && this.LA(2).tokenType !== EOF && this.LA(2).tokenType !== common.PosComment, 
                  ALT: () => this.CONSUME(lexer.RBrace) }
            ]);
        });
    });

    public label = this.RULE("label", () => {
        this.MANY({
            GATE: () => {
                const next = this.LA(1).tokenType;
                return next !== common.Newline && next !== common.EndUml && next !== EOF;
            },
            DEF: () => this.SUBRULE(this.memberToken)
        });
    });

    public connectionDeclaration = this.RULE("connectionDeclaration", () => {
        this.OPTION(() => {
            this.OR([
                { ALT: () => this.CONSUME(common.Plus) },
                { ALT: () => this.CONSUME(common.Minus) },
                { ALT: () => this.CONSUME(common.Hash) },
                { ALT: () => this.CONSUME(common.Tilde) }
            ]);
        });
        this.SUBRULE(this.name, { LABEL: "from" });
        this.OPTION1(() => {
            this.CONSUME(common.StringLiteral, { LABEL: "fromMultiplicity" });
        });
        this.OR1([
            { ALT: () => this.CONSUME(lexer.Arrow, { LABEL: "arrow" }) },
            { ALT: () => this.CONSUME1(common.Minus, { LABEL: "arrow" }) },
            { ALT: () => this.CONSUME(lexer.DividerDot, { LABEL: "arrow" }) },
            { ALT: () => this.CONSUME(lexer.DividerMinus, { LABEL: "arrow" }) }
        ]);
        this.OPTION2(() => {
            this.CONSUME1(common.StringLiteral, { LABEL: "toMultiplicity" });
        });
        this.SUBRULE1(this.name, { LABEL: "to" });
        this.OPTION3(() => this.CONSUME(lexer.Stereotype));
        this.OPTION4(() => {
            this.CONSUME(common.Colon);
            this.SUBRULE(this.label, { LABEL: "payload" });
        });
        this.OPTION5(() => this.CONSUME(common.PosComment, { LABEL: "layout" }));
    });

    public noteDeclaration = this.RULE("noteDeclaration", () => {
        this.CONSUME(lexer.Note);
        this.OR([
            { GATE: () => this.LA(1).tokenType === common.StringLiteral,
              ALT: () => {
                this.CONSUME(common.StringLiteral, { LABEL: "noteText" });
                this.CONSUME(lexer.As);
                this.SUBRULE(this.name, { LABEL: "alias" });
            }},
            { GATE: () => this.LA(1).tokenType === lexer.As,
              ALT: () => {
                this.CONSUME1(lexer.As);
                this.SUBRULE1(this.name, { LABEL: "alias" });
            }},
            { GATE: () => (this.LA(1).tokenType === lexer.Left || this.LA(1).tokenType === lexer.Right || this.LA(1).tokenType === lexer.Top || this.LA(1).tokenType === lexer.Bottom || this.LA(1).tokenType === common.Identifier) && 
                          (this.LA(1).image.toLowerCase() === "on" || this.LA(2).image.toLowerCase() === "on"),
              ALT: () => {
                this.OPTION(() => {
                    this.OR1([
                        { ALT: () => this.CONSUME(lexer.Left, { LABEL: "placement" }) },
                        { ALT: () => this.CONSUME(lexer.Right, { LABEL: "placement" }) },
                        { ALT: () => this.CONSUME(lexer.Top, { LABEL: "placement" }) },
                        { ALT: () => this.CONSUME(lexer.Bottom, { LABEL: "placement" }) }
                    ]);
                });
                this.CONSUME(common.Identifier); // on
                this.CONSUME1(common.Identifier); // link
                this.OPTION1(() => this.CONSUME(common.Color));
                this.OPTION2(() => this.SUBRULE(this.noteBody));
            }},
            { ALT: () => {
                this.OPTION3(() => {
                    this.OR2([
                        { ALT: () => this.CONSUME1(lexer.Left, { LABEL: "placement" }) },
                        { ALT: () => this.CONSUME1(lexer.Right, { LABEL: "placement" }) },
                        { ALT: () => this.CONSUME1(lexer.Top, { LABEL: "placement" }) },
                        { ALT: () => this.CONSUME1(lexer.Bottom, { LABEL: "placement" }) }
                    ]);
                });
                this.OPTION4(() => {
                    this.CONSUME(lexer.Of);
                    this.SUBRULE2(this.name, { LABEL: "target" });
                });
                this.OPTION5(() => this.SUBRULE1(this.noteBody));
            }}
        ]);
        this.OPTION6(() => this.CONSUME(common.PosComment, { LABEL: "layout" }));
    });

    public noteBody = this.RULE("noteBody", () => {
        this.OR([
            { GATE: () => this.LA(1).tokenType === common.Colon,
              ALT: () => {
                this.CONSUME(common.Colon);
                this.MANY(() => {
                    this.SUBRULE(this.anyToken);
                });
            }},
            { GATE: () => this.LA(1).tokenType === common.Newline,
              ALT: () => {
                this.MANY1(() => this.CONSUME(common.Newline));
                this.MANY2({
                    GATE: () => {
                        const t1 = this.LA(1).tokenType;
                        if (t1 === lexer.End) {
                            const t2 = this.LA(2).tokenType;
                            if (t2 === lexer.Note) return false;
                        }
                        if (t1 === common.EndUml || t1 === EOF) return false;
                        return true;
                    },
                    DEF: () => this.SUBRULE1(this.anyToken)
                });
                this.CONSUME(lexer.End);
                this.CONSUME1(lexer.Note);
            }}
        ]);
    });

    public containerDeclaration = this.RULE("containerDeclaration", () => {
        this.OR([
            { ALT: () => this.CONSUME(lexer.Package, { LABEL: "keyword" }) },
            { ALT: () => this.CONSUME(lexer.Namespace, { LABEL: "keyword" }) },
            { ALT: () => this.CONSUME(lexer.Together, { LABEL: "keyword" }) }
        ]);
        this.OPTION(() => {
            this.SUBRULE(this.name, { LABEL: "name" });
        });
        this.OPTION1(() => {
            this.CONSUME(common.Color);
        });
        this.OPTION2(() => {
            this.CONSUME(common.PosComment, { LABEL: "layout" });
        });
        this.CONSUME(lexer.LBrace);
        this.MANY(() => {
            this.OR1([
                { ALT: () => this.CONSUME(common.Newline) },
                { ALT: () => this.SUBRULE(this.statement) }
            ]);
        });
        this.CONSUME(lexer.RBrace);
    });

    public ignoredStatement = this.RULE("ignoredStatement", () => {
        this.OR([
            { ALT: () => this.CONSUME(common.Exclamation) },
            { ALT: () => this.CONSUME(common.Skinparam) },
            { ALT: () => this.CONSUME(common.Hide) },
            { ALT: () => this.CONSUME(common.Show) },
            { ALT: () => this.CONSUME(common.Page) },
            { ALT: () => this.CONSUME(common.Header) },
            { ALT: () => this.CONSUME(common.Footer) },
            { ALT: () => this.CONSUME(common.Title) }
        ]);
        this.MANY(() => {
             this.SUBRULE(this.anyToken);
        });
        this.OPTION(() => {
            this.CONSUME(lexer.LBrace);
            this.MANY1({
                GATE: () => this.LA(1).tokenType !== lexer.RBrace && this.LA(1).tokenType !== common.EndUml && this.LA(1).tokenType !== EOF,
                DEF: () => this.SUBRULE1(this.anyToken)
            });
            this.CONSUME(lexer.RBrace);
        });
        this.MANY2(() => this.CONSUME1(common.Newline));
        this.OPTION1(() => this.CONSUME(common.PosComment));
    });

    public statement = this.RULE("statement", () => {
        this.OR([
            { GATE: () => this.isIgnored(), ALT: () => this.SUBRULE(this.ignoredStatement) },
            { GATE: () => this.isConnection(), ALT: () => this.SUBRULE(this.connectionDeclaration) },
            { GATE: () => this.isContainer(), ALT: () => this.SUBRULE(this.containerDeclaration) },
            { ALT: () => this.SUBRULE(this.classDeclaration) },
            { ALT: () => this.SUBRULE(this.noteDeclaration) }
        ]);
    });

    private isContainer(): boolean {
        const tok = this.LA(1).tokenType;
        return tok === lexer.Package || tok === lexer.Namespace || tok === lexer.Together;
    }

    private isIgnored(): boolean {
        const tok = this.LA(1).tokenType;
        return tok === common.Exclamation || tok === common.Skinparam || tok === common.Hide || tok === common.Show || tok === common.Page || tok === common.Header || tok === common.Footer || tok === common.Title;
    }

    private isMemberStart(): boolean {
        const t = this.LA(1).tokenType;
        return t !== lexer.RBrace && t !== common.Newline && t !== common.EndUml && !this.isDivider() && t !== common.PosComment;
    }

    private isDivider(): boolean {
        const next = this.LA(1).tokenType;
        return next === lexer.DividerDot || next === lexer.DividerEquals || next === lexer.DividerUnderscore || next === lexer.DividerMinus;
    }

    private isConnection(): boolean {
        let la = 1;
        let t = this.LA(la);
        if (t.tokenType === common.Plus || t.tokenType === common.Minus || t.tokenType === common.Hash || t.tokenType === common.Tilde) { la++; t = this.LA(la); }
        while (t.tokenType === common.StringLiteral) { la++; t = this.LA(la); }
        if (t.tokenType === common.Dot) { la++; t = this.LA(la); }
        if (t.tokenType !== common.Identifier && t.tokenType !== lexer.Class && t.tokenType !== lexer.ObjectKeyword && t.tokenType !== lexer.Interface && t.tokenType !== lexer.Enum && t.tokenType !== lexer.Annotation && t.tokenType !== lexer.Abstract && t.tokenType !== lexer.Entity && t.tokenType !== lexer.Struct && t.tokenType !== lexer.Protocol && t.tokenType !== lexer.RecordKeyword && t.tokenType !== lexer.Metaclass && t.tokenType !== lexer.StereotypeKeyword && t.tokenType !== lexer.Dataclass && t.tokenType !== lexer.Exception && t.tokenType !== lexer.Circle && t.tokenType !== lexer.Diamond && t.tokenType !== common.LParen && t.tokenType !== common.LAngle && t.tokenType !== common.NumberToken) return false;
        while (true) {
            la++; t = this.LA(la);
            if (t.tokenType === common.Dot || t.tokenType === common.Tilde || t.tokenType === common.QuestionMark || t.tokenType === common.LAngle || t.tokenType === common.RAngle || t.tokenType === common.Comma || t.tokenType === common.LParen || t.tokenType === common.RParen) {
                la++; t = this.LA(la);
                if (t.tokenType !== common.Identifier && t.tokenType !== lexer.Class && t.tokenType !== lexer.ObjectKeyword && t.tokenType !== lexer.Interface && t.tokenType !== lexer.Enum && t.tokenType !== lexer.Annotation && t.tokenType !== lexer.Abstract && t.tokenType !== lexer.Entity && t.tokenType !== lexer.Struct && t.tokenType !== lexer.Protocol && t.tokenType !== lexer.RecordKeyword && t.tokenType !== lexer.Metaclass && t.tokenType !== lexer.StereotypeKeyword && t.tokenType !== lexer.Dataclass && t.tokenType !== lexer.Exception && t.tokenType !== lexer.Circle && t.tokenType !== lexer.Diamond && t.tokenType !== common.LParen && t.tokenType !== common.RParen && t.tokenType !== common.LAngle && t.tokenType !== common.RAngle && t.tokenType !== common.NumberToken && t.tokenType !== common.StringLiteral && t.tokenType !== common.Tilde && t.tokenType !== common.QuestionMark && t.tokenType !== common.Comma) break;
            } else if (t.tokenType === common.Identifier || t.tokenType === common.NumberToken) {} else break;
        }
        while (t.tokenType === common.StringLiteral) { la++; t = this.LA(la); }
        return t.tokenType === lexer.Arrow || t.tokenType === common.Minus || t.tokenType === lexer.DividerDot || t.tokenType === lexer.DividerMinus;
    }

    public diagram = this.RULE("diagram", () => {
        this.MANY(() => {
            this.OR([
                { ALT: () => this.CONSUME(common.Newline) },
                { ALT: () => this.CONSUME(common.StartUml) },
                { ALT: () => this.CONSUME(common.PosComment) },
                { ALT: () => this.SUBRULE(this.statement) },
                { ALT: () => this.CONSUME(common.EndUml) }
            ]);
        });
    });
}

export const parser = new ClassParser();
