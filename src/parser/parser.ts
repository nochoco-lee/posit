import { CstParser, EOF, defaultParserErrorProvider } from "chevrotain";
import {
    allTokens, IdentifierLike, StartUml, EndUml, Participant, Actor, Order, Boundary, Control, Entity, Database, Collections, Queue, Artifact, Storage, Rectangle, Card, FileKeyword, Stack, Hexagon, Person, Process, Agent, LabelKeyword, Usecase, Component, Action, Port, PortIn, PortOut, Class, Interface, Enum, Struct, Annotation, Abstract, Circle, Diamond, Exception, Metaclass, Protocol, Record, Stereotype, Dataclass, ObjectKeyword, Package, Namespace, Folder, Cloud, Frame, Rect, NodeKeyword, Artifact, Storage, Rectangle, Card, FileKeyword, Stack, Hexagon, Person, Process, Agent, LabelKeyword, Usecase, Component, Action, Port, PortIn, PortOut, Extends, Implements, DiamondShort, DoubleColon, LAngle, RAngle, Alt, Else, Opt, Loop, Par, Group, Partition, Box, Endhnote, Endrnote, EndNote, Endref, End, Hnote, Rnote, Note, Ref, Autonumber, Newpage, Ignore, Skinparam, Header, Footer, Title, Hide, Show, Remove, Restore, Empty, Members, Fields, Methods, Left, Right, Top, Bottom, Over, Across, Of, As, Scale, Page, To, Direction, Set, Separator, None, Width, Height, Activate, Deactivate, Destroy, Autoactivate, Return, Create, Mainframe, On, Off, Allowmixing, MapKeyword, State, Json, Together, Extends, Implements, Divider, Comma, LBrace, RBrace, LParen, RParen, LBracket, RBracket, LGuillemet, RGuillemet, Colon, Dot, Arrow, Delay, Quote, Backslash, Slash, PosComment, Exclamation, QuestionMark, Ampersand, VerticalBar, Other, StringLiteral, Visibility, StaticModifier, AbstractModifier, FieldMarker, MethodMarker, Generic, Color, Star, Identifier, NumberToken, Newline
} from "./lexer";

const fastErrorProvider = {
    ...defaultParserErrorProvider,
    buildNoViableAltMessage: (options: any) => {
        return `Expecting one of the possible Token sequences, but found: '${options.actual[0].image}'`;
    }
};

class SequenceParser extends CstParser {
    constructor() {
        super(allTokens, { 
            skipValidations: true,
            errorMessageProvider: fastErrorProvider
        });
        this.performSelfAnalysis();
    }

    public anyToken = this.RULE("anyToken", () => {
        this.OR([
            { ALT: () => this.CONSUME(IdentifierLike) },
            { ALT: () => this.CONSUME(Arrow) },
            { ALT: () => this.CONSUME(Comma) },
            { ALT: () => this.CONSUME(LParen) },
            { ALT: () => this.CONSUME(RParen) },
            { ALT: () => this.CONSUME(LBrace) },
            { ALT: () => this.CONSUME(RBrace) },
            { ALT: () => this.CONSUME(Dot) },
            { ALT: () => this.CONSUME(LAngle) },
            { ALT: () => this.CONSUME(RAngle) },
            { ALT: () => this.CONSUME(Backslash) },
            { ALT: () => this.CONSUME(Slash) },
            { ALT: () => this.CONSUME(Other) },
            { ALT: () => this.CONSUME(Quote) },
            { ALT: () => this.CONSUME(Divider) },
            { ALT: () => this.CONSUME(StringLiteral) },
            { ALT: () => this.CONSUME(Visibility) },
            { ALT: () => this.CONSUME(Color) },
            { ALT: () => this.CONSUME(Star) },
            { ALT: () => this.CONSUME(Delay) },
            { ALT: () => this.CONSUME(LBracket) },
            { ALT: () => this.CONSUME(RBracket) },
            { ALT: () => this.CONSUME(LGuillemet) },
            { ALT: () => this.CONSUME(RGuillemet) },
            { ALT: () => this.CONSUME(Exclamation) },
            { ALT: () => this.CONSUME(QuestionMark) },
            { ALT: () => this.CONSUME(Ampersand) },
            { ALT: () => this.CONSUME(VerticalBar) },
            { ALT: () => this.CONSUME(Colon) }
        ]);
    });

    public nodeIdentifier = this.RULE("nodeIdentifier", () => { this.CONSUME(IdentifierLike); });
    public namePart = this.RULE("namePart", () => { this.OR([{ ALT: () => this.SUBRULE(this.nodeIdentifier) }, { ALT: () => this.CONSUME(StringLiteral) }]); });

    public name = this.RULE("name", (inConnection: boolean = false) => {
        this.OR([
            { 
                ALT: () => {
                    this.OPTION({ GATE: () => !inConnection || !this.isStandaloneDot(), DEF: () => { this.CONSUME(Dot, { LABEL: "leadingSep" }); } });
                    this.SUBRULE(this.namePart, { LABEL: "part" });
                    this.MANY({
                        GATE: () => {
                            const next = this.LA(1).tokenType;
                            if (next === DoubleColon) return true;
                            if (next === Dot) return !inConnection || !this.isStandaloneDot();
                            return false;
                        },
                        DEF: () => {
                            this.OR1([ { ALT: () => this.CONSUME(DoubleColon, { LABEL: "sep" }) }, { ALT: () => this.CONSUME1(Dot, { LABEL: "sep" }) } ]);
                            this.SUBRULE1(this.namePart, { LABEL: "part" });
                        }
                    });
                    this.OPTION1(() => this.SUBRULE(this.generic));
                }
            }
        ]);
    });

    private isStandaloneDot(): boolean {
        let i = 1;
        while (true) {
            const tok = this.LA(i).tokenType;
            if (tok === Arrow) return false;
            if (tok === Visibility && i > 1) return false;
            if (tok === Newline || tok === EndUml || tok === EOF) break;
            if (tok === Dot && i > 1) return false;
            i++;
        }
        return true;
    }

    public generic = this.RULE("generic", () => {
        this.OR([
            { ALT: () => this.CONSUME(Generic) },
            { 
                ALT: () => {
                    this.CONSUME(LAngle);
                    this.MANY({ GATE: () => this.LA(1).tokenType !== RAngle && this.LA(1).tokenType !== EOF, DEF: () => { this.OR1([ { ALT: () => this.CONSUME(Newline) }, { ALT: () => this.SUBRULE(this.anyToken) } ]); } });
                    this.CONSUME(RAngle);
                }
            }
        ]);
    });

    public label = this.RULE("label", () => {
        this.MANY({
            GATE: () => {
                const next1 = this.LA(1).tokenType;
                const next2 = this.LA(2).tokenType;
                if ((next1 === End || next1 === Endhnote || next1 === Endrnote) && (next2 === Note || next1 === Endhnote || next1 === Endrnote)) return true;
                if (next1 === EndNote || next1 === Endref) return true;
                if (next1 === End && (next2 === Ref || next2 === Box)) return true;
                if (next1 === Newline || next1 === Colon || next1 === End || next1 === EndNote || next1 === Endref || next1 === Endhnote || next1 === Endrnote || next1 === Else || next1 === EndUml || next1 === RBracket || next1 === LBracket || next1 === Color) return false;
                return true;
            },
            DEF: () => { this.SUBRULE(this.anyToken); }
        });
    });

    public multilineLabel = this.RULE("multilineLabel", () => {
        this.CONSUME(LBracket);
        this.MANY({ GATE: () => this.LA(1).tokenType !== RBracket, DEF: () => { this.OR([ { ALT: () => this.SUBRULE(this.anyToken) }, { ALT: () => this.CONSUME(Newline) } ]); } });
        this.CONSUME(RBracket);
    });

    public anchor = this.RULE("anchor", () => { this.CONSUME(LBrace); this.SUBRULE(this.nodeIdentifier); this.CONSUME(RBrace); });
    public payload = this.RULE("payload", () => { this.CONSUME(Colon); this.MANY({ GATE: () => { const nextType = this.LA(1).tokenType; return nextType !== EndUml && nextType !== Newline; }, DEF: () => { this.SUBRULE(this.anyToken); } }); });

    public stereotype = this.RULE("stereotype", () => {
        this.OR([ { ALT: () => this.CONSUME(Arrow) }, { ALT: () => this.CONSUME(LGuillemet) } ]);
        this.MANY({ GATE: () => { const next = this.LA(1).tokenType; return next !== RGuillemet && next !== Arrow && next !== Newline; }, DEF: () => this.SUBRULE(this.anyToken) });
        this.OPTION(() => { this.OR1([ { ALT: () => this.CONSUME1(Arrow) }, { ALT: () => this.CONSUME(RGuillemet) } ]); });
    });

    public shortFormDeclaration = this.RULE("shortFormDeclaration", () => {
        this.OR([
            { GATE: () => this.LA(1).tokenType === Colon, ALT: () => { this.CONSUME(Colon); this.SUBRULE(this.name, { LABEL: "name" }); this.CONSUME1(Colon); } },
            { GATE: () => this.LA(1).tokenType === LBracket, ALT: () => { this.CONSUME(LBracket); this.SUBRULE1(this.name, { LABEL: "name" }); this.CONSUME(RBracket); } },
            { GATE: () => this.LA(1).tokenType === LParen && this.LA(2).tokenType !== RParen, ALT: () => { this.CONSUME(LParen); this.SUBRULE2(this.name, { LABEL: "name" }); this.CONSUME(RParen); } },
            { GATE: () => this.LA(1).tokenType === LParen && this.LA(2).tokenType === RParen, ALT: () => { this.CONSUME1(LParen); this.CONSUME1(RParen); this.SUBRULE3(this.name, { LABEL: "name" }); } }
        ]);
        this.MANY(() => { this.OR1([ { ALT: () => { this.CONSUME(As); this.SUBRULE4(this.name, { LABEL: "alias" }); }}, { ALT: () => this.SUBRULE(this.stereotype) }, { ALT: () => this.SUBRULE(this.multilineLabel) }, { ALT: () => this.SUBRULE(this.colorValue, { LABEL: "color" }) } ]); });
        this.OPTION(() => { this.CONSUME(PosComment, { LABEL: "layout" }); });
    });

    public participantDeclaration = this.RULE("participantDeclaration", () => {
        this.OR([
            { ALT: () => this.CONSUME(Participant) }, { ALT: () => { this.CONSUME(Actor); this.OPTION(() => this.CONSUME(Slash)); }}, { ALT: () => this.CONSUME(Boundary) }, { ALT: () => this.CONSUME(Control) }, { ALT: () => this.CONSUME(Entity) }, { ALT: () => this.CONSUME(Database) }, { ALT: () => this.CONSUME(Collections) }, { ALT: () => this.CONSUME(Queue) }, { ALT: () => this.CONSUME(Artifact) }, { ALT: () => this.CONSUME(Storage) }, { ALT: () => this.CONSUME(Rectangle) }, { ALT: () => this.CONSUME(Card) }, { ALT: () => this.CONSUME(FileKeyword) }, { ALT: () => this.CONSUME(Stack) }, { ALT: () => this.CONSUME(Hexagon) }, { ALT: () => this.CONSUME(Person) }, { ALT: () => this.CONSUME(Process) }, { ALT: () => this.CONSUME(Agent) }, { ALT: () => this.CONSUME(LabelKeyword) }, { ALT: () => { this.CONSUME(Usecase); this.OPTION2(() => this.CONSUME2(Slash)); }}, { ALT: () => this.CONSUME(Component) }, { ALT: () => this.CONSUME(Action) }, { ALT: () => this.CONSUME(Port) }, { ALT: () => this.CONSUME(PortIn) }, { ALT: () => this.CONSUME(PortOut) }, { ALT: () => this.CONSUME(State) }, { ALT: () => this.CONSUME(Class) }, { ALT: () => this.CONSUME(Interface) }, { ALT: () => this.CONSUME(Enum) }, { ALT: () => this.CONSUME(Struct) }, { ALT: () => this.CONSUME(Annotation) }, { ALT: () => this.CONSUME(Abstract) }, { ALT: () => this.CONSUME(Circle) }, { ALT: () => this.CONSUME(Diamond) }, { ALT: () => this.CONSUME(Exception) }, { ALT: () => this.CONSUME(Metaclass) }, { ALT: () => this.CONSUME(Protocol) }, { ALT: () => this.CONSUME(Record) }, { ALT: () => this.CONSUME(Dataclass) }, { ALT: () => this.CONSUME(ObjectKeyword) }, { ALT: () => this.CONSUME(MapKeyword) }, { ALT: () => this.CONSUME(NodeKeyword) }, { ALT: () => this.CONSUME(Cloud) }, { ALT: () => this.CONSUME(Frame) }, { ALT: () => this.CONSUME(Folder) }, { ALT: () => this.CONSUME(Package) }
        ]);
        this.SUBRULE(this.name, { LABEL: "name" });
        this.MANY(() => {
            this.OR1([
                { ALT: () => { this.CONSUME(As); this.SUBRULE1(this.name, { LABEL: "alias" }); }},
                { GATE: () => { const next = this.LA(1).tokenType; return next === Identifier || next === StringLiteral; }, ALT: () => this.SUBRULE2(this.name, { LABEL: "alias" }) },
                { ALT: () => this.SUBRULE(this.stereotype) }, { ALT: () => this.SUBRULE(this.multilineLabel) },
                { ALT: () => { this.CONSUME(Order); this.OR2([ { ALT: () => this.CONSUME(IdentifierLike, { LABEL: "order" }) }, { ALT: () => this.CONSUME(StringLiteral, { LABEL: "order" }) } ]); }},
                { ALT: () => this.SUBRULE(this.colorValue, { LABEL: "color" }) }
            ]);
        });
        this.OPTION1(() => { this.CONSUME(PosComment, { LABEL: "layout" }); });
    });

    public memberLabel = this.RULE("memberLabel", () => { this.AT_LEAST_ONE({ GATE: () => { const next = this.LA(1).tokenType; return next !== Newline && next !== RBrace && next !== EndUml; }, DEF: () => this.SUBRULE(this.anyToken) }); });
    public colorValue = this.RULE("colorValue", () => { this.OR([ { ALT: () => this.CONSUME(Color) }, { ALT: () => { this.CONSUME(Visibility); this.CONSUME(Identifier); } }]); });
    public classMember = this.RULE("classMember", () => { this.MANY(() => { this.OR([ { ALT: () => this.CONSUME(Visibility) }, { ALT: () => this.CONSUME(StaticModifier) }, { ALT: () => this.CONSUME(AbstractModifier) }, { ALT: () => this.CONSUME(FieldMarker) }, { ALT: () => this.CONSUME(MethodMarker) } ]); }); this.SUBRULE(this.memberLabel, { LABEL: "tokens" }); });
    public parameter = this.RULE("parameter", () => { this.CONSUME(Identifier, { LABEL: "name" }); this.OPTION(() => { this.CONSUME(Colon); this.MANY(() => this.SUBRULE(this.anyToken, { LABEL: "typeTokens" })); }); });

    public classDeclaration = this.RULE("classDeclaration", () => {
        this.OR([
            {
                GATE: () => {
                    const t1 = this.LA(1).tokenType;
                    const isClassKeyword = t1 === Visibility || t1 === Class || t1 === Interface || t1 === Enum || t1 === Struct || t1 === Annotation || t1 === Abstract || t1 === Circle || t1 === Diamond || t1 === Exception || t1 === Metaclass || t1 === Protocol || t1 === Record || t1 === Stereotype || t1 === Dataclass || t1 === ObjectKeyword || (t1 === LParen && this.LA(2).tokenType === RParen) || t1 === DiamondShort;
                    if (!isClassKeyword) return false;
                    let i = 2; if (t1 === LParen) i = 3;
                    while (true) { const tok = this.LA(i).tokenType; if (tok === Arrow) return false; if (tok === Newline || tok === EndUml || tok === EOF) break; i++; }
                    return true;
                },
                ALT: () => {
                    this.OPTION(() => this.CONSUME(Visibility));
                    this.OR1([ { ALT: () => this.CONSUME(Class) }, { ALT: () => this.CONSUME(Interface) }, { ALT: () => this.CONSUME(Enum) }, { ALT: () => this.CONSUME(Struct) }, { ALT: () => this.CONSUME(Annotation) }, { ALT: () => { this.CONSUME(Abstract); this.OPTION3(() => this.CONSUME1(Class)); } }, { ALT: () => this.CONSUME(Circle) }, { ALT: () => this.CONSUME(Diamond) }, { ALT: () => this.CONSUME(Exception) }, { ALT: () => this.CONSUME(Metaclass) }, { ALT: () => this.CONSUME(Protocol) }, { ALT: () => this.CONSUME(Record) }, { ALT: () => this.CONSUME(Stereotype) }, { ALT: () => this.CONSUME(Dataclass) }, { ALT: () => this.CONSUME(ObjectKeyword) }, { ALT: () => { this.CONSUME(LParen); this.CONSUME(RParen); } }, { ALT: () => this.CONSUME(DiamondShort) } ]);
                    this.SUBRULE(this.name, { LABEL: "name" });
                    this.MANY(() => { this.OR2([ { ALT: () => { this.CONSUME(As); this.SUBRULE1(this.name, { LABEL: "alias" }); }}, { GATE: () => { const next = this.LA(1).tokenType; return next === Identifier || next === StringLiteral; }, ALT: () => this.SUBRULE2(this.name, { LABEL: "alias" }) }, { GATE: () => { const next = this.LA(1).tokenType; return next === Extends || next === Implements; }, ALT: () => { this.OR4([ { ALT: () => this.CONSUME(Extends) }, { ALT: () => this.CONSUME(Implements) } ]); this.SUBRULE5(this.name, { LABEL: "parents" }); this.MANY3(() => { this.CONSUME(Comma); this.SUBRULE6(this.name, { LABEL: "parents" }); }); } }, { ALT: () => this.SUBRULE(this.stereotype) }, { ALT: () => this.SUBRULE(this.colorValue, { LABEL: "color" }) } ]); });
                    this.OPTION4(() => { this.CONSUME(PosComment, { LABEL: "layout" }); });
                    this.OR3([ { ALT: () => { this.CONSUME(LBrace); this.MANY5({ GATE: () => this.LA(1).tokenType !== RBrace && this.LA(1).tokenType !== EOF, DEF: () => { this.OR5([ { ALT: () => this.CONSUME1(Newline) }, { ALT: () => this.SUBRULE(this.classMember) } ]); } }); this.CONSUME(RBrace); } }, { ALT: () => this.CONSUME2(Newline) }, { ALT: () => this.CONSUME(EOF) } ]);
                    this.OPTION5(() => { this.CONSUME1(PosComment, { LABEL: "layout" }); });
                }
            },
            {
                GATE: () => {
                    let i = 1; while (true) { const tok = this.LA(i).tokenType; if (tok === Identifier || tok === Dot || tok === DoubleColon || tok === StringLiteral || (this as any).tokenMatcher(this.LA(i), IdentifierLike)) i++; else break; }
                    if (this.LA(i).tokenType === LGuillemet) { i++; while (this.LA(i).tokenType !== RGuillemet && this.LA(i).tokenType !== Newline && this.LA(i).tokenType !== EOF) i++; if (this.LA(i).tokenType === RGuillemet) i++; }
                    if (this.LA(i).tokenType === Color) i++;
                    return this.LA(i).tokenType === LBrace;
                },
                ALT: () => {
                    this.SUBRULE3(this.name, { LABEL: "name" });
                    this.MANY6(() => { this.OR6([ { ALT: () => this.SUBRULE1(this.stereotype) }, { ALT: () => this.SUBRULE1(this.colorValue) } ]); });
                    this.CONSUME1(LBrace);
                    this.MANY7({ GATE: () => this.LA(1).tokenType !== RBrace && this.LA(1).tokenType !== EOF, DEF: () => { this.OR7([ { ALT: () => this.CONSUME3(Newline) }, { ALT: () => this.SUBRULE1(this.classMember) } ]); } });
                    this.CONSUME1(RBrace);
                    this.OPTION6(() => { this.CONSUME2(PosComment, { LABEL: "layout" }); });
                }
            },
            {
                GATE: () => { let i = 1; while (true) { const tok = this.LA(i).tokenType; if (tok === Identifier || tok === Dot || tok === DoubleColon || tok === StringLiteral || (this as any).tokenMatcher(this.LA(i), IdentifierLike)) i++; else break; } return this.LA(i).tokenType === Colon; },
                ALT: () => { this.SUBRULE4(this.name, { LABEL: "name" }); this.CONSUME(Colon); this.SUBRULE2(this.memberLabel, { LABEL: "member" }); }
            }
        ]);
    });

    public endpoint = this.RULE("endpoint", (inConnection: boolean = false) => {
        this.OR([
            { GATE: () => this.LA(1).tokenType === Colon && (this.LA(2).tokenType === Identifier || this.LA(2).tokenType === StringLiteral || this.LA(2).tokenType === IdentifierLike || (this as any).tokenMatcher(this.LA(2), IdentifierLike)) && this.LA(3).tokenType === Colon, ALT: () => { this.CONSUME2(Colon); this.SUBRULE4(this.name, { ARGS: [inConnection], LABEL: "name" }); this.CONSUME3(Colon); } },
            { GATE: () => this.LA(1).tokenType === LParen && this.LA(2).tokenType === RParen, ALT: () => { this.CONSUME1(LParen); this.CONSUME1(RParen); this.MANY2(() => this.SUBRULE5(this.name, { ARGS: [inConnection], LABEL: "name" })); } },
            { GATE: () => this.LA(1).tokenType === StringLiteral, ALT: () => { this.CONSUME(StringLiteral, { LABEL: "label" }); this.OPTION7(() => { this.CONSUME(Slash); this.SUBRULE(this.anyToken); }); this.OPTION(() => { this.OPTION1(() => this.CONSUME(As)); this.SUBRULE(this.nodeIdentifier, { LABEL: "name" }); }); } },
            { GATE: () => this.LA(1).tokenType === Quote, ALT: () => { this.CONSUME1(Quote, { LABEL: "q1" }); this.MANY(() => { this.CONSUME2(Identifier, { LABEL: "labelTokens" }); }); this.CONSUME2(Quote, { LABEL: "q2" }); this.OPTION4(() => { this.OPTION5(() => this.CONSUME2(As)); this.SUBRULE2(this.nodeIdentifier, { LABEL: "name" }); }); } },
            { GATE: () => this.LA(1).tokenType === LParen, ALT: () => { this.CONSUME(LParen); this.SUBRULE1(this.name, { ARGS: [inConnection], LABEL: "part1" }); this.MANY1(() => { this.CONSUME(Comma); this.SUBRULE2(this.name, { ARGS: [inConnection], LABEL: "parts" }); }); this.CONSUME(RParen); } },
            { GATE: () => this.LA(1).tokenType === LBracket, ALT: () => { this.CONSUME(LBracket); this.OPTION6(() => { this.SUBRULE3(this.nodeIdentifier, { LABEL: "name" }); this.CONSUME(RBracket); }); } },
            { GATE: () => this.LA(1).tokenType === LBrace, ALT: () => this.SUBRULE(this.anchorWithName, { ARGS: [inConnection] as any }) },
            { ALT: () => this.CONSUME1(RBracket) }, { ALT: () => this.CONSUME(QuestionMark) },
            { ALT: () => { this.SUBRULE3(this.name, { ARGS: [inConnection], LABEL: "name" }); this.OPTION8(() => this.SUBRULE(this.multilineLabel)); this.SUBRULE(this.optionalAnchor); this.OPTION2(() => { this.OPTION3(() => this.CONSUME1(As)); this.CONSUME1(StringLiteral, { LABEL: "label" }); this.OPTION9(() => { this.CONSUME1(Slash); this.SUBRULE1(this.anyToken); }); }); } }
        ]);
    });

    public anchorWithName = this.RULE("anchorWithName", (inConnection: boolean = false) => { this.SUBRULE(this.anchor, { LABEL: "anchor" }); this.OPTION(() => this.SUBRULE(this.name, { ARGS: [inConnection], LABEL: "name" })); });
    public optionalAnchor = this.RULE("optionalAnchor", () => { this.OPTION(() => { this.SUBRULE(this.anchor, { LABEL: "anchor" }); }); });

    public connectionDeclaration = this.RULE("connectionDeclaration", () => {
        this.OR1([ { GATE: () => { const next = this.LA(1).tokenType; if (next === Dot) return !this.isStandaloneDot(); return next !== Arrow && next !== Visibility; }, ALT: () => { this.SUBRULE1(this.endpoint, { ARGS: [true], LABEL: "from" }); } }, { GATE: () => this.LA(1).tokenType === Arrow || this.LA(1).tokenType === Visibility || this.LA(1).tokenType === Dot, ALT: () => {} } ]);
        this.OPTION1(() => { this.CONSUME(LParen); this.MANY1({ GATE: () => this.LA(1).tokenType !== RParen && this.LA(1).tokenType !== Newline, DEF: () => this.SUBRULE(this.anyToken) }); this.CONSUME(RParen); });
        this.OR2([ { ALT: () => this.CONSUME1(Arrow, { LABEL: "arrow" }) }, { ALT: () => this.CONSUME(Visibility, { LABEL: "arrow" }) }, { ALT: () => this.CONSUME(Dot, { LABEL: "arrow" }) } ]);
        this.OPTION2(() => { this.CONSUME1(LParen); this.MANY2({ GATE: () => this.LA(1).tokenType !== RParen && this.LA(1).tokenType !== Newline, DEF: () => this.SUBRULE1(this.anyToken) }); this.CONSUME1(RParen); });
        this.OPTION3({
            GATE: () => {
                const t1 = this.LA(1).tokenType;
                if (t1 === Colon) return this.LA(3).tokenType === Colon;
                if (t1 === Arrow || t1 === Newline || t1 === EndUml || t1 === EOF) return false;
                return true;
            },
            DEF: () => { this.SUBRULE2(this.endpoint, { ARGS: [false], LABEL: "to" }); }
        });
        this.MANY3(() => { this.OR3([ { ALT: () => this.SUBRULE(this.colorValue) }, { ALT: () => this.CONSUME(Star) }, { ALT: () => this.CONSUME(Exclamation) }, { ALT: () => this.CONSUME1(Visibility) }, { ALT: () => this.CONSUME2(Arrow) } ]); });
        this.OPTION4(() => { this.SUBRULE(this.payload); });
        this.OPTION5(() => { this.CONSUME(PosComment, { LABEL: "layout" }); });
    });

    public noteType = this.RULE("noteType", () => { this.OR([ { ALT: () => this.CONSUME(Note) }, { ALT: () => this.CONSUME(Hnote) }, { ALT: () => this.CONSUME(Rnote) } ]); });

    public noteBlock = this.RULE("noteBlock", () => {
        this.MANY({
            GATE: () => {
                const next1 = this.LA(1).tokenType; const next2 = this.LA(2).tokenType;
                if (next1 === End || next1 === Endhnote || next1 === Endrnote) return false;
                if (next1 === EndNote) return false; if (next1 === Endref) return false;
                return true;
            },
            DEF: () => { this.OR([ { ALT: () => this.SUBRULE(this.anyToken) }, { ALT: () => this.CONSUME(Newline) } ]); }
        });
        this.OR5([ { ALT: () => { this.CONSUME1(End); this.OR6([ { ALT: () => this.CONSUME2(Note) }, { ALT: () => this.CONSUME2(Ref) } ]); } }, { ALT: () => this.CONSUME(EndNote) }, { ALT: () => this.CONSUME(Endref) }, { ALT: () => this.CONSUME(Endhnote) }, { ALT: () => this.CONSUME(Endrnote) } ]);
    });

    public noteDeclaration = this.RULE("noteDeclaration", () => {
        this.SUBRULE(this.noteType, { LABEL: "type" });
        this.OR1([
            { ALT: () => { this.OR2([ { ALT: () => this.CONSUME(Left) }, { ALT: () => this.CONSUME(Right) }, { ALT: () => this.CONSUME(Top) }, { ALT: () => this.CONSUME(Bottom) }, { ALT: () => this.CONSUME(Over) } ]); this.OPTION(() => { this.OR([ { GATE: () => this.LA(1).tokenType === On, ALT: () => { this.CONSUME(On); this.OR7([ { ALT: () => this.CONSUME(Arrow, { LABEL: "link" }) }, { ALT: () => this.CONSUME(Identifier, { LABEL: "link" }) } ]); } }, { ALT: () => { this.OPTION1(() => this.CONSUME(Of)); this.SUBRULE(this.name, { LABEL: "target" }); this.MANY(() => { this.CONSUME(Comma); this.SUBRULE1(this.name, { LABEL: "target" }); }); } } ]); }); }},
            { ALT: () => { this.CONSUME1(On); this.OR8([ { ALT: () => this.CONSUME1(Arrow, { LABEL: "link" }) }, { ALT: () => this.CONSUME1(Identifier, { LABEL: "link" }) } ]); } },
            { ALT: () => { this.CONSUME(Across); }},
            { GATE: () => this.LA(1).tokenType === StringLiteral || this.LA(1).tokenType === Quote, ALT: () => { this.SUBRULE2(this.name, { LABEL: "floatingContent" }); this.OPTION3(() => { this.CONSUME(As); this.SUBRULE2(this.nodeIdentifier, { LABEL: "alias" }); }); } },
            { GATE: () => this.LA(1).tokenType === As, ALT: () => { this.CONSUME1(As); this.SUBRULE3(this.nodeIdentifier, { LABEL: "alias" }); } },
            { ALT: () => {} }
        ]);
        this.OPTION2(() => this.SUBRULE(this.colorValue));
        this.OR4([
            { GATE: () => this.LA(1).tokenType === Colon, ALT: () => this.SUBRULE(this.payload) },
            { GATE: () => { const t1 = this.LA(1).tokenType; if (t1 !== Newline) return false; let i = 2; while (true) { const tok = this.LA(i).tokenType; if (tok === EndNote || tok === Endhnote || tok === Endrnote || (tok === End && (this.LA(i+1).tokenType === Note || this.LA(i+1).tokenType === Ref))) return true; if (tok === EndUml || tok === EOF) return false; i++; } }, ALT: () => { this.MANY1(() => this.CONSUME(Newline)); this.SUBRULE(this.noteBlock); } },
            { ALT: () => {} }
        ]);
        this.OPTION5(() => { this.CONSUME1(PosComment, { LABEL: "layout" }); });
    });

    public refDeclaration = this.RULE("refDeclaration", () => {
        this.CONSUME(Ref);
        this.OR([ { ALT: () => { this.CONSUME(Over); this.SUBRULE(this.name, { LABEL: "target" }); this.MANY(() => { this.CONSUME(Comma); this.SUBRULE1(this.name, { LABEL: "target" }); }); }}, { ALT: () => {} } ]);
        this.OPTION5(() => { this.CONSUME(PosComment, { LABEL: "layout" }); });
        this.OR4([ { GATE: () => this.LA(1).tokenType === Colon, ALT: () => this.SUBRULE(this.payload) }, { GATE: () => this.LA(1).tokenType === Newline, ALT: () => { this.MANY1(() => this.CONSUME(Newline)); this.SUBRULE(this.noteBlock); } }, { ALT: () => {} } ]);
        this.OPTION6(() => { this.CONSUME1(PosComment, { LABEL: "layout" }); });
    });

    public elseBlock = this.RULE("elseBlock", () => {
        this.CONSUME(Else); this.MANY1(() => this.SUBRULE(this.colorValue)); this.SUBRULE(this.label); this.MANY2(() => this.SUBRULE1(this.colorValue)); this.OPTION1(() => this.SUBRULE(this.payload)); this.CONSUME(Newline);
        this.MANY({ GATE: () => { const nextType = this.LA(1).tokenType; return nextType !== End && nextType !== Else && nextType !== EndUml; }, DEF: () => { this.OR1([ { ALT: () => this.CONSUME1(Newline) }, { ALT: () => this.SUBRULE(this.statement) } ]); } });
    });

    public groupingBlock = this.RULE("groupingBlock", () => {
        this.OR([ { ALT: () => this.CONSUME(Alt) }, { ALT: () => this.CONSUME(Opt) }, { ALT: () => this.CONSUME(Loop) }, { ALT: () => this.CONSUME(Par) }, { ALT: () => this.CONSUME(Group) }, { ALT: () => this.CONSUME(Partition) }, { ALT: () => this.CONSUME(Box) } ]);
        this.MANY1(() => this.SUBRULE(this.colorValue)); this.SUBRULE(this.label); this.MANY2(() => this.SUBRULE1(this.colorValue)); this.OPTION1(() => this.SUBRULE(this.payload)); this.OPTION2(() => { this.CONSUME(LBracket); this.SUBRULE1(this.label); this.CONSUME(RBracket); }); this.MANY3(() => this.SUBRULE2(this.colorValue)); this.CONSUME(Newline);
        this.MANY({ GATE: () => { const nextType = this.LA(1).tokenType; return nextType !== End && nextType !== Else && nextType !== EndUml; }, DEF: () => { this.OR1([ { ALT: () => this.CONSUME1(Newline) }, { ALT: () => this.SUBRULE(this.statement) } ]); } });
        this.MANY4(() => this.SUBRULE(this.elseBlock)); this.CONSUME(End); this.OPTION3(() => this.CONSUME1(Box)); this.OPTION5(() => { this.CONSUME(PosComment, { LABEL: "layout" }); });
    });

    public activationDeclaration = this.RULE("activationDeclaration", () => { this.OR([ { ALT: () => this.CONSUME(Activate) }, { ALT: () => this.CONSUME(Deactivate) }, { ALT: () => this.CONSUME(Destroy) } ]); this.CONSUME(Identifier); this.OPTION(() => this.SUBRULE(this.colorValue)); });
    public autoactivateStatement = this.RULE("autoactivateStatement", () => { this.CONSUME(Autoactivate); this.OR([ { ALT: () => this.CONSUME(On) }, { ALT: () => this.CONSUME(Off) } ]); });
    public autonumberStatement = this.RULE("autonumberStatement", () => { 
        this.CONSUME(Autonumber); 
        this.MANY(() => {
            this.OR([
                { ALT: () => this.CONSUME(NumberToken) },
                { ALT: () => this.CONSUME(Dot) },
                { ALT: () => this.CONSUME(StringLiteral) },
                { ALT: () => this.CONSUME(Identifier) }
            ]);
        });
    });
    public dividerStatement = this.RULE("dividerStatement", () => { 
        this.CONSUME(Divider); 
        this.OPTION(() => { this.CONSUME(PosComment, { LABEL: "layout" }); });
    });
    public delayStatement = this.RULE("delayStatement", () => { this.CONSUME(Delay); });
    public returnStatement = this.RULE("returnStatement", () => { this.CONSUME(Return); this.OPTION(() => this.SUBRULE(this.label)); });
    public createStatement = this.RULE("createStatement", () => { this.CONSUME(Create); this.OR([ { GATE: () => { const next = this.LA(1).tokenType; return next === Participant || next === Actor || next === Boundary || next === Control || next === Entity || next === Database || next === Collections || next === Queue; }, ALT: () => this.SUBRULE(this.participantDeclaration) }, { ALT: () => this.SUBRULE(this.name) } ]); });
    public mainframeStatement = this.RULE("mainframeStatement", () => { this.CONSUME(Mainframe); this.SUBRULE(this.label); });
    public jsonBlock = this.RULE("jsonBlock", () => { this.CONSUME(Json); this.SUBRULE(this.name, { LABEL: "name" }); this.CONSUME(LBrace); this.MANY({ GATE: () => this.LA(1).tokenType !== RBrace, DEF: () => { this.OR([ { ALT: () => this.CONSUME(Newline) }, { ALT: () => this.SUBRULE(this.anyToken) } ]); } }); this.CONSUME(RBrace); });
    public styleBlock = this.RULE("styleBlock", () => { this.CONSUME(LAngle); this.CONSUME(Identifier); this.CONSUME(RAngle); this.MANY({ GATE: () => { const t1 = this.LA(1).tokenType; const t2 = this.LA(2).tokenType; const t3 = this.LA(3).tokenType; if (t1 === Slash && t2 === Identifier && t3 === RAngle) return false; if (t1 === Newline && t2 === Slash && this.LA(3).tokenType === Identifier) return false; return true; }, DEF: () => { this.OR([ { ALT: () => this.CONSUME(Newline) }, { ALT: () => this.SUBRULE(this.anyToken) } ]); } }); this.OPTION(() => this.CONSUME1(Newline)); this.CONSUME(Slash); this.CONSUME1(Identifier); this.CONSUME1(RAngle); });
    public togetherBlock = this.RULE("togetherBlock", () => { this.CONSUME(Together); this.CONSUME(LBrace); this.MANY(() => { this.OR([ { ALT: () => this.CONSUME(Newline) }, { ALT: () => this.SUBRULE(this.statement) } ]); }); this.CONSUME(RBrace); });
    public containerBlock = this.RULE("containerBlock", () => { this.OR([ { ALT: () => this.CONSUME(Package) }, { ALT: () => this.CONSUME(Namespace) }, { ALT: () => this.CONSUME(Folder) }, { ALT: () => this.CONSUME(Cloud) }, { ALT: () => this.CONSUME(Frame) }, { ALT: () => this.CONSUME(Rect) }, { ALT: () => this.CONSUME(NodeKeyword) }, { ALT: () => this.CONSUME(Artifact) }, { ALT: () => this.CONSUME(Storage) }, { ALT: () => this.CONSUME(Rectangle) }, { ALT: () => this.CONSUME(Card) }, { ALT: () => this.CONSUME(FileKeyword) }, { ALT: () => this.CONSUME(Stack) }, { ALT: () => this.CONSUME(Hexagon) }, { ALT: () => this.CONSUME(Person) }, { ALT: () => this.CONSUME(Process) }, { ALT: () => this.CONSUME(Agent) }, { ALT: () => this.CONSUME(LabelKeyword) }, { ALT: () => this.CONSUME(Usecase) }, { ALT: () => this.CONSUME(Component) }, { ALT: () => this.CONSUME(Action) }, { ALT: () => this.CONSUME(MapKeyword) }, { ALT: () => this.CONSUME(State) }, { ALT: () => this.CONSUME(Database) }, { ALT: () => this.CONSUME(Queue) }, { ALT: () => this.CONSUME(Boundary) }, { ALT: () => this.CONSUME(Control) }, { ALT: () => this.CONSUME(Entity) }, { ALT: () => this.CONSUME(Collections) } ]); this.OPTION(() => { this.SUBRULE(this.name, { LABEL: "name" }); }); this.MANY(() => { this.OR1([ { ALT: () => { this.CONSUME(As); this.SUBRULE1(this.name, { LABEL: "alias" }); }}, { ALT: () => this.SUBRULE(this.stereotype) }, { ALT: () => this.SUBRULE(this.colorValue, { LABEL: "color" }) } ]); }); this.OR2([ { ALT: () => { this.CONSUME(LBrace); this.MANY1(() => { this.OR3([ { ALT: () => this.CONSUME(Newline) }, { ALT: () => this.SUBRULE(this.statement) } ]); }); this.CONSUME(RBrace); }}, { ALT: () => { this.SUBRULE(this.multilineLabel); }} ]); this.OPTION4(() => { this.CONSUME(PosComment, { LABEL: "layout" }); }); });

    public ignoredStatement = this.RULE("ignoredStatement", () => {
        this.OR([ { ALT: () => this.CONSUME(Skinparam) }, { ALT: () => this.CONSUME(Hide) }, { ALT: () => this.CONSUME(Show) }, { ALT: () => this.CONSUME(Remove) }, { ALT: () => this.CONSUME(Restore) }, { ALT: () => this.CONSUME(Empty) }, { ALT: () => this.CONSUME(Newpage) }, { ALT: () => this.CONSUME(Ignore) }, { ALT: () => this.CONSUME(Header) }, { ALT: () => this.CONSUME(Footer) }, { ALT: () => this.CONSUME(Title) }, { ALT: () => this.CONSUME(Exclamation) }, { ALT: () => this.CONSUME(Slash) }, { ALT: () => this.CONSUME(VerticalBar) }, { ALT: () => this.CONSUME(Allowmixing) }, { ALT: () => this.SUBRULE(this.styleBlock) }, { ALT: () => { this.CONSUME(Scale); this.MANY3(() => this.SUBRULE3(this.anyToken)); } }, { ALT: () => { this.CONSUME(Page); this.MANY7(() => this.SUBRULE7(this.anyToken)); } }, { ALT: () => { this.OR4([ { ALT: () => this.CONSUME(Left) }, { ALT: () => this.CONSUME(Right) }, { ALT: () => this.CONSUME(Top) }, { ALT: () => this.CONSUME(Bottom) } ]); this.CONSUME(To); this.OR5([ { ALT: () => this.CONSUME1(Left) }, { ALT: () => this.CONSUME1(Right) }, { ALT: () => this.CONSUME1(Top) }, { ALT: () => this.CONSUME1(Bottom) } ]); this.CONSUME(Direction); } }, { ALT: () => { this.CONSUME(Set); this.MANY4(() => this.SUBRULE4(this.anyToken)); } } ]);
        const isTitle = (this.LA(0) as any).tokenType === Title;
        this.MANY({ GATE: () => { const nextType = this.LA(1).tokenType; return nextType !== Newline && nextType !== EndUml && nextType !== LBrace; }, DEF: () => this.SUBRULE(this.anyToken) });
        this.OR1([ { GATE: () => this.LA(1).tokenType === LBrace, ALT: () => { this.CONSUME(LBrace); this.MANY1({ GATE: () => this.LA(1).tokenType !== RBrace, DEF: () => { this.OR2([ { ALT: () => this.CONSUME(Newline) }, { ALT: () => this.SUBRULE1(this.anyToken) } ]); } }); this.CONSUME(RBrace); } }, { GATE: () => isTitle && this.LA(1).tokenType === Newline, ALT: () => { this.CONSUME1(Newline); this.MANY2({ GATE: () => { const t1 = this.LA(1).tokenType; const t2 = this.LA(2).tokenType; return !(t1 === End && t2 === Title) && t1 !== EndUml; }, DEF: () => { this.OR3([ { GATE: () => { const t1 = this.LA(1).tokenType; const t2 = this.LA(2).tokenType; return !(t1 === End && t2 === Title); }, ALT: () => this.SUBRULE2(this.anyToken) }, { ALT: () => this.CONSUME2(Newline) } ]); } }); this.OPTION(() => { this.CONSUME(End); this.CONSUME1(Title); }); } }, { ALT: () => {} } ]);
    });

    public statement = this.RULE("statement", () => {
        this.OPTION({ GATE: () => this.LA(1).tokenType === Ampersand, DEF: () => this.CONSUME(Ampersand) });
        this.OR([
            { ALT: () => this.SUBRULE(this.ignoredStatement) },
            {
                GATE: () => {
                    const tok = this.LA(1).tokenType;
                    const reserved = [
                        Note, Hnote, Rnote, Ref, Together, Class, Interface, Enum, Struct, Annotation, Abstract, Circle, Diamond, Exception, Metaclass, Protocol, Record, Stereotype, Dataclass, ObjectKeyword,
                        Package, Namespace, Folder, Cloud, Frame, Rect, NodeKeyword, Artifact, Storage, Rectangle, Card, FileKeyword, Stack, Hexagon, Person, Process, Agent, LabelKeyword, Usecase, Component, Action, MapKeyword, State, Database, Queue, Boundary, Control, Entity, Collections,
                        Participant, Actor, Alt, Opt, Loop, Par, Group, Partition, Box, Activate, Deactivate, Destroy, Autoactivate, Return, Create, Mainframe, Skinparam, Hide, Show, Remove, Restore, Empty, Newpage, Ignore, Header, Footer, Title, Allowmixing,
                        LBrace, LBracket, LParen, Colon
                    ];
                    if (reserved.includes(tok)) {
                        let i = 2;
                        while(true) {
                            const t = this.LA(i).tokenType;
                            if (t === Arrow || t === Visibility) return true;
                            if (t === Newline || t === EndUml || t === EOF) return false;
                            i++;
                            if (i > 10) break;
                        }
                        return false;
                    }
                    return true;
                },
                ALT: () => this.SUBRULE(this.connectionDeclaration)
            },
            { ALT: () => this.SUBRULE(this.noteDeclaration) },
            { ALT: () => this.SUBRULE(this.refDeclaration) },
            { ALT: () => this.SUBRULE(this.togetherBlock) },
            { ALT: () => this.SUBRULE(this.classDeclaration) },
            {
                GATE: () => {
                    const t1 = this.LA(1).tokenType;
                    const containerKeywords = [Package, Namespace, Folder, Cloud, Frame, Rect, NodeKeyword, Artifact, Storage, Rectangle, Card, FileKeyword, Stack, Hexagon, Person, Process, Agent, LabelKeyword, Usecase, Component, Action, MapKeyword, State, Database, Queue, Boundary, Control, Entity, Collections];
                    if (!containerKeywords.includes(t1)) return false;
                    let i = 2;
                    while (true) {
                        const tok = this.LA(i).tokenType;
                        if (tok === LBrace || tok === LBracket) return true;
                        if (tok === Newline || tok === EndUml || tok === EOF) break;
                        i++;
                    }
                    return false;
                },
                ALT: () => this.SUBRULE(this.containerBlock)
            },
            { ALT: () => this.SUBRULE(this.participantDeclaration) },
            { ALT: () => this.SUBRULE(this.groupingBlock) },
            { ALT: () => this.SUBRULE(this.activationDeclaration) },
            { ALT: () => this.SUBRULE(this.autoactivateStatement) },
            { ALT: () => this.SUBRULE(this.autonumberStatement) },
            { ALT: () => this.SUBRULE(this.dividerStatement) },
            { ALT: () => this.SUBRULE(this.delayStatement) },
            { ALT: () => this.SUBRULE(this.returnStatement) },
            { ALT: () => this.SUBRULE(this.createStatement) },
            { ALT: () => this.SUBRULE(this.jsonBlock) },
            { ALT: () => this.SUBRULE(this.mainframeStatement) },
            { ALT: () => this.SUBRULE(this.shortFormDeclaration) },
            { ALT: () => this.SUBRULE(this.anchor) },
            { GATE: () => this.LA(1).tokenType === PosComment, ALT: () => this.CONSUME(PosComment, { LABEL: "floatingLayout" }) }
        ]);
        this.MANY(() => this.CONSUME(Newline));
    });

    public diagram = this.RULE("diagram", () => { this.MANY(() => this.CONSUME(Newline)); this.CONSUME(StartUml); this.MANY1(() => { this.OR([ { ALT: () => this.CONSUME1(Newline) }, { ALT: () => this.SUBRULE(this.statement) } ]); }); this.CONSUME(EndUml); this.MANY2(() => this.CONSUME2(Newline)); });
    private parsePosComment(commentStr: string) { const match = commentStr.match(/@pos\s*\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/); if (match) return { x: parseInt(match[1], 10), y: parseInt(match[2], 10) }; return undefined; }
}

export const parser = new SequenceParser();
