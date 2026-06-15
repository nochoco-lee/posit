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
            skipValidations: false,
            errorMessageProvider: fastErrorProvider
        });
        this.performSelfAnalysis();
    }

    public anyToken = this.RULE("anyToken", () => {
        this.OR([
            { ALT: () => this.CONSUME(common.IdentifierLike) },
            { ALT: () => this.CONSUME(lexer.Arrow) },
            { ALT: () => this.CONSUME(common.Comma) },
            { ALT: () => this.CONSUME(common.LParen) },
            { ALT: () => this.CONSUME(common.RParen) },
            { ALT: () => this.CONSUME(common.LBrace) },
            { ALT: () => this.CONSUME(common.RBrace) },
            { ALT: () => this.CONSUME(common.LBracket) },
            { ALT: () => this.CONSUME(common.RBracket) },
            { ALT: () => this.CONSUME(common.Colon) },
            { ALT: () => this.CONSUME(common.Star) },
            { ALT: () => this.CONSUME(common.VerticalBar) },
            { ALT: () => this.CONSUME(common.Dot) },
            { ALT: () => this.CONSUME(common.Slash) },
            { ALT: () => this.CONSUME(common.Backslash) },
            { ALT: () => this.CONSUME(common.Exclamation) },
            { ALT: () => this.CONSUME(common.QuestionMark) },
            { ALT: () => this.CONSUME(common.LAngle) },
            { ALT: () => this.CONSUME(common.RAngle) },
            { ALT: () => this.CONSUME(lexer.Delay) },
            { ALT: () => this.CONSUME(lexer.Divider) },
            { ALT: () => this.CONSUME(common.StringLiteral) },
            { ALT: () => this.CONSUME(common.Color) }
        ]);
    });

    public nodeIdentifier = this.RULE("nodeIdentifier", () => { this.CONSUME(common.IdentifierLike); });
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
                return next !== common.Newline && next !== common.Colon && next !== lexer.End && next !== common.EndUml && next !== EOF && next !== common.RBracket && next !== lexer.Else;
            },
            DEF: () => this.SUBRULE(this.anyToken)
        });
    });

    public payload = this.RULE("payload", () => {
        this.CONSUME(common.Colon);
        this.MANY({ 
            GATE: () => { const next = this.LA(1).tokenType; return next !== common.EndUml && next !== common.Newline; }, 
            DEF: () => this.SUBRULE(this.anyToken) 
        });
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
            { ALT: () => this.CONSUME(lexer.Queue) }
        ]);
        this.SUBRULE(this.name, { LABEL: "name" });
        this.MANY(() => {
            this.OR1([
                { ALT: () => { this.CONSUME(lexer.As); this.SUBRULE1(this.name, { LABEL: "alias" }); }},
                { GATE: () => { const next = this.LA(1).tokenType; return next === common.Identifier || next === common.StringLiteral || next === common.NumberToken || next === common.IdentifierLike; }, ALT: () => this.SUBRULE2(this.name, { LABEL: "alias" }) },
                { ALT: () => this.CONSUME(common.Color, { LABEL: "color" }) },
                { ALT: () => { this.CONSUME(lexer.Order); this.CONSUME(common.NumberToken, { LABEL: "order" }); } }
            ]);
        });
        this.OPTION(() => this.CONSUME(common.PosComment, { LABEL: "layout" }));
    });

    public connectionDeclaration = this.RULE("connectionDeclaration", () => {
        this.SUBRULE(this.name, { LABEL: "from" });
        this.CONSUME(lexer.Arrow, { LABEL: "arrow" });
        this.SUBRULE1(this.name, { LABEL: "to" });
        this.OPTION(() => { this.SUBRULE(this.payload); });
        this.OPTION1(() => this.CONSUME(common.PosComment, { LABEL: "layout" }));
    });

    public noteDeclaration = this.RULE("noteDeclaration", () => {
        this.CONSUME(lexer.Note);
        this.OR([
            { ALT: () => this.CONSUME(lexer.Left) },
            { ALT: () => this.CONSUME(lexer.Right) },
            { ALT: () => this.CONSUME(lexer.Over) },
            { ALT: () => this.CONSUME(lexer.Across) }
        ]);
        this.OPTION(() => this.OR1([ { ALT: () => this.CONSUME1(lexer.Of) }, { ALT: () => this.CONSUME1(lexer.On) } ]));
        this.OPTION1(() => {
            this.SUBRULE(this.name, { LABEL: "target" });
            this.MANY1(() => {
                this.CONSUME(common.Comma);
                this.SUBRULE1(this.name, { LABEL: "targets" });
            });
        });
        this.OR2([
            { ALT: () => this.SUBRULE(this.payload) },
            { ALT: () => {
                this.CONSUME(common.Newline);
                this.MANY2({
                    GATE: () => {
                        const t1 = this.LA(1).tokenType;
                        const t2 = this.LA(2).tokenType;
                        if (t1 === lexer.End && t2 === lexer.Note) return false;
                        if (t1 === common.EndUml || t1 === EOF) return false;
                        return true;
                    },
                    DEF: () => this.OR3([
                        { ALT: () => this.SUBRULE(this.anyToken) },
                        { ALT: () => this.CONSUME1(common.Newline) }
                    ])
                });
                this.CONSUME(lexer.End);
                this.CONSUME1(lexer.Note);
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
            { ALT: () => this.CONSUME(lexer.Box) }
        ]);
        this.SUBRULE(this.label);
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
    });

    public ignoredStatement = this.RULE("ignoredStatement", () => {
        this.OR([
            { ALT: () => this.CONSUME(common.Skinparam) },
            { ALT: () => this.CONSUME(common.Hide) },
            { ALT: () => this.CONSUME(common.Show) },
            { ALT: () => this.CONSUME(common.Page) },
            { ALT: () => this.CONSUME(common.Header) },
            { ALT: () => this.CONSUME(common.Footer) },
            { ALT: () => this.CONSUME(common.Title) },
            { ALT: () => this.CONSUME(lexer.Autoactivate) },
            { ALT: () => this.CONSUME(lexer.Newpage) }
        ]);
        this.MANY({
             GATE: () => this.LA(1).tokenType !== common.Newline && this.LA(1).tokenType !== common.LBrace && this.LA(1).tokenType !== common.EndUml,
             DEF: () => this.SUBRULE(this.anyToken)
        });
        this.OPTION(() => {
            this.CONSUME(common.LBrace);
            this.MANY1({
                GATE: () => this.LA(1).tokenType !== common.RBrace && this.LA(1).tokenType !== common.EndUml && this.LA(1).tokenType !== EOF,
                DEF: () => this.OR1([
                    { ALT: () => this.CONSUME(common.Newline) },
                    { ALT: () => this.SUBRULE1(this.anyToken) }
                ])
            });
            this.CONSUME(common.RBrace);
        });
    });

    public statement = this.RULE("statement", () => {
        this.OR([
            { GATE: this.isIgnored, ALT: () => this.SUBRULE(this.ignoredStatement) },
            { ALT: () => this.SUBRULE(this.participantDeclaration) },
            { GATE: this.isConnection, ALT: () => this.SUBRULE(this.connectionDeclaration) },
            { ALT: () => this.SUBRULE(this.noteDeclaration) },
            { ALT: () => this.SUBRULE(this.blockDeclaration) },
            { ALT: () => this.CONSUME(lexer.Autonumber) },
            { ALT: () => { this.CONSUME(lexer.Activate); this.SUBRULE(this.name, { LABEL: "activeNode" }); } },
            { ALT: () => { this.CONSUME(lexer.Deactivate); this.SUBRULE1(this.name, { LABEL: "activeNode" }); } },
            { ALT: () => { this.CONSUME(lexer.Destroy); this.SUBRULE2(this.name, { LABEL: "activeNode" }); } },
            { ALT: () => this.CONSUME(lexer.Return) },
            { ALT: () => this.CONSUME(lexer.Delay) },
            { ALT: () => this.CONSUME(lexer.Divider) }
        ]);
    });

    private isIgnored(): boolean {
        const tok = this.LA(1).tokenType;
        return tok === common.Skinparam || tok === common.Hide || tok === common.Show || tok === common.Page || tok === common.Header || tok === common.Footer || tok === common.Title || tok === lexer.Autoactivate || tok === lexer.Newpage;
    }

    private isConnection(): boolean {
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
