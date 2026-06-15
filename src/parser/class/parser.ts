import { CstParser, EOF, defaultParserErrorProvider } from "chevrotain";
import * as lexer from "./lexer";
import * as common from "../common/tokens";

const fastErrorProvider = {
    ...defaultParserErrorProvider,
    buildNoViableAltMessage: (options: any) => {
        return `Expecting one of the possible Token sequences, but found: '${options.actual[0].image}'`;
    }
};

export class ClassParser extends CstParser {
    constructor() {
        super(lexer.allClassTokens, { 
            skipValidations: false,
            errorMessageProvider: fastErrorProvider
        });
        this.performSelfAnalysis();
    }

    public anyToken = this.RULE("anyToken", () => {
        this.OR([
            { ALT: () => this.CONSUME(common.Identifier) },
            { ALT: () => this.CONSUME(common.NumberToken) },
            { ALT: () => this.CONSUME(common.StringLiteral) },
            { ALT: () => this.CONSUME(common.Color) },
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
            { ALT: () => this.CONSUME(lexer.Visibility) },
            { ALT: () => this.CONSUME(common.Skinparam) },
            { ALT: () => this.CONSUME(lexer.Class) },
            { ALT: () => this.CONSUME(lexer.Interface) },
            { ALT: () => this.CONSUME(lexer.Enum) },
            { ALT: () => this.CONSUME(lexer.Struct) },
            { ALT: () => this.CONSUME(lexer.Annotation) },
            { ALT: () => this.CONSUME(lexer.Abstract) },
            { ALT: () => this.CONSUME(lexer.Extends) },
            { ALT: () => this.CONSUME(lexer.Implements) }
        ]);
    });

    public nodeIdentifier = this.RULE("nodeIdentifier", () => {
        this.OR([
            { ALT: () => this.CONSUME(common.Identifier) },
            { ALT: () => this.CONSUME(common.NumberToken) },
            { ALT: () => this.CONSUME(lexer.Class) },
            { ALT: () => this.CONSUME(lexer.Interface) },
            { ALT: () => this.CONSUME(lexer.Enum) },
            { ALT: () => this.CONSUME(lexer.Struct) },
            { ALT: () => this.CONSUME(lexer.Annotation) },
            { ALT: () => this.CONSUME(lexer.Abstract) }
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

    public memberLabel = this.RULE("memberLabel", () => { this.AT_LEAST_ONE({ GATE: () => { const next = this.LA(1).tokenType; return next !== common.Newline && next !== common.RBrace && next !== common.EndUml; }, DEF: () => this.SUBRULE(this.anyToken) }); });
    public classMember = this.RULE("classMember", () => { this.MANY(() => { this.OR([ { ALT: () => this.CONSUME(lexer.Visibility) }, { ALT: () => this.CONSUME(lexer.StaticModifier) }, { ALT: () => this.CONSUME(lexer.AbstractModifier) }, { ALT: () => this.CONSUME(lexer.FieldMarker) }, { ALT: () => this.CONSUME(lexer.MethodMarker) } ]); }); this.SUBRULE(this.memberLabel, { LABEL: "tokens" }); });

    public classDeclaration = this.RULE("classDeclaration", () => {
        this.OR([
            {
                GATE: () => {
                    const t1 = this.LA(1).tokenType;
                    const isClassKeyword = t1 === lexer.Visibility || t1 === lexer.Class || t1 === lexer.Interface || t1 === lexer.Enum || t1 === lexer.Struct || t1 === lexer.Annotation || t1 === lexer.Abstract;
                    if (!isClassKeyword) return false;
                    let i = 2;
                    while (true) { const tok = this.LA(i).tokenType; if (tok === lexer.Arrow) return false; if (tok === common.Newline || tok === common.EndUml || tok === EOF) break; i++; }
                    return true;
                },
                ALT: () => {
                    this.OPTION(() => this.CONSUME(lexer.Visibility));
                    this.OR1([ { ALT: () => this.CONSUME(lexer.Class) }, { ALT: () => this.CONSUME(lexer.Interface) }, { ALT: () => this.CONSUME(lexer.Enum) }, { ALT: () => this.CONSUME(lexer.Struct) }, { ALT: () => this.CONSUME(lexer.Annotation) }, { ALT: () => { this.CONSUME(lexer.Abstract); this.OPTION1(() => this.CONSUME1(lexer.Class)); } } ]);
                    this.SUBRULE(this.name, { LABEL: "name" });
                    this.MANY(() => {
                        this.OR2([
                            { GATE: () => this.LA(1).tokenType === lexer.Extends || this.LA(1).tokenType === lexer.Implements, ALT: () => { this.OR3([ { ALT: () => this.CONSUME(lexer.Extends) }, { ALT: () => this.CONSUME(lexer.Implements) } ]); this.SUBRULE1(this.name, { LABEL: "parents" }); } },
                            { ALT: () => this.SUBRULE(this.colorValue, { LABEL: "color" }) }
                        ]);
                    });
                    this.OPTION2(() => this.CONSUME(common.PosComment, { LABEL: "layout" }));
                    this.OR4([ { ALT: () => { this.CONSUME(common.LBrace); this.MANY5({ GATE: () => this.LA(1).tokenType !== common.RBrace && this.LA(1).tokenType !== EOF, DEF: () => { this.OR5([ { ALT: () => this.CONSUME1(common.Newline) }, { ALT: () => this.SUBRULE(this.classMember) } ]); } }); this.CONSUME(common.RBrace); } }, { ALT: () => this.CONSUME2(common.Newline) } ]);
                }
            },
            {
                GATE: () => {
                    let i = 1; while (true) { const tok = this.LA(i).tokenType; if (tok === common.Identifier || tok === common.Dot || tok === common.StringLiteral || tok === common.NumberToken) i++; else break; }
                    return this.LA(i).tokenType === common.LBrace;
                },
                ALT: () => {
                    this.SUBRULE3(this.name, { LABEL: "name" });
                    this.CONSUME1(common.LBrace);
                    this.MANY7({ GATE: () => this.LA(1).tokenType !== common.RBrace && this.LA(1).tokenType !== EOF, DEF: () => { this.OR7([ { ALT: () => this.CONSUME3(common.Newline) }, { ALT: () => this.SUBRULE1(this.classMember) } ]); } });
                    this.CONSUME1(common.RBrace);
                }
            }
        ]);
    });

    public colorValue = this.RULE("colorValue", () => { this.OR([ { ALT: () => this.CONSUME(common.Color) }, { ALT: () => { this.CONSUME(lexer.Visibility); this.CONSUME(common.Identifier); } }]); });

    public connectionDeclaration = this.RULE("connectionDeclaration", () => {
        this.SUBRULE1(this.name, { LABEL: "from" });
        this.CONSUME(lexer.Arrow, { LABEL: "arrow" });
        this.SUBRULE2(this.name, { LABEL: "to" });
        this.OPTION(() => { this.CONSUME(common.Colon); this.SUBRULE(this.memberLabel, { LABEL: "payload" }); });
        this.OPTION1(() => this.CONSUME(common.PosComment, { LABEL: "layout" }));
    });

    public ignoredStatement = this.RULE("ignoredStatement", () => {
        this.OR([
            { ALT: () => this.CONSUME(common.Skinparam) },
            { ALT: () => this.CONSUME(common.Hide) },
            { ALT: () => this.CONSUME(common.Show) },
            { ALT: () => this.CONSUME(common.Page) },
            { ALT: () => this.CONSUME(common.Header) },
            { ALT: () => this.CONSUME(common.Footer) },
            { ALT: () => this.CONSUME(common.Title) }
        ]);
        this.MANY(() => this.SUBRULE(this.anyToken));
    });

    public statement = this.RULE("statement", () => {
        this.OR([
            { GATE: this.isIgnored, ALT: () => this.SUBRULE(this.ignoredStatement) },
            { ALT: () => this.SUBRULE(this.classDeclaration) },
            { GATE: this.isConnection, ALT: () => this.SUBRULE(this.connectionDeclaration) }
        ]);
    });

    private isIgnored(): boolean {
        const tok = this.LA(1).tokenType;
        return tok === common.Skinparam || tok === common.Hide || tok === common.Show || tok === common.Page || tok === common.Header || tok === common.Footer || tok === common.Title;
    }

    private isConnection(): boolean {
        let i = 1;
        while(true) {
            const tok = this.LA(i).tokenType;
            if (tok === lexer.Arrow) return true;
            if (tok === common.Newline || tok === common.EndUml || tok === EOF) return false;
            i++;
            if (i > 10) return false;
        }
    }

    public diagram = this.RULE("diagram", () => {
        this.MANY(() => {
            this.OR([
                { ALT: () => this.CONSUME(common.Newline) },
                { ALT: () => this.CONSUME(common.StartUml) },
                { ALT: () => this.SUBRULE(this.statement) },
                { ALT: () => this.CONSUME(common.EndUml) }
            ]);
        });
    });
}

export const parser = new ClassParser();
