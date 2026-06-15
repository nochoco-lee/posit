import { Lexer, createToken } from "chevrotain";

// ----------------- Tokens -----------------
export const SequenceDiagramHdr = createToken({ name: "SequenceDiagramHdr", pattern: /sequenceDiagram\s*(?:autonumber)?/ });
export const ClassDiagramHdr = createToken({ name: "ClassDiagramHdr", pattern: /classDiagram/ });

// Keywords (Sequence)
export const Participant = createToken({ name: "Participant", pattern: /participant/ });
export const Actor = createToken({ name: "Actor", pattern: /actor/ });

// Keywords (Class)
export const Class = createToken({ name: "Class", pattern: /class/ });
// Mermaid doesn't strictly have an 'interface' keyword in the same way, but it uses `class A { <<interface>> }`. We will just mock it to be similar for MVP.
export const Interface = createToken({ name: "Interface", pattern: /interface/ });

// Arrows (Sequence & Class Relations)
// Mermaid sequence arrows: ->, -->, ->>, -->>, -x, --x
// Class: <|--, *--, o--, ..>, <--, etc
export const Arrow = createToken({
    name: "Arrow",
    pattern: /(?:<\||[o*<])?(?:-{1,2}|\.{2,})(?:\|>|[*>xX]){0,2}/
});

// Message payload: captures the colon and all text until newline or comment
export const MessagePayload = createToken({ name: "MessagePayload", pattern: /:[^%\n\r]+/ });

// Metadata Layout Comment: %% @pos(x, y)
export const PosComment = createToken({
    name: "PosComment",
    pattern: /%%\s*@pos\s*\(\s*-?\d+\s*,\s*-?\d+\s*\)/
});

// Identifier
export const Identifier = createToken({ name: "Identifier", pattern: /[a-zA-Z0-9_]+/ });

export const Newline = createToken({
    name: "Newline",
    pattern: /\n|\r\n|\r/
});

// Whitespace (Ignored)
export const WhiteSpace = createToken({
    name: "WhiteSpace",
    pattern: /[ \t]+/,
    group: Lexer.SKIPPED
});

export const allMeTokens = [
    WhiteSpace,
    Newline,
    SequenceDiagramHdr,
    ClassDiagramHdr,
    Participant,
    Actor,
    Class,
    Interface,
    Arrow,
    MessagePayload,
    PosComment,
    Identifier
];

export const MermaidLexer = new Lexer(allMeTokens);
