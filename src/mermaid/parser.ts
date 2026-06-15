import { CstParser } from "chevrotain";
import {
    allMeTokens,
    SequenceDiagramHdr,
    ClassDiagramHdr,
    Participant,
    Actor,
    Class,
    Interface,
    Identifier,
    PosComment,
    Arrow,
    MessagePayload,
    Newline
} from "./lexer";

class MermaidParser extends CstParser {
    constructor() {
        super(allMeTokens);
        this.performSelfAnalysis();
    }

    public diagram = this.RULE("diagram", () => {
        this.MANY(() => this.CONSUME(Newline));
        this.OR([
            { ALT: () => this.CONSUME(SequenceDiagramHdr) },
            { ALT: () => this.CONSUME(ClassDiagramHdr) }
        ]);
        this.MANY1(() => this.CONSUME1(Newline));
        this.MANY2(() => {
            this.SUBRULE(this.statement);
        });
        this.MANY3(() => this.CONSUME2(Newline));
    });

    public statement = this.RULE("statement", () => {
        this.OR([
            { ALT: () => this.SUBRULE(this.participantDeclaration) },
            { ALT: () => this.SUBRULE(this.classDeclaration) },
            { ALT: () => this.SUBRULE(this.connectionDeclaration) },
            { ALT: () => this.CONSUME(PosComment, { LABEL: "floatingLayout" }) } 
        ]);
        this.AT_LEAST_ONE(() => {
            this.CONSUME(Newline);
        });
    });

    public participantDeclaration = this.RULE("participantDeclaration", () => {
        this.OR([
            { ALT: () => this.CONSUME(Participant) },
            { ALT: () => this.CONSUME(Actor) }
        ]);
        this.CONSUME(Identifier, { LABEL: "name" });
        this.OPTION(() => {
            this.CONSUME(PosComment, { LABEL: "layout" });
        });
    });

    public classDeclaration = this.RULE("classDeclaration", () => {
        this.OR([
            { ALT: () => this.CONSUME(Class) },
            { ALT: () => this.CONSUME(Interface) }
        ]);
        this.CONSUME(Identifier, { LABEL: "name" });
        this.OPTION(() => {
            this.CONSUME(PosComment, { LABEL: "layout" });
        });
    });

    public connectionDeclaration = this.RULE("connectionDeclaration", () => {
        this.CONSUME1(Identifier, { LABEL: "from" });
        this.CONSUME(Arrow, { LABEL: "arrow" });
        this.CONSUME2(Identifier, { LABEL: "to" });
        this.OPTION1(() => {
            this.CONSUME(MessagePayload, { LABEL: "payload" });
        });
        this.OPTION2(() => {
            this.CONSUME(PosComment, { LABEL: "layout" });
        });
    });
}

export const parser = new MermaidParser();
