import { CstParser, EOF, defaultParserErrorProvider } from "chevrotain";
import * as lexer from "./lexer";
import * as common from "../common/tokens";

const fastErrorProvider = {
    ...defaultParserErrorProvider,
    buildNoViableAltMessage: (options: any) => {
        return `Expecting one of the possible Token sequences, but found: '${options.actual[0].image}'`;
    }
};

export class SequenceParser extends CstParser {
    constructor() {
        super(lexer.allSequenceTokens, { 
            skipValidations: true,
            errorMessageProvider: fastErrorProvider,
            nodeLocationTracking: "full"
        });
        this.performSelfAnalysis();
    }

    public anyToken = this.RULE("anyToken", () => {
        this.OR([
            { ALT: () => this.CONSUME(common.Identifier) },
            { ALT: () => this.CONSUME(common.NumberToken) },
            { ALT: () => this.CONSUME(common.StringLiteral) },
            { ALT: () => this.CONSUME(common.Color) },
            { ALT: () => this.CONSUME(common.LParen) },
            { ALT: () => this.CONSUME(common.RParen) },
            { ALT: () => this.CONSUME(common.LBrace) },
            { ALT: () => this.CONSUME(common.RBrace) },
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
            { ALT: () => this.CONSUME(common.Tilde) },
            { ALT: () => this.CONSUME(common.Hash) },
            { ALT: () => this.CONSUME(lexer.At) },
            { ALT: () => this.CONSUME(common.Skinparam) },
            { ALT: () => this.CONSUME(common.Hide) },
            { ALT: () => this.CONSUME(common.Show) },
            { ALT: () => this.CONSUME(common.Page) },
            { ALT: () => this.CONSUME(common.Header) },
            { ALT: () => this.CONSUME(common.Footer) },
            { ALT: () => this.CONSUME(common.Title) },
            { ALT: () => this.CONSUME(lexer.Delay) },
            { ALT: () => this.CONSUME(lexer.Divider) },
            { ALT: () => this.CONSUME(lexer.Arrow) },
            { ALT: () => this.CONSUME(lexer.Participant) },
            { ALT: () => this.CONSUME(lexer.Actor) },
            { ALT: () => this.CONSUME(lexer.Boundary) },
            { ALT: () => this.CONSUME(lexer.Control) },
            { ALT: () => this.CONSUME(lexer.Entity) },
            { ALT: () => this.CONSUME(lexer.Database) },
            { ALT: () => this.CONSUME(lexer.Collections) },
            { ALT: () => this.CONSUME(lexer.Queue) },
            { ALT: () => this.CONSUME(lexer.Class) },
            { ALT: () => this.CONSUME(lexer.ObjectKeyword) },
            { ALT: () => this.CONSUME(lexer.Alt) },
            { ALT: () => this.CONSUME(lexer.Opt) },
            { ALT: () => this.CONSUME(lexer.Loop) },
            { ALT: () => this.CONSUME(lexer.Par) },
            { ALT: () => this.CONSUME(lexer.Group) },
            { ALT: () => this.CONSUME(lexer.Partition) },
            { ALT: () => this.CONSUME(lexer.Box) },
            { ALT: () => this.CONSUME(lexer.Else) },
            { ALT: () => this.CONSUME(lexer.End) },
            { ALT: () => this.CONSUME(lexer.Note) },
            { ALT: () => this.CONSUME(lexer.Hnote) },
            { ALT: () => this.CONSUME(lexer.Rnote) },
            { ALT: () => this.CONSUME(lexer.Ref) },
            { ALT: () => this.CONSUME(lexer.Autonumber) },
            { ALT: () => this.CONSUME(lexer.Newpage) },
            { ALT: () => this.CONSUME(lexer.Activate) },
            { ALT: () => this.CONSUME(lexer.Deactivate) },
            { ALT: () => this.CONSUME(lexer.Destroy) },
            { ALT: () => this.CONSUME(lexer.Autoactivate) },
            { ALT: () => this.CONSUME(lexer.Return) },
            { ALT: () => this.CONSUME(lexer.Create) },
            { ALT: () => this.CONSUME(lexer.Bye) },
            { ALT: () => this.CONSUME(lexer.Mainframe) },
            { ALT: () => this.CONSUME(lexer.As) },
            { ALT: () => this.CONSUME(lexer.Stereotype) },
            { ALT: () => this.CONSUME(lexer.Left) },
            { ALT: () => this.CONSUME(lexer.Right) },
            { ALT: () => this.CONSUME(lexer.Top) },
            { ALT: () => this.CONSUME(lexer.Bottom) },
            { ALT: () => this.CONSUME(lexer.Over) },
            { ALT: () => this.CONSUME(lexer.Of) },
            { ALT: () => this.CONSUME(lexer.On) },
            { ALT: () => this.CONSUME(lexer.Across) },
            { ALT: () => this.CONSUME(lexer.Off) },
            { ALT: () => this.CONSUME(lexer.Stop) },
            { ALT: () => this.CONSUME(lexer.Resume) },
            { ALT: () => this.CONSUME(lexer.Inc) },
            { ALT: () => this.CONSUME(lexer.Ignore) },
            { ALT: () => this.CONSUME(lexer.SpaceSeparator) }
        ]);
    });

    public nodeIdentifier = this.RULE("nodeIdentifier", () => {
        this.OR([
            { ALT: () => this.CONSUME(common.Identifier) },
            { ALT: () => this.CONSUME(lexer.Participant) },
            { ALT: () => this.CONSUME(lexer.Actor) },
            { ALT: () => this.CONSUME(lexer.Boundary) },
            { ALT: () => this.CONSUME(lexer.Control) },
            { ALT: () => this.CONSUME(lexer.Entity) },
            { ALT: () => this.CONSUME(lexer.Database) },
            { ALT: () => this.CONSUME(lexer.Collections) },
            { ALT: () => this.CONSUME(lexer.Queue) },
            { ALT: () => this.CONSUME(lexer.Class) },
            { ALT: () => this.CONSUME(lexer.ObjectKeyword) },
            { ALT: () => this.CONSUME(lexer.Alt) },
            { ALT: () => this.CONSUME(lexer.Else) },
            { ALT: () => this.CONSUME(lexer.Opt) },
            { ALT: () => this.CONSUME(lexer.Loop) },
            { ALT: () => this.CONSUME(lexer.Par) },
            { ALT: () => this.CONSUME(lexer.Group) },
            { ALT: () => this.CONSUME(lexer.End) },
            { ALT: () => this.CONSUME(lexer.Partition) },
            { ALT: () => this.CONSUME(lexer.Box) },
            { ALT: () => this.CONSUME(common.NumberToken) },
            { ALT: () => this.CONSUME(common.LBracket) },
            { ALT: () => this.CONSUME(common.RBracket) }
        ]);
    });
    public namePart = this.RULE("namePart", () => { this.OR([{ ALT: () => this.SUBRULE(this.nodeIdentifier) }, { ALT: () => this.CONSUME(common.StringLiteral) }]); });

    public name = this.RULE("name", () => {
        this.SUBRULE(this.namePart, { LABEL: "part" });
        this.MANY(() => {
            this.CONSUME(common.Dot, { LABEL: "sep" });
            this.SUBRULE1(this.namePart, { LABEL: "part" });
        });
    });

    public label = this.RULE("label", () => {
        this.MANY({
            GATE: () => {
                const next = this.LA(1).tokenType;
                return next !== common.Newline && next !== common.Colon && next !== lexer.End && next !== common.EndUml && next !== EOF && next !== lexer.Else;
            },
            DEF: () => this.SUBRULE(this.anyToken)
        });
    });

    public participantLabel = this.RULE("participantLabel", () => {
        this.MANY({
            GATE: () => {
                const next = this.LA(1).tokenType;
                return next !== common.RBracket && next !== common.EndUml && next !== EOF;
            },
            DEF: () => this.OR([ { ALT: () => this.SUBRULE(this.anyToken) }, { ALT: () => this.CONSUME(common.Newline) } ])
        });
    });

    public payload = this.RULE("payload", () => {
        this.CONSUME(common.Colon);
        this.MANY({ 
            GATE: () => { const next = this.LA(1).tokenType; return next !== common.EndUml && next !== common.Newline; }, 
            DEF: () => this.OR([ { ALT: () => this.SUBRULE(this.anyToken) }, { ALT: () => this.CONSUME(common.Newline) } ]) 
        });
    });

    public returnPayload = this.RULE("returnPayload", () => {
        this.MANY({ 
            GATE: () => { const next = this.LA(1).tokenType; return next !== common.EndUml && next !== common.Newline; }, 
            DEF: () => this.OR([ { ALT: () => this.SUBRULE(this.anyToken) }, { ALT: () => this.CONSUME(common.Newline) } ]) 
        });
    });

    public jsonAttribute = this.RULE("jsonAttribute", () => {
        this.CONSUME(lexer.At);
        this.CONSUME(common.LBrace);
        this.MANY({
            GATE: () => {
                const t = this.LA(1).tokenType;
                return t !== common.RBrace && t !== common.Newline && t !== common.EndUml && t !== EOF;
            },
            DEF: () => this.SUBRULE(this.anyToken)
        });
        this.CONSUME(common.RBrace);
    });

    public participantDeclaration = this.RULE("participantDeclaration", () => {
        this.OR([
            { ALT: () => this.CONSUME(lexer.Participant) },
            { ALT: () => this.CONSUME(lexer.Actor) },
            { ALT: () => this.CONSUME(lexer.Boundary) },
            { ALT: () => this.CONSUME(lexer.Control) },
            { ALT: () => this.CONSUME(lexer.Entity) },
            { ALT: () => this.CONSUME(lexer.Database) },
            { ALT: () => this.CONSUME(lexer.Collections) },
            { ALT: () => this.CONSUME(lexer.Queue) },
            { ALT: () => this.CONSUME(lexer.Class) },
            { ALT: () => this.CONSUME(lexer.ObjectKeyword) }
        ]);
        this.SUBRULE(this.name, { LABEL: "name" });
        this.OPTION(() => this.SUBRULE(this.jsonAttribute, { LABEL: "jsonAttr" }));
        this.MANY(() => {
            this.OR1([
                { ALT: () => { this.CONSUME(lexer.As); this.SUBRULE1(this.name, { LABEL: "alias" }); }},
                { GATE: () => { const next = this.LA(1).tokenType; return next === common.Identifier || next === common.StringLiteral || next === common.NumberToken || next === common.IdentifierLike; }, ALT: () => this.SUBRULE2(this.name, { LABEL: "alias" }) },
                { ALT: () => this.CONSUME(common.Color, { LABEL: "color" }) },
                { ALT: () => this.CONSUME(lexer.Stereotype, { LABEL: "stereo" }) },
                { ALT: () => { this.CONSUME(lexer.Order); this.CONSUME(common.NumberToken, { LABEL: "order" }); } },
                { ALT: () => { this.CONSUME(common.LBracket); this.SUBRULE(this.participantLabel, { LABEL: "multilineLabel" }); this.CONSUME(common.RBracket); } }
            ]);
        });
        this.OPTION1(() => this.CONSUME(common.PosComment, { LABEL: "layout" }));
    });

    public connectionDeclaration = this.RULE("connectionDeclaration", () => {
        this.OR([
            { ALT: () => {
                this.SUBRULE(this.name, { LABEL: "from" });
                this.MANY(() => { this.OR1([ { ALT: () => this.CONSUME(common.Plus, { LABEL: "prefixPlus" }) }, { ALT: () => this.CONSUME(common.Minus, { LABEL: "prefixMinus" }) } ]); });
                this.OPTION4(() => {
                    this.CONSUME(common.LParen);
                    this.CONSUME(common.NumberToken);
                    this.CONSUME(common.RParen);
                });
                this.CONSUME(lexer.Arrow, { LABEL: "arrow" });
            }},
            { ALT: () => {
                this.CONSUME1(lexer.Arrow, { LABEL: "arrow" });
            }}
        ]);
        this.MANY1(() => { this.OR2([ { ALT: () => this.CONSUME1(common.Plus, { LABEL: "suffixPlus" }) }, { ALT: () => this.CONSUME1(common.Minus, { LABEL: "suffixMinus" }) } ]); });
        this.OPTION5(() => {
            this.OPTION7(() => this.CONSUME1(common.LParen));
            this.CONSUME1(common.NumberToken);
            this.CONSUME1(common.RParen);
        });
        this.OPTION6(() => this.SUBRULE1(this.name, { LABEL: "to" }));
        this.MANY2(() => { this.OR3([ { ALT: () => this.CONSUME2(common.Plus) }, { ALT: () => this.CONSUME2(common.Minus) } ]); });
        this.OPTION8(() => {
            this.OR4([
                { ALT: () => { this.CONSUME3(common.Star); this.CONSUME4(common.Star); } },
                { ALT: () => { this.CONSUME5(common.Exclamation); this.CONSUME6(common.Exclamation); } }
            ]);
        });
        this.OPTION(() => { this.CONSUME(lexer.As); this.SUBRULE2(this.name, { LABEL: "alias" }); });
        this.OPTION1(() => {
            this.OPTION2(() => this.CONSUME(common.Color, { LABEL: "color" }));
            this.SUBRULE(this.payload); 
        });
        this.OPTION3(() => this.CONSUME(common.PosComment, { LABEL: "layout" }));
    });

    public noteDeclaration = this.RULE("noteDeclaration", () => {
        this.OR([
            { ALT: () => this.CONSUME(lexer.Note) },
            { ALT: () => this.CONSUME(lexer.Hnote) },
            { ALT: () => this.CONSUME(lexer.Rnote) }
        ]);
        this.OR1([
            { ALT: () => this.CONSUME(lexer.Left) },
            { ALT: () => this.CONSUME(lexer.Right) },
            { ALT: () => this.CONSUME(lexer.Over) },
            { ALT: () => this.CONSUME(lexer.Across) }
        ]);
        this.OPTION(() => this.OR2([ { ALT: () => this.CONSUME(lexer.Of) }, { ALT: () => this.CONSUME(lexer.On) } ]));
        this.OPTION1(() => {
            this.SUBRULE(this.name, { LABEL: "target" });
            this.MANY1(() => {
                this.CONSUME(common.Comma);
                this.SUBRULE1(this.name, { LABEL: "targets" });
            });
        });
        this.OPTION2(() => this.CONSUME(common.Color));
        this.OR3([
            { ALT: () => this.SUBRULE(this.payload) },
            { ALT: () => {
                this.CONSUME(common.Newline);
                this.MANY2({
                    GATE: () => {
                        const t1 = this.LA(1).tokenType;
                        if (t1 === lexer.EndNote || t1 === lexer.EndHnote || t1 === lexer.EndRnote) return false;
                        if (t1 === lexer.End) {
                             const t2 = this.LA(2).tokenType;
                             if (t2 === lexer.Note || t2 === lexer.Hnote || t2 === lexer.Rnote) return false;
                        }
                        if (t1 === common.EndUml || t1 === EOF) return false;
                        return true;
                    },
                    DEF: () => this.OR4([
                        { ALT: () => this.SUBRULE(this.anyToken) },
                        { ALT: () => this.CONSUME1(common.Newline) }
                    ])
                });
                this.OR5([
                    { ALT: () => this.CONSUME(lexer.EndNote) },
                    { ALT: () => this.CONSUME(lexer.EndHnote) },
                    { ALT: () => this.CONSUME(lexer.EndRnote) },
                    { ALT: () => {
                         this.CONSUME(lexer.End);
                         this.OR6([
                             { ALT: () => this.CONSUME1(lexer.Note) },
                             { ALT: () => this.CONSUME1(lexer.Hnote) },
                             { ALT: () => this.CONSUME1(lexer.Rnote) }
                         ]);
                    }}
                ]);
            }}
        ]);
    });

    public refDeclaration = this.RULE("refDeclaration", () => {
        this.CONSUME(lexer.Ref);
        this.OR([
            { ALT: () => this.CONSUME(lexer.Over) },
            { ALT: () => this.CONSUME(lexer.Across) }
        ]);
        this.SUBRULE(this.name, { LABEL: "target" });
        this.MANY1(() => {
            this.CONSUME(common.Comma);
            this.SUBRULE1(this.name, { LABEL: "targets" });
        });
        this.OR1([
            { ALT: () => this.SUBRULE(this.payload) },
            { ALT: () => {
                this.CONSUME(common.Newline);
                this.MANY2({
                    GATE: () => {
                        const t1 = this.LA(1).tokenType;
                        if (t1 === lexer.EndRef) return false;
                        if (t1 === lexer.End) {
                             const t2 = this.LA(2).tokenType;
                             if (t2 === lexer.Ref) return false;
                        }
                        if (t1 === common.EndUml || t1 === EOF) return false;
                        return true;
                    },
                    DEF: () => this.OR3([
                        { ALT: () => this.SUBRULE(this.anyToken) },
                        { ALT: () => this.CONSUME1(common.Newline) }
                    ])
                });
                this.OR4([
                    { ALT: () => this.CONSUME(lexer.EndRef) },
                    { ALT: () => {
                         this.CONSUME(lexer.End);
                         this.CONSUME1(lexer.Ref);
                    }}
                ]);
            }}
        ]);
    });

    public elseBlock = this.RULE("elseBlock", () => {
        this.CONSUME(lexer.Else);
        this.SUBRULE(this.label);
        this.MANY({
            GATE: () => this.LA(1).tokenType !== lexer.End && this.LA(1).tokenType !== lexer.Else,
            DEF: () => {
                this.OR([
                    { ALT: () => this.CONSUME(common.Newline) },
                    { ALT: () => this.SUBRULE(this.statement) }
                ]);
            }
        });
    });

    public blockDeclaration = this.RULE("blockDeclaration", () => {
        this.OR([
            { ALT: () => this.CONSUME(lexer.Alt) },
            { ALT: () => this.CONSUME(lexer.Opt) },
            { ALT: () => this.CONSUME(lexer.Loop) },
            { ALT: () => this.CONSUME(lexer.Par) },
            { ALT: () => this.CONSUME(lexer.Group) },
            { ALT: () => this.CONSUME(lexer.Partition) },
            { ALT: () => this.CONSUME(lexer.Box) }
        ]);
        this.SUBRULE(this.label);
        this.OPTION3(() => this.CONSUME(common.Color, { LABEL: "color" }));
        this.MANY({
            GATE: () => this.LA(1).tokenType !== lexer.End && this.LA(1).tokenType !== lexer.Else,
            DEF: () => {
                this.OR1([
                    { ALT: () => this.CONSUME(common.Newline) },
                    { ALT: () => this.SUBRULE(this.statement) }
                ]);
            }
        });
        this.MANY1(() => this.SUBRULE(this.elseBlock));
        this.CONSUME(lexer.End);
        this.OPTION2(() => {
            this.OR2([
                { ALT: () => this.CONSUME1(lexer.Alt) },
                { ALT: () => this.CONSUME1(lexer.Opt) },
                { ALT: () => this.CONSUME1(lexer.Loop) },
                { ALT: () => this.CONSUME1(lexer.Par) },
                { ALT: () => this.CONSUME1(lexer.Group) },
                { ALT: () => this.CONSUME1(lexer.Partition) },
                { ALT: () => this.CONSUME1(lexer.Box) }
            ]);
        });
    });

    public ignoredStatement = this.RULE("ignoredStatement", () => {
        this.OR([
            { GATE: () => this.LA(2).tokenType === common.Newline, ALT: () => {
                this.OR1([
                    { ALT: () => this.CONSUME(common.Title) },
                    { ALT: () => this.CONSUME(common.Header) },
                    { ALT: () => this.CONSUME(common.Footer) }
                ]);
                this.CONSUME(common.Newline);
                this.MANY3({
                    GATE: () => {
                        const next = this.LA(1).tokenType;
                        const next2 = this.LA(2).tokenType;
                        if (next === lexer.End && (next2 === common.Title || next2 === common.Header || next2 === common.Footer)) {
                            return false;
                        }
                        return next !== common.EndUml && next !== EOF;
                    },
                    DEF: () => this.OR2([
                        { ALT: () => this.CONSUME1(common.Newline) },
                        { ALT: () => this.SUBRULE(this.anyToken) }
                    ])
                });
                this.CONSUME(lexer.End);
                this.OR3([
                    { ALT: () => this.CONSUME1(common.Title) },
                    { ALT: () => this.CONSUME1(common.Header) },
                    { ALT: () => this.CONSUME1(common.Footer) }
                ]);
            }},
            { ALT: () => {
                this.OR4([
                    { ALT: () => this.CONSUME(common.Exclamation) },
                    { ALT: () => this.CONSUME(common.Skinparam) },
                    { ALT: () => this.CONSUME(common.Hide) },
                    { ALT: () => this.CONSUME(common.Show) },
                    { ALT: () => this.CONSUME(common.Page) },
                    { ALT: () => this.CONSUME2(common.Header) },
                    { ALT: () => this.CONSUME2(common.Footer) },
                    { ALT: () => this.CONSUME2(common.Title) },
                    { ALT: () => this.CONSUME(lexer.Newpage) },
                    { ALT: () => this.CONSUME(lexer.Mainframe) },
                    { ALT: () => this.CONSUME(common.Slash) }
                ]);
                this.MANY({
                     GATE: () => this.LA(1).tokenType !== common.Newline && this.LA(1).tokenType !== common.LBrace && this.LA(1).tokenType !== common.EndUml,
                     DEF: () => this.SUBRULE2(this.anyToken)
                });
                this.OPTION(() => {
                    this.CONSUME(common.LBrace);
                    this.MANY1({
                        GATE: () => this.LA(1).tokenType !== common.RBrace && this.LA(1).tokenType !== common.EndUml && this.LA(1) !== EOF,
                        DEF: () => this.OR5([
                            { ALT: () => this.CONSUME3(common.Newline) },
                            { ALT: () => this.SUBRULE1(this.anyToken) }
                        ])
                    });
                    this.CONSUME(common.RBrace);
                });
            }}
        ]);
    });

    public timingDeclaration = this.RULE("timingDeclaration", () => {
        this.CONSUME(common.LBrace);
        this.MANY({
            GATE: () => this.LA(1).tokenType !== common.RBrace && this.LA(1).tokenType !== common.Newline && this.LA(1).tokenType !== common.EndUml && this.LA(1).tokenType !== EOF,
            DEF: () => this.SUBRULE(this.anyToken)
        });
        this.CONSUME(common.RBrace);
        this.OPTION(() => {
            this.CONSUME(lexer.Arrow);
            this.CONSUME1(common.LBrace);
            this.MANY1({
                GATE: () => this.LA(1).tokenType !== common.RBrace && this.LA(1).tokenType !== common.Newline && this.LA(1).tokenType !== common.EndUml && this.LA(1).tokenType !== EOF,
                DEF: () => this.SUBRULE1(this.anyToken)
            });
            this.CONSUME1(common.RBrace);
        });
        this.OPTION1(() => this.SUBRULE(this.payload));
        this.OPTION2(() => this.CONSUME(common.PosComment, { LABEL: "layout" }));
    });

    public autoactivateDeclaration = this.RULE("autoactivateDeclaration", () => {
        this.CONSUME(lexer.Autoactivate);
        this.OR([
            { ALT: () => this.CONSUME(lexer.On, { LABEL: "on" }) },
            { ALT: () => this.CONSUME(lexer.Off, { LABEL: "off" }) }
        ]);
    });

    public statement = this.RULE("statement", () => {
        this.OR([
            { GATE: () => this.isIgnored(), ALT: () => this.SUBRULE(this.ignoredStatement) },
            { ALT: () => this.SUBRULE(this.timingDeclaration) },
            { ALT: () => this.SUBRULE(this.autoactivateDeclaration) },
            { ALT: () => this.SUBRULE(this.participantDeclaration) },
            { GATE: () => this.isConnection(), ALT: () => this.SUBRULE(this.connectionDeclaration) },
            { ALT: () => this.SUBRULE(this.noteDeclaration) },
            { ALT: () => this.SUBRULE(this.refDeclaration) },
            { ALT: () => this.SUBRULE(this.blockDeclaration) },
            { ALT: () => {
                this.CONSUME(lexer.Autonumber);
                this.MANY(() => {
                    this.OR1([
                        { ALT: () => this.CONSUME(common.Identifier) },
                        { ALT: () => this.CONSUME(common.NumberToken) },
                        { ALT: () => this.CONSUME(common.Dot) },
                        { ALT: () => this.CONSUME(lexer.Stop) },
                        { ALT: () => this.CONSUME(lexer.Resume) },
                        { ALT: () => this.CONSUME(lexer.Inc) }
                    ]);
                });
                this.OPTION(() => this.CONSUME(common.StringLiteral));
            } },
            { ALT: () => {
                this.CONSUME(lexer.Ignore);
                this.MANY1(() => this.SUBRULE(this.anyToken));
            } },
            { ALT: () => { this.CONSUME(lexer.Activate); this.SUBRULE1(this.name, { LABEL: "activeNode" }); this.OPTION1(() => this.CONSUME(common.Color)); } },
            { ALT: () => { this.CONSUME(lexer.Deactivate); this.SUBRULE2(this.name, { LABEL: "activeNode" }); this.OPTION2(() => this.CONSUME1(common.Color)); } },
            { ALT: () => { this.CONSUME(lexer.Destroy); this.SUBRULE3(this.name, { LABEL: "activeNode" }); } },
            { ALT: () => { this.CONSUME(lexer.Bye); this.SUBRULE4(this.name, { LABEL: "activeNode" }); } },
            { ALT: () => {
                this.CONSUME(lexer.Return);
                this.OPTION3(() => this.SUBRULE(this.returnPayload));
            } },
            { ALT: () => {
                this.CONSUME(lexer.Delay);
                this.MANY2({
                    GATE: () => this.LA(1).tokenType !== common.Newline && this.LA(1).tokenType !== common.EndUml && this.LA(1).tokenType !== EOF,
                    DEF: () => this.SUBRULE7(this.anyToken)
                });
            } },
            { ALT: () => {
                this.CONSUME(lexer.Divider);
                this.MANY3({
                    GATE: () => this.LA(1).tokenType !== common.Newline && this.LA(1).tokenType !== common.EndUml && this.LA(1).tokenType !== EOF,
                    DEF: () => this.SUBRULE5(this.anyToken)
                });
            } },
            { ALT: () => {
                this.CONSUME(lexer.Create);
                this.OPTION4(() => this.OR5([
                    { ALT: () => this.CONSUME(lexer.Actor) },
                    { ALT: () => this.CONSUME(lexer.Boundary) },
                    { ALT: () => this.CONSUME(lexer.Control) },
                    { ALT: () => this.CONSUME(lexer.Entity) },
                    { ALT: () => this.CONSUME(lexer.Database) },
                    { ALT: () => this.CONSUME(lexer.Collections) },
                    { ALT: () => this.CONSUME(lexer.Queue) }
                ]));
                this.SUBRULE6(this.name);
            } },
            { ALT: () => {
                this.CONSUME(lexer.SpaceSeparator);
            } }
        ]);
    });

    private isIgnored(): boolean {
        const tok = this.LA(1).tokenType;
        return tok === common.Exclamation || tok === common.Skinparam || tok === common.Hide || tok === common.Show || tok === common.Page || tok === common.Header || tok === common.Footer || tok === common.Title || tok === lexer.Newpage || tok === lexer.Ignore || tok === lexer.Mainframe || tok === common.Slash;
    }

    private isConnection(): boolean {
        const t1 = this.LA(1).tokenType;
        if (t1 === lexer.Arrow) return true;
        let i = 1;
        while(true) {
            const tok = this.LA(i).tokenType;
            if (tok === lexer.Arrow) return true;
            if (tok === common.Newline || tok === common.EndUml || tok === EOF) return false;
            i++;
            if (i > 20) return false;
        }
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

export const parser = new SequenceParser();
