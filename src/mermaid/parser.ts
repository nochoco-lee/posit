import { CstParser, EOF } from "chevrotain";
import {
    allMeTokens,
    Keyword,
    Symbol,
    SequenceDiagramHdr,
    ClassDiagramHdr,
    FlowchartHdr,
    Participant,
    Actor,
    Activate,
    Deactivate,
    Note,
    RightOf,
    LeftOf,
    Over,
    Loop,
    Alt,
    Else,
    Opt,
    Par,
    Critical,
    Option,
    And,
    Rect,
    Autonumber,
    Box,
    Create,
    Destroy,
    Break,
    Class,
    Interface,
    Identifier,
    As,
    End,
    PosComment,
    Arrow,
    Newline,
    Colon,
    Comma,
    StringLiteral,
    BacktickIdentifier,
    DirType,
    Plus,
    Minus,
    Hash,
    Tilde,
    LParen,
    RParen,
    LBrace,
    RBrace,
    LBracket,
    RBracket,
    VerticalBar,
    Ampersand,
    LShape,
    RShape,
    Percent,
    At,
    Exclamation,
    QuestionMark,
    Semicolon,
    Star,
    Slash,
    Backslash,
    Quote,
    LAngle,
    RAngle,
    Equal,
    Subgraph,
    Click,
    Link,
    Links,
    Direction,
    Namespace,
    Callback,
    Style,
    ClassDef
} from "./lexer";

class MermaidParser extends CstParser {
    constructor() {
        super(allMeTokens, {
            errorMessageProvider: {
                buildMismatchTokenMessage: (options: any) => `Expecting token of type --> ${options.expected.name} <-- but found --> '${options.actual.image}' <--`,
                buildNoViableAltMessage: (options: any) => `Expecting one of the possible Token sequences, but found: '${options.actual[0].image}'`,
                buildEarlyExitMessage: (options: any) => `Expecting at least one iteration which starts with one of these tokens: [${options.expectedIterationPaths.map((p: any) => p[0].name).join(", ")}], but found: '${options.actual[0].image}'`,
                buildNotAllInputParsedMessage: (options: any) => `Redundant input, expecting EOF but found: ${options.firstRedundant.image}`
            },
            skipValidations: true
        });
        this.performSelfAnalysis();
    }

    public diagram = this.RULE("diagram", () => {
        this.MANY(() => this.CONSUME(Newline));
        this.OR([
            { ALT: () => {
                this.CONSUME(SequenceDiagramHdr);
                this.OPTION(() => this.CONSUME(Autonumber));
                this.MANY1(() => this.SUBRULE(this.sequenceStatement));
            }},
            { ALT: () => {
                this.CONSUME(ClassDiagramHdr);
                this.MANY2(() => this.SUBRULE(this.classStatement));
            }},
            { ALT: () => {
                this.CONSUME(FlowchartHdr);
                this.OPTION1(() => this.CONSUME(DirType));
                this.MANY3(() => this.SUBRULE(this.flowchartStatement));
            }}
        ]);
        this.MANY4(() => this.CONSUME1(Newline));
    });

    public sequenceStatement = this.RULE("sequenceStatement", () => {
        this.OR([
            { ALT: () => this.CONSUME(Newline) },
            { ALT: () => this.SUBRULE(this.participantDeclaration) },
            { ALT: () => this.SUBRULE(this.activateDeclaration) },
            { ALT: () => this.SUBRULE(this.noteDeclaration) },
            { ALT: () => this.SUBRULE(this.blockDeclaration) },
            { GATE: this.isConnection, ALT: () => this.SUBRULE(this.connectionDeclaration) },
            { ALT: () => this.CONSUME(Autonumber) },
            { ALT: () => this.CONSUME(PosComment) },
            { ALT: () => this.SUBRULE(this.ignoredStatement) }
        ]);
    });

    public classStatement = this.RULE("classStatement", () => {
        this.OR([
            { ALT: () => this.CONSUME(Newline) },
            { ALT: () => this.SUBRULE(this.classDeclaration) },
            { GATE: this.isMemberDecl, ALT: () => this.SUBRULE(this.memberDeclaration) },
            { GATE: this.isConnection, ALT: () => this.SUBRULE(this.connectionDeclaration) },
            { ALT: () => this.SUBRULE(this.noteDeclaration) },
            { ALT: () => this.SUBRULE(this.namespaceDeclaration) },
            { ALT: () => this.CONSUME(Direction) },
            { ALT: () => this.CONSUME(DirType) },
            { ALT: () => this.SUBRULE(this.styleDeclaration) },
            { ALT: () => this.SUBRULE(this.callbackDeclaration) },
            { ALT: () => this.SUBRULE(this.classDefDeclaration) },
            { GATE: () => this.LA(1).tokenType === LAngle, ALT: () => this.SUBRULE(this.stereotypeDeclaration) },
            { ALT: () => this.CONSUME(PosComment) },
            { ALT: () => this.SUBRULE(this.ignoredStatement) }
        ]);
    });

    public flowchartStatement = this.RULE("flowchartStatement", () => {
        this.OR([
            { ALT: () => this.CONSUME(Newline) },
            { ALT: () => this.SUBRULE(this.subgraphDeclaration) },
            { GATE: this.isConnection, ALT: () => this.SUBRULE(this.connectionDeclaration) },
            { GATE: this.isFlowchartNode, ALT: () => this.SUBRULE(this.flowchartNodeDeclaration) },
            { ALT: () => this.CONSUME(Direction) },
            { ALT: () => this.CONSUME(DirType) },
            { ALT: () => this.CONSUME(PosComment) },
            { ALT: () => this.SUBRULE(this.ignoredStatement) }
        ]);
    });

    private isConnection(): boolean {
        let la = 1;
        let t = this.LA(la);
        while (t.tokenType === Quote || t.tokenType === StringLiteral || t.tokenType === LParen || t.tokenType === RParen) { la++; t = this.LA(la); }
        if (t.tokenType !== Identifier && t.tokenType !== Keyword && t.tokenType !== BacktickIdentifier) return false;
        la++; t = this.LA(la);
        while (t.tokenType === Symbol || t.tokenType === Star || t.tokenType === Hash || t.tokenType === LAngle || t.tokenType === VerticalBar || t.tokenType === LParen || t.tokenType === RParen || t.tokenType === StringLiteral) { la++; t = this.LA(la); }
        return t.tokenType === Arrow;
    }

    private isMemberDecl(): boolean {
        const t1 = this.LA(1).tokenType;
        const t2 = this.LA(2).tokenType;
        return (t1 === Identifier || t1 === Keyword) && t2 === Colon;
    }

    private isFlowchartNode(): boolean {
        const t1 = this.LA(1).tokenType;
        return (t1 === Identifier || t1 === StringLiteral || t1 === Keyword) && t1 !== End;
    }

    private isInsideBlockBody(): boolean {
        const t1 = this.LA(1).tokenType;
        return t1 !== End && t1 !== Else && t1 !== And && t1 !== Option;
    }

    public ignoredStatement = this.RULE("ignoredStatement", () => {
        this.OR([
            { ALT: () => this.CONSUME(At) },
            { ALT: () => this.CONSUME(Percent) },
            { ALT: () => this.CONSUME(Exclamation) },
            { ALT: () => this.CONSUME(QuestionMark) },
            { ALT: () => this.CONSUME(Semicolon) },
            { ALT: () => this.CONSUME(Star) },
            { ALT: () => this.CONSUME(Slash) },
            { ALT: () => this.CONSUME(Backslash) },
            { ALT: () => this.CONSUME(Ampersand) },
            { ALT: () => this.CONSUME(Click) },
            { ALT: () => this.CONSUME(Link) },
            { ALT: () => this.CONSUME(Links) }
        ]);
        this.MANY(() => this.SUBRULE(this.anyToken));
    });

    public anyToken = this.RULE("anyToken", () => {
        this.OR([
            { ALT: () => this.CONSUME(Identifier) },
            { ALT: () => this.CONSUME(Keyword) },
            { ALT: () => this.CONSUME(Symbol) },
            { ALT: () => this.CONSUME(StringLiteral) },
            { ALT: () => this.CONSUME(BacktickIdentifier) },
            { ALT: () => this.CONSUME(Arrow) },
            { ALT: () => this.CONSUME(LParen) },
            { ALT: () => this.CONSUME(RParen) },
            { ALT: () => this.CONSUME(LAngle) },
            { ALT: () => this.CONSUME(RAngle) },
            { ALT: () => this.CONSUME(Comma) }
        ]);
    });

    public genericName = this.RULE("genericName", () => {
        this.AT_LEAST_ONE({
            GATE: () => {
                const t = this.LA(1).tokenType;
                return t !== Newline && t !== Colon && t !== VerticalBar && t !== Arrow && t !== EOF && t !== At && t !== As && t !== LBrace && t !== RBrace && t !== LParen && t !== RParen && t !== LAngle && t !== RAngle && t !== Comma;
            },
            DEF: () => this.SUBRULE(this.anyToken)
        });
    });

    public participantDeclaration = this.RULE("participantDeclaration", () => {
        this.OR([
            { ALT: () => {
                this.OR1([ { ALT: () => this.CONSUME(Create) }, { ALT: () => this.CONSUME(Destroy) } ]);
                this.OPTION(() => this.OR2([ { ALT: () => this.CONSUME1(Participant) }, { ALT: () => this.CONSUME1(Actor) } ]));
                this.SUBRULE(this.genericName, { LABEL: "name" });
            }},
            { ALT: () => {
                this.OR3([ { ALT: () => this.CONSUME2(Participant) }, { ALT: () => this.CONSUME2(Actor) } ]);
                this.SUBRULE1(this.genericName, { LABEL: "name" });
            }}
        ]);
        this.OPTION2(() => this.SUBRULE(this.metadata));
        this.OPTION3(() => {
            this.CONSUME(As);
            this.SUBRULE1(this.payload, { LABEL: "alias" });
        });
        this.OPTION4(() => this.CONSUME(PosComment, { LABEL: "layout" }));
    });

    public metadata = this.RULE("metadata", () => {
        this.CONSUME(At);
        this.CONSUME(LBrace);
        this.MANY({
            GATE: () => this.LA(1).tokenType !== RBrace,
            DEF: () => this.SUBRULE(this.anyToken)
        });
        this.CONSUME(RBrace);
    });

    public activateDeclaration = this.RULE("activateDeclaration", () => {
        this.OR([
            { ALT: () => this.CONSUME(Activate) },
            { ALT: () => this.CONSUME(Deactivate) }
        ]);
        this.SUBRULE(this.genericName, { LABEL: "name" });
    });

    public payload = this.RULE("payload", () => {
        this.MANY({
            GATE: () => {
                const t = this.LA(1).tokenType;
                return t !== RBrace && t !== Newline && t !== VerticalBar && t !== RShape && t !== EOF;
            },
            DEF: () => this.SUBRULE(this.anyToken)
        });
    });

    public noteDeclaration = this.RULE("noteDeclaration", () => {
        this.CONSUME(Note);
        this.OR([
            { ALT: () => { this.CONSUME(RightOf); this.SUBRULE(this.genericName, { LABEL: "target" }); } },
            { ALT: () => { this.CONSUME(LeftOf); this.SUBRULE1(this.genericName, { LABEL: "target" }); } },
            { ALT: () => { this.CONSUME(Over); this.SUBRULE2(this.genericName, { LABEL: "target" }); } },
            { 
                GATE: () => {
                    const t = this.LA(1).tokenType;
                    return t !== RightOf && t !== LeftOf && t !== Over;
                },
                ALT: () => {
                    this.OPTION(() => this.CONSUME(Identifier, { LABEL: "forKeyword" }));
                    this.SUBRULE3(this.genericName, { LABEL: "target" });
                }
            }
        ]);
        this.MANY(() => {
            this.CONSUME(Comma);
            this.SUBRULE4(this.genericName, { LABEL: "targets" });
        });
        this.OR1([
            { ALT: () => {
                this.CONSUME(Colon);
                this.SUBRULE(this.payload, { LABEL: "text" });
            }},
            { 
                GATE: () => this.LA(1).tokenType !== Colon,
                ALT: () => this.SUBRULE5(this.payload, { LABEL: "textName" }) 
            }
        ]);
    });

    public blockDeclaration = this.RULE("blockDeclaration", () => {
        this.OR([
            { ALT: () => this.CONSUME(Loop) },
            { ALT: () => this.CONSUME(Alt) },
            { ALT: () => this.CONSUME(Opt) },
            { ALT: () => this.CONSUME(Par) },
            { ALT: () => this.CONSUME(Critical) },
            { ALT: () => this.CONSUME(Rect) },
            { ALT: () => this.CONSUME(Box) },
            { ALT: () => this.CONSUME(Break) }
        ]);
        this.OPTION(() => this.SUBRULE(this.payload, { LABEL: "label" }));
        this.MANY1({ GATE: this.isInsideBlockBody, DEF: () => this.SUBRULE(this.sequenceStatement) });
        this.MANY2(() => {
            this.OR1([ { ALT: () => this.CONSUME(Else) }, { ALT: () => this.CONSUME(Option) }, { ALT: () => this.CONSUME(And) } ]);
            this.OPTION1(() => this.SUBRULE1(this.genericName, { LABEL: "elseLabel" }));
            this.MANY3({ GATE: this.isInsideBlockBody, DEF: () => this.SUBRULE1(this.sequenceStatement) });
        });
        this.CONSUME(End);
    });

    public classDeclaration = this.RULE("classDeclaration", () => {
        this.OR([
            { ALT: () => this.CONSUME(Class) },
            { ALT: () => this.CONSUME(Interface) }
        ]);
        this.SUBRULE(this.genericName, { LABEL: "name" });
        this.OPTION(() => {
            this.CONSUME(Colon);
            this.CONSUME1(Colon);
            this.CONSUME2(Colon);
            this.SUBRULE1(this.genericName, { LABEL: "styleClass" });
        });
        this.OPTION1(() => {
            this.OR1([
                { ALT: () => this.SUBRULE(this.metadata) },
                { ALT: () => {
                    this.CONSUME(LBrace);
                    this.MANY({
                        GATE: () => this.LA(1).tokenType !== RBrace,
                        DEF: () => {
                            this.OR2([
                                { GATE: this.isClassMember, ALT: () => this.SUBRULE(this.classMemberLine) },
                                { ALT: () => this.SUBRULE(this.classStatement) }
                            ]);
                        }
                    });
                    this.CONSUME(RBrace);
                }}
            ]);
        });
        this.OPTION2(() => this.CONSUME(PosComment, { LABEL: "layout" }));
    });

    private isClassMember(): boolean {
        const t1 = this.LA(1).tokenType;
        return t1 === Plus || t1 === Minus || t1 === Hash || t1 === Tilde || t1 === Identifier || t1 === Keyword || t1 === LAngle;
    }

    public classMemberLine = this.RULE("classMemberLine", () => {
        this.OPTION(() => {
            this.OR([
                { ALT: () => this.CONSUME(Plus) },
                { ALT: () => this.CONSUME(Minus) },
                { ALT: () => this.CONSUME(Hash) },
                { ALT: () => this.CONSUME(Tilde) }
            ]);
        });
        this.AT_LEAST_ONE({
            GATE: () => this.LA(1).tokenType !== Newline && this.LA(1).tokenType !== RBrace,
            DEF: () => this.SUBRULE(this.anyToken)
        });
        this.MANY(() => this.CONSUME(Newline));
    });

    public memberDeclaration = this.RULE("memberDeclaration", () => {
        this.SUBRULE(this.genericName, { LABEL: "className" });
        this.CONSUME(Colon);
        this.SUBRULE(this.classMemberLine);
    });

    public namespaceDeclaration = this.RULE("namespaceDeclaration", () => {
        this.CONSUME(Namespace);
        this.SUBRULE(this.genericName, { LABEL: "name" });
        this.OPTION(() => this.SUBRULE(this.metadata));
        this.CONSUME(LBrace);
        this.MANY({
            GATE: () => this.LA(1).tokenType !== RBrace,
            DEF: () => this.SUBRULE(this.classStatement)
        });
        this.CONSUME(RBrace);
    });

    public styleDeclaration = this.RULE("styleDeclaration", () => {
        this.CONSUME(Style);
        this.SUBRULE(this.genericName, { LABEL: "name" });
        this.MANY(() => this.SUBRULE(this.anyToken));
    });

    public callbackDeclaration = this.RULE("callbackDeclaration", () => {
        this.OR([
            { ALT: () => this.CONSUME(Callback) },
            { ALT: () => this.CONSUME(Click) },
            { ALT: () => this.CONSUME(Link) }
        ]);
        this.SUBRULE(this.genericName, { LABEL: "name" });
        this.MANY(() => this.SUBRULE(this.anyToken));
    });

    public classDefDeclaration = this.RULE("classDefDeclaration", () => {
        this.CONSUME(ClassDef);
        this.SUBRULE(this.genericName, { LABEL: "name" });
        this.MANY(() => this.SUBRULE(this.anyToken));
    });

    public stereotypeDeclaration = this.RULE("stereotypeDeclaration", () => {
        this.CONSUME(LAngle);
        this.CONSUME1(LAngle);
        this.SUBRULE(this.genericName, { LABEL: "name" });
        this.CONSUME(RAngle);
        this.CONSUME1(RAngle);
        this.OPTION(() => this.SUBRULE1(this.genericName, { LABEL: "target" }));
    });

    public connectionDeclaration = this.RULE("connectionDeclaration", () => {
        this.SUBRULE(this.genericName, { LABEL: "from" });
        this.MANY({
            GATE: () => {
                let la = 1;
                let t = this.LA(la);
                while (t.tokenType === Plus || t.tokenType === Minus || t.tokenType === Star || t.tokenType === Hash || t.tokenType === LAngle || t.tokenType === VerticalBar || t.tokenType === LParen || t.tokenType === RParen) {
                    la++; t = this.LA(la);
                }
                if (t.tokenType === StringLiteral) { la++; t = this.LA(la); }
                return t.tokenType === Arrow;
            },
            DEF: () => {
                this.OPTION(() => {
                    this.OR([
                        { ALT: () => { this.CONSUME(LParen); this.CONSUME(RParen); } },
                        { ALT: () => this.CONSUME1(Plus) },
                        { ALT: () => this.CONSUME(Minus) },
                        { ALT: () => this.CONSUME(Star) },
                        { ALT: () => this.CONSUME(Hash) },
                        { ALT: () => this.CONSUME(LAngle) },
                        { ALT: () => this.CONSUME2(VerticalBar) }
                    ]);
                });
                this.OPTION1(() => this.CONSUME(StringLiteral, { LABEL: "multiplicity1" }));
                this.CONSUME(Arrow, { LABEL: "arrow" });
                this.OPTION2(() => {
                    this.OR3([
                        { ALT: () => { this.CONSUME3(LParen); this.CONSUME4(RParen); } },
                        { ALT: () => this.CONSUME5(VerticalBar) }
                    ]);
                });
                this.OPTION3(() => this.CONSUME(StringLiteral, { LABEL: "multiplicity2" }));
                this.MANY1(() => {
                    this.OR1([
                        { ALT: () => { this.CONSUME6(VerticalBar); this.SUBRULE(this.payload, { LABEL: "edgeLabel" }); this.CONSUME7(VerticalBar); } },
                        { ALT: () => this.OR2([{ ALT: () => this.CONSUME1(Plus) }, { ALT: () => this.CONSUME1(Minus) }]) }
                    ]);
                });
                this.SUBRULE1(this.genericName, { LABEL: "to" });
            }
        });
        this.OPTION4(() => {
            this.OR4([
                { ALT: () => { this.CONSUME(Colon); this.SUBRULE1(this.payload, { LABEL: "payload" }); } },
                { ALT: () => { this.CONSUME(VerticalBar); this.SUBRULE2(this.payload, { LABEL: "edgeLabel2" }); this.CONSUME1(VerticalBar); } }
            ]);
        });
        this.OPTION5(() => this.CONSUME(PosComment, { LABEL: "layout" }));
    });

    public flowchartNodeDeclaration = this.RULE("flowchartNodeDeclaration", () => {
        this.SUBRULE(this.genericName, { LABEL: "id" });
        this.OPTION(() => {
            this.OR([
                { ALT: () => { this.CONSUME(LShape); this.SUBRULE(this.payload, { LABEL: "label" }); this.CONSUME(RShape); } },
                { ALT: () => { 
                    this.OPTION1(() => this.CONSUME(At));
                    this.CONSUME(LBrace); 
                    this.SUBRULE1(this.payload, { LABEL: "label" }); 
                    this.CONSUME(RBrace); 
                } }
            ]);
        });
        this.OPTION2(() => this.CONSUME(PosComment, { LABEL: "layout" }));
    });

    public subgraphDeclaration = this.RULE("subgraphDeclaration", () => {
        this.CONSUME(Subgraph);
        this.SUBRULE(this.genericName, { LABEL: "id" });
        this.OPTION(() => {
            this.CONSUME(LBracket);
            this.SUBRULE1(this.genericName, { LABEL: "label" });
            this.CONSUME(RBracket);
        });
        this.MANY(() => this.SUBRULE(this.flowchartStatement));
        this.CONSUME(End);
    });
}

export const parser = new MermaidParser();
