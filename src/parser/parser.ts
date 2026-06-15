import { CstParser, EOF, defaultParserErrorProvider } from "chevrotain";
import {
    allTokens, IdentifierLike, StartUml, EndUml, Participant, Actor, Order, Boundary, Control, Entity, Database, Collections, Queue, Artifact, Storage, Rectangle, Card, FileKeyword, Stack, Hexagon, Person, Process, Agent, LabelKeyword, Usecase, Component, Action, Port, PortIn, PortOut, Class, Interface, Enum, Struct, Annotation, Abstract, Circle, Diamond, Exception, Metaclass, Protocol, Record, Stereotype, Dataclass, ObjectKeyword, Package, Namespace, Folder, Cloud, Frame, Rect, NodeKeyword, DiamondShort, DoubleColon, LAngle, RAngle, Alt, Else, Opt, Loop, Par, Group, Partition, Box, Endhnote, Endrnote, EndNote, Endref, End, Hnote, Rnote, Note, Ref, Autonumber, Newpage, Ignore, Skinparam, Header, Footer, Title, Hide, Show, Remove, Restore, Empty, Members, Fields, Methods, Left, Right, Top, Bottom, Over, Across, Of, As, Scale, Page, To, Direction, Set, Separator, None, Width, Height, Activate, Deactivate, Destroy, Autoactivate, Return, Create, Mainframe, On, Off, Allowmixing, MapKeyword, State, Json, Together, Extends, Implements, Divider, Comma, LBrace, RBrace, LParen, RParen, LBracket, RBracket, LGuillemet, RGuillemet, Colon, Dot, Arrow, Delay, Quote, Backslash, Slash, PosComment, Exclamation, QuestionMark, Ampersand, VerticalBar, Other, StringLiteral, Visibility, StaticModifier, AbstractModifier, FieldMarker, MethodMarker, Generic, Color, Star, Identifier, NumberToken, Newline
} from "./lexer";

const fastErrorProvider = {
    ...defaultParserErrorProvider,
    buildNoViableAltMessage: (options) => {
        return `Expecting one of the possible Token sequences, but found: '${options.actual[0].image}'`;
    }
};

class SequenceParser extends CstParser {
    constructor() {
        // skipValidations: true disables the expensive grammar self-analysis
        // (validateAmbiguousAlternationAlternatives) that only serves development
        // purposes and causes multi-second main-thread blocking + 639KB console output.
        // The grammar has already been validated during development.
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
                    this.OR3([ { ALT: () => { this.CONSUME(LBrace); this.MANY5({ GATE: () => this.LA(1).tokenType !== RBrace && this.LA(1).tokenType !== EOF, DEF: () => { this.OR5([ { ALT: () => this.CONSUME1(Newline) }, { ALT: () => this.SUBRULE(this.classMember) } ]); } }); this.CONSUME(RBrace); } }, { ALT: () => this.CONSUME2(Newline) }, { ALT: () => this.CONSUME(EOF) } ]);
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
            { GATE: () => this.LA(1).tokenType === Colon, ALT: () => { this.CONSUME2(Colon); this.SUBRULE4(this.name, { ARGS: [inConnection], LABEL: "name" }); this.CONSUME3(Colon); } },
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
    public optionalAnchor = this.RULE("optionalAnchor", () => { this.OPTION(() => this.SUBRULE(this.anchor, { LABEL: "anchor" })); });

    public connectionDeclaration = this.RULE("connectionDeclaration", () => {
        this.OR1([ { GATE: () => { const next = this.LA(1).tokenType; if (next === Dot) return !this.isStandaloneDot(); return next !== Arrow && next !== Visibility; }, ALT: () => { this.SUBRULE1(this.endpoint, { ARGS: [true], LABEL: "from" }); } }, { GATE: () => this.LA(1).tokenType === Arrow || this.LA(1).tokenType === Visibility || this.LA(1).tokenType === Dot, ALT: () => {} } ]);
        this.OPTION1(() => { this.CONSUME(LParen); this.MANY1({ GATE: () => this.LA(1).tokenType !== RParen && this.LA(1).tokenType !== Newline, DEF: () => this.SUBRULE(this.anyToken) }); this.CONSUME(RParen); });
        this.OR2([ { ALT: () => this.CONSUME1(Arrow, { LABEL: "arrow" }) }, { ALT: () => this.CONSUME(Visibility, { LABEL: "arrow" }) }, { ALT: () => this.CONSUME(Dot, { LABEL: "arrow" }) } ]);
        this.OPTION2(() => { this.CONSUME1(LParen); this.MANY2({ GATE: () => this.LA(1).tokenType !== RParen && this.LA(1).tokenType !== Newline, DEF: () => this.SUBRULE1(this.anyToken) }); this.CONSUME1(RParen); });
        this.OPTION3(() => { this.SUBRULE2(this.endpoint, { ARGS: [false], LABEL: "to" }); });
        this.MANY3(() => { this.OR3([ { ALT: () => this.SUBRULE(this.colorValue) }, { ALT: () => this.CONSUME(Star) }, { ALT: () => this.CONSUME(Exclamation) }, { ALT: () => this.CONSUME1(Visibility) }, { ALT: () => this.CONSUME2(Arrow) } ]); });
        this.OPTION4(() => { this.SUBRULE(this.payload); });
        this.OPTION5(() => { this.CONSUME(PosComment, { LABEL: "layout" }); });
    });

    public noteType = this.RULE("noteType", () => { this.OR([ { ALT: () => this.CONSUME(Note) }, { ALT: () => this.CONSUME(Hnote) }, { ALT: () => this.CONSUME(Rnote) } ]); });

    public noteBlock = this.RULE("noteBlock", () => {
        this.MANY({
            GATE: () => {
                const next1 = this.LA(1).tokenType; const next2 = this.LA(2).tokenType;
                if (next1 === End && next2 === Note) return false; if (next1 === End && next2 === Ref) return false;
                if (next1 === EndNote) return false; if (next1 === Endref) return false; if (next1 === Endhnote || next1 === Endrnote) return false;
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
    });

    public refDeclaration = this.RULE("refDeclaration", () => {
        this.CONSUME(Ref);
        this.OR([ { ALT: () => { this.CONSUME(Over); this.SUBRULE(this.name, { LABEL: "target" }); this.MANY(() => { this.CONSUME(Comma); this.SUBRULE1(this.name, { LABEL: "target" }); }); }}, { ALT: () => {} } ]);
        this.OR4([ { GATE: () => this.LA(1).tokenType === Colon, ALT: () => this.SUBRULE(this.payload) }, { GATE: () => this.LA(1).tokenType === Newline, ALT: () => { this.MANY1(() => this.CONSUME(Newline)); this.SUBRULE(this.noteBlock); } }, { ALT: () => {} } ]);
    });

    public elseBlock = this.RULE("elseBlock", () => {
        this.CONSUME(Else); this.MANY1(() => this.SUBRULE(this.colorValue)); this.SUBRULE(this.label); this.MANY2(() => this.SUBRULE1(this.colorValue)); this.OPTION1(() => this.SUBRULE(this.payload)); this.CONSUME(Newline);
        this.MANY({ GATE: () => { const nextType = this.LA(1).tokenType; return nextType !== End && nextType !== Else && nextType !== EndUml; }, DEF: () => { this.OR1([ { ALT: () => this.CONSUME1(Newline) }, { ALT: () => this.SUBRULE(this.statement) } ]); } });
    });

    public groupingBlock = this.RULE("groupingBlock", () => {
        this.OR([ { ALT: () => this.CONSUME(Alt) }, { ALT: () => this.CONSUME(Opt) }, { ALT: () => this.CONSUME(Loop) }, { ALT: () => this.CONSUME(Par) }, { ALT: () => this.CONSUME(Group) }, { ALT: () => this.CONSUME(Partition) }, { ALT: () => this.CONSUME(Box) } ]);
        this.MANY1(() => this.SUBRULE(this.colorValue)); this.SUBRULE(this.label); this.MANY2(() => this.SUBRULE1(this.colorValue)); this.OPTION1(() => this.SUBRULE(this.payload)); this.OPTION2(() => { this.CONSUME(LBracket); this.SUBRULE1(this.label); this.CONSUME(RBracket); }); this.MANY3(() => this.SUBRULE2(this.colorValue)); this.CONSUME(Newline);
        this.MANY({ GATE: () => { const nextType = this.LA(1).tokenType; return nextType !== End && nextType !== Else && nextType !== EndUml; }, DEF: () => { this.OR1([ { ALT: () => this.CONSUME1(Newline) }, { ALT: () => this.SUBRULE(this.statement) } ]); } });
        this.MANY4(() => this.SUBRULE(this.elseBlock)); this.CONSUME(End); this.OPTION3(() => this.CONSUME1(Box));
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
    public dividerStatement = this.RULE("dividerStatement", () => { this.CONSUME(Divider); });
    public delayStatement = this.RULE("delayStatement", () => { this.CONSUME(Delay); });
    public returnStatement = this.RULE("returnStatement", () => { this.CONSUME(Return); this.OPTION(() => this.SUBRULE(this.label)); });
    public createStatement = this.RULE("createStatement", () => { this.CONSUME(Create); this.OR([ { GATE: () => { const next = this.LA(1).tokenType; return next === Participant || next === Actor || next === Boundary || next === Control || next === Entity || next === Database || next === Collections || next === Queue; }, ALT: () => this.SUBRULE(this.participantDeclaration) }, { ALT: () => this.SUBRULE(this.name) } ]); });
    public mainframeStatement = this.RULE("mainframeStatement", () => { this.CONSUME(Mainframe); this.SUBRULE(this.label); });
    public jsonBlock = this.RULE("jsonBlock", () => { this.CONSUME(Json); this.SUBRULE(this.name, { LABEL: "name" }); this.CONSUME(LBrace); this.MANY({ GATE: () => this.LA(1).tokenType !== RBrace, DEF: () => { this.OR([ { ALT: () => this.CONSUME(Newline) }, { ALT: () => this.SUBRULE(this.anyToken) } ]); } }); this.CONSUME(RBrace); });
    public styleBlock = this.RULE("styleBlock", () => { this.CONSUME(LAngle); this.CONSUME(Identifier); this.CONSUME(RAngle); this.MANY({ GATE: () => { const t1 = this.LA(1).tokenType; const t2 = this.LA(2).tokenType; const t3 = this.LA(3).tokenType; if (t1 === Slash && t2 === Identifier && t3 === RAngle) return false; if (t1 === Newline && t2 === Slash && this.LA(3).tokenType === Identifier) return false; return true; }, DEF: () => { this.OR([ { ALT: () => this.CONSUME(Newline) }, { ALT: () => this.SUBRULE(this.anyToken) } ]); } }); this.OPTION(() => this.CONSUME1(Newline)); this.CONSUME(Slash); this.CONSUME1(Identifier); this.CONSUME1(RAngle); });
    public togetherBlock = this.RULE("togetherBlock", () => { this.CONSUME(Together); this.CONSUME(LBrace); this.MANY(() => { this.OR([ { ALT: () => this.CONSUME(Newline) }, { ALT: () => this.SUBRULE(this.statement) } ]); }); this.CONSUME(RBrace); });
    public containerBlock = this.RULE("containerBlock", () => { this.OR([ { ALT: () => this.CONSUME(Package) }, { ALT: () => this.CONSUME(Namespace) }, { ALT: () => this.CONSUME(Folder) }, { ALT: () => this.CONSUME(Cloud) }, { ALT: () => this.CONSUME(Frame) }, { ALT: () => this.CONSUME(Rect) }, { ALT: () => this.CONSUME(NodeKeyword) }, { ALT: () => this.CONSUME(Artifact) }, { ALT: () => this.CONSUME(Storage) }, { ALT: () => this.CONSUME(Rectangle) }, { ALT: () => this.CONSUME(Card) }, { ALT: () => this.CONSUME(FileKeyword) }, { ALT: () => this.CONSUME(Stack) }, { ALT: () => this.CONSUME(Hexagon) }, { ALT: () => this.CONSUME(Person) }, { ALT: () => this.CONSUME(Process) }, { ALT: () => this.CONSUME(Agent) }, { ALT: () => this.CONSUME(LabelKeyword) }, { ALT: () => this.CONSUME(Usecase) }, { ALT: () => this.CONSUME(Component) }, { ALT: () => this.CONSUME(Action) }, { ALT: () => this.CONSUME(MapKeyword) }, { ALT: () => this.CONSUME(State) }, { ALT: () => this.CONSUME(Database) }, { ALT: () => this.CONSUME(Queue) }, { ALT: () => this.CONSUME(Boundary) }, { ALT: () => this.CONSUME(Control) }, { ALT: () => this.CONSUME(Entity) }, { ALT: () => this.CONSUME(Collections) } ]); this.OPTION(() => { this.SUBRULE(this.name, { LABEL: "name" }); }); this.MANY(() => { this.OR1([ { ALT: () => { this.CONSUME(As); this.SUBRULE1(this.name, { LABEL: "alias" }); }}, { ALT: () => this.SUBRULE(this.stereotype) }, { ALT: () => this.SUBRULE(this.colorValue, { LABEL: "color" }) } ]); }); this.OR2([ { ALT: () => { this.CONSUME(LBrace); this.MANY1(() => { this.OR3([ { ALT: () => this.CONSUME(Newline) }, { ALT: () => this.SUBRULE(this.statement) } ]); }); this.CONSUME(RBrace); }}, { ALT: () => { this.SUBRULE(this.multilineLabel); }} ]); });

    public ignoredStatement = this.RULE("ignoredStatement", () => {
        this.OR([ { ALT: () => this.CONSUME(Skinparam) }, { ALT: () => this.CONSUME(Hide) }, { ALT: () => this.CONSUME(Show) }, { ALT: () => this.CONSUME(Remove) }, { ALT: () => this.CONSUME(Restore) }, { ALT: () => this.CONSUME(Empty) }, { ALT: () => this.CONSUME(Newpage) }, { ALT: () => this.CONSUME(Ignore) }, { ALT: () => this.CONSUME(Header) }, { ALT: () => this.CONSUME(Footer) }, { ALT: () => this.CONSUME(Title) }, { ALT: () => this.CONSUME(Exclamation) }, { ALT: () => this.CONSUME(Slash) }, { ALT: () => this.CONSUME(VerticalBar) }, { ALT: () => this.CONSUME(Allowmixing) }, { ALT: () => this.SUBRULE(this.styleBlock) }, { ALT: () => { this.CONSUME(Scale); this.MANY3(() => this.SUBRULE3(this.anyToken)); } }, { ALT: () => { this.CONSUME(Page); this.MANY7(() => this.SUBRULE7(this.anyToken)); } }, { ALT: () => { this.OR4([ { ALT: () => this.CONSUME(Left) }, { ALT: () => this.CONSUME(Right) }, { ALT: () => this.CONSUME(Top) }, { ALT: () => this.CONSUME(Bottom) } ]); this.CONSUME(To); this.OR5([ { ALT: () => this.CONSUME1(Left) }, { ALT: () => this.CONSUME1(Right) }, { ALT: () => this.CONSUME1(Top) }, { ALT: () => this.CONSUME1(Bottom) } ]); this.CONSUME(Direction); } }, { ALT: () => { this.CONSUME(Set); this.MANY4(() => this.SUBRULE4(this.anyToken)); } } ]);
        const isTitle = (this.LA(0) as any).tokenType === Title;
        this.MANY({ GATE: () => { const nextType = this.LA(1).tokenType; return nextType !== Newline && nextType !== EndUml && nextType !== LBrace; }, DEF: () => this.SUBRULE(this.anyToken) });
        this.OR1([ { GATE: () => this.LA(1).tokenType === LBrace, ALT: () => { this.CONSUME(LBrace); this.MANY1({ GATE: () => this.LA(1).tokenType !== RBrace, DEF: () => { this.OR2([ { ALT: () => this.CONSUME(Newline) }, { ALT: () => this.SUBRULE1(this.anyToken) } ]); } }); this.CONSUME(RBrace); } }, { GATE: () => isTitle && this.LA(1).tokenType === Newline, ALT: () => { this.CONSUME1(Newline); this.MANY2({ GATE: () => { const t1 = this.LA(1).tokenType; const t2 = this.LA(2).tokenType; return !(t1 === End && t2 === Title) && t1 !== EndUml; }, DEF: () => { this.OR3([ { GATE: () => { const t1 = this.LA(1).tokenType; const t2 = this.LA(2).tokenType; return !(t1 === End && t2 === Title); }, ALT: () => this.SUBRULE2(this.anyToken) }, { ALT: () => this.CONSUME2(Newline) } ]); } }); this.OPTION(() => { this.CONSUME(End); this.CONSUME1(Title); }); } }, { ALT: () => {} } ]);
    });

    public statement = this.RULE("statement", () => {
        this.OPTION({ GATE: () => this.LA(1).tokenType === Ampersand, DEF: () => this.CONSUME(Ampersand) });
        this.OR([
            { GATE: () => { const t1 = this.LA(1).tokenType; return t1 === Arrow || t1 === Visibility; }, ALT: () => this.SUBRULE1(this.connectionDeclaration) },
            { GATE: () => { let i = 1; const t1 = this.LA(1).tokenType; if (t1 === Arrow || t1 === Visibility) return false; while (true) { const tok = this.LA(i); if ((this as any).tokenMatcher(tok, Arrow)) return true; if ((this as any).tokenMatcher(tok, Visibility) && i > 1) return true; if ((this as any).tokenMatcher(tok, Dot)) { if (i === 1) { let j = i + 1; while (true) { const t = this.LA(j); if ((this as any).tokenMatcher(t, Arrow)) return true; if ((this as any).tokenMatcher(t, Newline) || (this as any).tokenMatcher(t, EndUml) || (this as any).tokenMatcher(t, EOF)) break; j++; } } else return true; } if ((this as any).tokenMatcher(tok, Newline) || (this as any).tokenMatcher(tok, EndUml) || (this as any).tokenMatcher(tok, EOF)) return false; i++; if (i > 20) return false; } }, ALT: () => this.SUBRULE2(this.connectionDeclaration) },
            { GATE: () => { const t1 = this.LA(1).tokenType; let isAnchor = false; let nextIdx = 1; if (t1 === LBrace) { isAnchor = this.LA(3).tokenType === RBrace; nextIdx = 4; } else if (t1 === LParen) { isAnchor = this.LA(3).tokenType === RParen; nextIdx = 4; } if (!isAnchor) return false; while (true) { const tok = this.LA(nextIdx).tokenType; if (tok === Arrow) return false; if (tok === Newline || tok === EndUml || tok === EOF) break; nextIdx++; } return true; }, ALT: () => this.SUBRULE(this.anchor) },
            { GATE: () => { const t1 = this.LA(1).tokenType; const isNote = t1 === Note || t1 === Hnote || t1 === Rnote; if (!isNote) return false; const t2 = this.LA(2).tokenType; return t2 === Left || t2 === Right || t2 === Top || t2 === Bottom || t2 === Over || t2 === Across || t2 === Color || t2 === Newline || t2 === Colon || t2 === StringLiteral || t2 === Quote || t2 === As || t2 === On || t2 === Identifier; }, ALT: () => this.SUBRULE(this.noteDeclaration) },
            { GATE: () => { const t1 = this.LA(1).tokenType; if (t1 !== Ref) return false; const t2 = this.LA(2).tokenType; return t2 === Over || t2 === Newline || t2 === Colon; }, ALT: () => this.SUBRULE(this.refDeclaration) },
            { GATE: () => { const t1 = this.LA(1).tokenType; if (t1 !== Colon && t1 !== LBracket && t1 !== LParen) return false; let i = 1; while (true) { const tok = this.LA(i).tokenType; if (tok === Arrow) return false; if (tok === Newline || tok === EndUml || tok === EOF) break; i++; } return true; }, ALT: () => this.SUBRULE(this.shortFormDeclaration) },
            { GATE: () => { let i = 1; let t = this.LA(i).tokenType; if (t === Visibility) { i++; t = this.LA(i).tokenType; } const isClassKeyword = t === Class || t === Interface || t === Enum || t === Struct || t === Annotation || t === Abstract || t === Circle || t === Diamond || t === Exception || t === Metaclass || t === Protocol || t === Record || t === Stereotype || t === Dataclass || t === ObjectKeyword || (t === LParen && this.LA(i+1).tokenType === RParen) || t === DiamondShort; if (isClassKeyword) { let j = i + 1; if (t === LParen) j = i + 2; while (true) { const tok = this.LA(j).tokenType; if (tok === Arrow) return false; if (tok === Order) return false; if (tok === Newline || tok === EndUml || tok === EOF) break; j++; } return true; } i = 1; if (this.LA(i).tokenType === Visibility) i = 2; while (true) { const tok = this.LA(i).tokenType; if (tok === Colon) return true; if (tok === Arrow || tok === Visibility) return false; if (tok === Newline || tok === EndUml || tok === EOF) return false; i++; } }, ALT: () => this.SUBRULE(this.classDeclaration) },
            { GATE: () => { const next = this.LA(1).tokenType; const isParticipantKeyword = next === Participant || next === Actor || next === Boundary || next === Control || next === Entity || next === Database || next === Collections || next === Queue || next === Artifact || next === Storage || next === Rectangle || next === Card || next === FileKeyword || next === Stack || next === Hexagon || next === Person || next === Process || next === Agent || next === LabelKeyword || next === Usecase || next === Component || next === Action || next === MapKeyword || next === State || next === Class || next === Interface || next === Enum || next === Struct || next === Annotation || next === Abstract || next === Circle || next === Diamond || next === Exception || next === Metaclass || next === Protocol || next === Record || next === Dataclass || next === ObjectKeyword || next === Port || next === PortIn || next === PortOut || next === NodeKeyword || next === Cloud || next === Frame || next === Folder || next === Package; if (!isParticipantKeyword) return false; let i = 2; while (true) { const tok = this.LA(i).tokenType; if (tok === Arrow) return false; if (tok === LBrace) return false; if (tok === Newline || tok === EndUml || tok === EOF) break; i++; } return true; }, ALT: () => this.SUBRULE(this.participantDeclaration) },
            { ALT: () => this.SUBRULE(this.groupingBlock) },
            { GATE: () => { const next = this.LA(1).tokenType; return next === Activate || next === Deactivate || next === Destroy; }, ALT: () => this.SUBRULE(this.activationDeclaration) },
            { GATE: () => this.LA(1).tokenType === Autoactivate, ALT: () => this.SUBRULE(this.autoactivateStatement) },
            { GATE: () => this.LA(1).tokenType === Autonumber, ALT: () => this.SUBRULE(this.autonumberStatement) },
            { GATE: () => this.LA(1).tokenType === Divider, ALT: () => this.SUBRULE(this.dividerStatement) },
            { GATE: () => this.LA(1).tokenType === Delay, ALT: () => this.SUBRULE(this.delayStatement) },
            { GATE: () => this.LA(1).tokenType === Return, ALT: () => this.SUBRULE(this.returnStatement) },
            { GATE: () => this.LA(1).tokenType === Create, ALT: () => this.SUBRULE(this.createStatement) },
            { GATE: () => { const t1 = this.LA(1).tokenType; return t1 === Package || t1 === Namespace || t1 === Folder || t1 === Cloud || t1 === Frame || t1 === Rect || t1 === NodeKeyword || t1 === Artifact || t1 === Storage || t1 === Rectangle || t1 === Card || t1 === FileKeyword || t1 === Stack || t1 === Hexagon || t1 === Person || t1 === Process || t1 === Agent || t1 === LabelKeyword || t1 === Usecase || t1 === Component || t1 === Action || t1 === MapKeyword || t1 === Database || t1 === Queue || t1 === Boundary || t1 === Control || t1 === Entity || t1 === Collections; }, ALT: () => this.SUBRULE(this.containerBlock) },
            { GATE: () => this.LA(1).tokenType === Json, ALT: () => this.SUBRULE(this.jsonBlock) },
            { GATE: () => this.LA(1).tokenType === Together, ALT: () => this.SUBRULE(this.togetherBlock) },
            { GATE: () => this.LA(1).tokenType === Mainframe, ALT: () => this.SUBRULE(this.mainframeStatement) },
            { GATE: () => { const t1 = this.LA(1).tokenType; return t1 === Skinparam || t1 === Hide || t1 === Show || t1 === Remove || t1 === Restore || t1 === Empty || t1 === Autonumber || t1 === Newpage || t1 === Ignore || t1 === Header || t1 === Footer || t1 === Title || t1 === Exclamation || t1 === Divider || t1 === Slash || t1 === Delay || t1 === VerticalBar || t1 === Allowmixing || t1 === LAngle || t1 === Scale || t1 === Page || t1 === Left || t1 === Right || t1 === Top || t1 === Bottom || t1 === Set; }, ALT: () => this.SUBRULE(this.ignoredStatement) }
        ]);
        this.MANY(() => this.CONSUME(Newline));
    });

    public diagram = this.RULE("diagram", () => { this.MANY(() => this.CONSUME(Newline)); this.CONSUME(StartUml); this.MANY1(() => { this.OR([ { ALT: () => this.CONSUME1(Newline) }, { ALT: () => this.SUBRULE(this.statement) } ]); }); this.CONSUME(EndUml); this.MANY2(() => this.CONSUME2(Newline)); });
    private parsePosComment(commentStr: string) { const match = commentStr.match(/@pos\s*\(\s*(-?\d+)\s*,\s*(-?\d+)\s*\)/); if (match) return { x: parseInt(match[1], 10), y: parseInt(match[2], 10) }; return undefined; }
}

export const parser = new SequenceParser();
