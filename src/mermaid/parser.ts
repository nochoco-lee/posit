import { CstParser } from "chevrotain";
import {
    allMeTokens,
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
    And,
    Rect,
    Autonumber,
    Box,
    Create,
    Destroy,
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
    Word,
    Quote,
    LAngle,
    RAngle,
    Subgraph,
    Direction
} from "./lexer";

class MermaidParser extends CstParser {
    constructor() {
        super(allMeTokens);
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
        if (t.tokenType !== Identifier && t.tokenType !== StringLiteral && t.tokenType !== BacktickIdentifier && t.tokenType !== Word) return false;
        la++;
        t = this.LA(la);
        if (t.tokenType === Plus || t.tokenType === Minus) {
            la++;
            t = this.LA(la);
        }
        return t.tokenType === Arrow;
    }

    private isMemberDecl(): boolean {
        const t1 = this.LA(1).tokenType;
        const t2 = this.LA(2).tokenType;
        const isName = t1 === Identifier || t1 === StringLiteral || t1 === BacktickIdentifier || t1 === Word;
        return isName && t2 === Colon;
    }

    private isFlowchartNode(): boolean {
        const t1 = this.LA(1).tokenType;
        const t2 = this.LA(2).tokenType;
        return (t1 === Identifier || t1 === Word) && (t2 === LShape || t2 === LBrace || t2 === LBracket || t2 === LParen);
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
            { ALT: () => this.CONSUME(And) }
        ]);
        this.MANY(() => this.SUBRULE(this.anyToken));
    });

    public anyToken = this.RULE("anyToken", () => {
        this.OR([
            { ALT: () => this.CONSUME(Identifier) },
            { ALT: () => this.CONSUME(StringLiteral) },
            { ALT: () => this.CONSUME(BacktickIdentifier) },
            { ALT: () => this.CONSUME(Word) },
            { ALT: () => this.CONSUME(LParen) },
            { ALT: () => this.CONSUME(RParen) },
            { ALT: () => this.CONSUME(LBrace) },
            { ALT: () => this.CONSUME(LBracket) },
            { ALT: () => this.CONSUME(RBracket) },
            { ALT: () => this.CONSUME(LShape) },
            { ALT: () => this.CONSUME(RShape) },
            { ALT: () => this.CONSUME(VerticalBar) },
            { ALT: () => this.CONSUME(Colon) },
            { ALT: () => this.CONSUME(Comma) },
            { ALT: () => this.CONSUME(Plus) },
            { ALT: () => this.CONSUME(Minus) },
            { ALT: () => this.CONSUME(Hash) },
            { ALT: () => this.CONSUME(Tilde) },
            { ALT: () => this.CONSUME(Arrow) },
            { ALT: () => this.CONSUME(Quote) },
            { ALT: () => this.CONSUME(As) },
            { ALT: () => this.CONSUME(LAngle) },
            { ALT: () => this.CONSUME(RAngle) },
            { ALT: () => this.CONSUME(Star) },
            { ALT: () => this.CONSUME(Slash) },
            { ALT: () => this.CONSUME(Backslash) }
        ]);
    });

    public genericName = this.RULE("genericName", () => {
        this.OR([
            { ALT: () => this.CONSUME(Identifier) },
            { ALT: () => this.CONSUME(StringLiteral) },
            { ALT: () => this.CONSUME(BacktickIdentifier) },
            { ALT: () => this.CONSUME(Word) }
        ]);
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
        this.OPTION1(() => {
            this.CONSUME(LParen);
            this.SUBRULE(this.payload, { LABEL: "label" });
            this.CONSUME(RParen);
        });
        this.OPTION2(() => this.SUBRULE(this.metadata));
        this.OPTION3(() => {
            this.CONSUME(As);
            this.SUBRULE1(this.payload, { LABEL: "alias" });
        });
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
                return t !== RBrace && t !== Newline && t !== VerticalBar && t !== RParen;
            },
            DEF: () => this.SUBRULE(this.anyToken)
        });
    });

    public noteDeclaration = this.RULE("noteDeclaration", () => {
        this.CONSUME(Note);
        this.OR([
            { ALT: () => this.CONSUME(RightOf) },
            { ALT: () => this.CONSUME(LeftOf) },
            { ALT: () => this.CONSUME(Over) },
            { ALT: () => {
                this.OPTION(() => this.CONSUME(Identifier, { LABEL: "forKeyword" }));
                this.SUBRULE(this.genericName, { LABEL: "target" });
            }}
        ]);
        this.MANY(() => {
            this.CONSUME(Comma);
            this.SUBRULE1(this.genericName, { LABEL: "targets" });
        });
        this.OR1([
            { ALT: () => {
                this.CONSUME(Colon);
                this.SUBRULE(this.payload, { LABEL: "text" });
            }},
            { ALT: () => this.SUBRULE2(this.genericName, { LABEL: "textName" }) }
        ]);
    });

    public blockDeclaration = this.RULE("blockDeclaration", () => {
        this.OR([
            { ALT: () => this.CONSUME(Loop) },
            { ALT: () => this.CONSUME(Alt) },
            { ALT: () => this.CONSUME(Opt) },
            { ALT: () => this.CONSUME(Par) },
            { ALT: () => this.CONSUME(Rect) },
            { ALT: () => this.CONSUME(Box) }
        ]);
        this.OPTION(() => this.SUBRULE(this.genericName, { LABEL: "label" }));
        this.MANY1(() => this.SUBRULE(this.sequenceStatement));
        this.MANY2(() => {
            this.OR1([ { ALT: () => this.CONSUME(Else) }, { ALT: () => this.CONSUME(And) } ]);
            this.OPTION1(() => this.SUBRULE1(this.genericName, { LABEL: "elseLabel" }));
            this.MANY3(() => this.SUBRULE1(this.sequenceStatement));
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
            this.OR1([
                { ALT: () => this.SUBRULE(this.metadata) },
                { ALT: () => {
                    this.CONSUME(LBrace);
                    this.MANY(() => {
                        this.OR2([
                            { GATE: this.isClassMember, ALT: () => this.SUBRULE(this.classMemberLine) },
                            { ALT: () => this.SUBRULE(this.classStatement) }
                        ]);
                    });
                    this.CONSUME(RBrace);
                }}
            ]);
        });
    });

    private isClassMember(): boolean {
        const t1 = this.LA(1).tokenType;
        return t1 === Plus || t1 === Minus || t1 === Hash || t1 === Tilde ||
               t1 === Identifier || t1 === Word;
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

    public connectionDeclaration = this.RULE("connectionDeclaration", () => {
        this.SUBRULE(this.genericName, { LABEL: "from" });
        this.MANY(() => {
            this.OPTION(() => this.OR([ { ALT: () => this.CONSUME(Plus) }, { ALT: () => this.CONSUME(Minus) } ]));
            this.CONSUME(Arrow, { LABEL: "arrow" });
            this.OPTION1(() => {
                this.OR1([
                    { ALT: () => { this.CONSUME(VerticalBar); this.SUBRULE(this.payload, { LABEL: "edgeLabel" }); this.CONSUME1(VerticalBar); } },
                    { ALT: () => this.OR2([{ ALT: () => this.CONSUME1(Plus) }, { ALT: () => this.CONSUME1(Minus) }]) }
                ]);
            });
            this.SUBRULE1(this.genericName, { LABEL: "to" });
        });
        this.OPTION2(() => {
            this.OR3([
                { ALT: () => { this.CONSUME(Colon); this.SUBRULE1(this.payload, { LABEL: "payload" }); } },
                { ALT: () => { this.CONSUME2(VerticalBar); this.SUBRULE2(this.payload, { LABEL: "edgeLabel2" }); this.CONSUME3(VerticalBar); } }
            ]);
        });
    });

    public flowchartNodeDeclaration = this.RULE("flowchartNodeDeclaration", () => {
        this.CONSUME(Identifier, { LABEL: "id" });
        this.OPTION(() => {
            this.OR([
                { ALT: () => { this.CONSUME(LShape); this.SUBRULE(this.payload, { LABEL: "label" }); this.CONSUME(RShape); } },
                { ALT: () => { this.CONSUME(LBrace); this.MANY(() => this.SUBRULE(this.flowchartStatement)); this.CONSUME(RBrace); } }
            ]);
        });
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
