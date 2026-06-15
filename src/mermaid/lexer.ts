import { Lexer, createToken } from "chevrotain";

// ----------------- Tokens -----------------
export const SequenceDiagramHdr = createToken({ name: "SequenceDiagramHdr", pattern: /sequenceDiagram\b/i });
export const ClassDiagramHdr = createToken({ name: "ClassDiagramHdr", pattern: /classDiagram\b/i });
export const FlowchartHdr = createToken({ name: "FlowchartHdr", pattern: /(?:flowchart|graph)\b/i });

// YAML Frontmatter
export const YAMLFrontmatter = createToken({
    name: "YAMLFrontmatter",
    pattern: /---\s*[\s\S]*?---\s*/,
    group: Lexer.SKIPPED
});

// Keywords (General)
export const As = createToken({ name: "As", pattern: /as\b/i });
export const End = createToken({ name: "End", pattern: /end\b/i });

// Keywords (Sequence)
export const Participant = createToken({ name: "Participant", pattern: /participant\b/i });
export const Actor = createToken({ name: "Actor", pattern: /actor\b/i });
export const Activate = createToken({ name: "Activate", pattern: /activate\b/i });
export const Deactivate = createToken({ name: "Deactivate", pattern: /deactivate\b/i });
export const Note = createToken({ name: "Note", pattern: /note\b/i });
export const RightOf = createToken({ name: "RightOf", pattern: /right\s+of\b/i });
export const LeftOf = createToken({ name: "LeftOf", pattern: /left\s+of\b/i });
export const Over = createToken({ name: "Over", pattern: /over\b/i });
export const Loop = createToken({ name: "Loop", pattern: /loop\b/i });
export const Alt = createToken({ name: "Alt", pattern: /alt\b/i });
export const Else = createToken({ name: "Else", pattern: /else\b/i });
export const Opt = createToken({ name: "Opt", pattern: /opt\b/i });
export const Par = createToken({ name: "Par", pattern: /par\b/i });
export const And = createToken({ name: "And", pattern: /and\b/i });
export const Rect = createToken({ name: "Rect", pattern: /rect\b/i });
export const Autonumber = createToken({ name: "Autonumber", pattern: /autonumber\b/i });
export const Box = createToken({ name: "Box", pattern: /box\b/i });
export const Create = createToken({ name: "Create", pattern: /create\b/i });
export const Destroy = createToken({ name: "Destroy", pattern: /destroy\b/i });

// Keywords (Class)
export const Class = createToken({ name: "Class", pattern: /class\b/i });
export const Interface = createToken({ name: "Interface", pattern: /interface\b/i });

// Keywords (Flowchart)
export const Subgraph = createToken({ name: "Subgraph", pattern: /subgraph\b/i });
export const Direction = createToken({ name: "Direction", pattern: /direction\b/i });
export const DirType = createToken({ name: "DirType", pattern: /(?:LR|RL|TB|BT|TD)\b/i });

// Arrows (Sequence & Class Relations & Flowchart)
export const Arrow = createToken({
    name: "Arrow",
    pattern: /(?:<\||[o*<x])?[-=.]+(?:>>|>|x|[)])|[-=.]+>{1,2}|==+>|[-=.]{2,}|==+|--/
});

// Delimiters
export const Colon = createToken({ name: "Colon", pattern: /:/ });
export const Comma = createToken({ name: "Comma", pattern: /,/ });
export const LParen = createToken({ name: "LParen", pattern: /\(/ });
export const RParen = createToken({ name: "RParen", pattern: /\)/ });
export const LBrace = createToken({ name: "LBrace", pattern: /\{/ });
export const RBrace = createToken({ name: "RBrace", pattern: /\}/ });
export const LBracket = createToken({ name: "LBracket", pattern: /\[/ });
export const RBracket = createToken({ name: "RBracket", pattern: /\]/ });
export const VerticalBar = createToken({ name: "VerticalBar", pattern: /\|/ });
export const Ampersand = createToken({ name: "Ampersand", pattern: /&/ });
export const Plus = createToken({ name: "Plus", pattern: /\+/ });
export const Minus = createToken({ name: "Minus", pattern: /-/ });
export const Hash = createToken({ name: "Hash", pattern: /#/ });
export const Tilde = createToken({ name: "Tilde", pattern: /~/ });
export const Star = createToken({ name: "Star", pattern: /\*/ });
export const Slash = createToken({ name: "Slash", pattern: /\// });
export const Backslash = createToken({ name: "Backslash", pattern: /\\/ });
export const Percent = createToken({ name: "Percent", pattern: /%/ });
export const At = createToken({ name: "At", pattern: /@/ });
export const Exclamation = createToken({ name: "Exclamation", pattern: /!/ });
export const QuestionMark = createToken({ name: "QuestionMark", pattern: /\?/ });
export const Semicolon = createToken({ name: "Semicolon", pattern: /;/ });
export const Quote = createToken({ name: "Quote", pattern: /"/ });
export const LAngle = createToken({ name: "LAngle", pattern: /</ });
export const RAngle = createToken({ name: "RAngle", pattern: />/ });

// String Literal: e.g. "This is a label"
export const StringLiteral = createToken({
    name: "StringLiteral",
    pattern: /"(?:[^\\"]|\\.)*"/
});

// Backtick Identifier: e.g. `Animal Class!`
export const BacktickIdentifier = createToken({
    name: "BacktickIdentifier",
    pattern: /`[^`]+`/
});

// Node Shapes (Flowchart)
export const LShape = createToken({ name: "LShape", pattern: /\[\[|\[\(|\[\/|\[\\|\(\(|\(\{|\{\{|\{\||\[|\(/ });
export const RShape = createToken({ name: "RShape", pattern: /\]\]|\)\]|\/\]|\\\]|\)\)|\}\)|\}\}|\|\}|\}|\]|\)/ });

// Text fallback: anything that isn't a newline or comment. 
export const Word = createToken({ name: "Word", pattern: /[^\s:;%&|(){}\[\]<>+*\-/\\!@?#~"]+/ });

// Metadata Layout Comment: %% @pos(x, y)
export const PosComment = createToken({
    name: "PosComment",
    pattern: /%%\s*@pos\s*\(\s*-?\d+\s*,\s*-?\d+\s*\)/
});

// Identifier (High priority for letters/numbers)
export const Identifier = createToken({ name: "Identifier", pattern: /[a-zA-Z0-9_\u00A0-\uFFFF]+/ });

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
    PosComment,
    YAMLFrontmatter,
    SequenceDiagramHdr,
    ClassDiagramHdr,
    FlowchartHdr,
    As,
    End,
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
    Subgraph,
    Direction,
    DirType,
    Arrow, 
    StringLiteral,
    BacktickIdentifier,
    Colon,
    Comma,
    LParen,
    RParen,
    LBrace,
    RBrace,
    LShape,
    RShape,
    LBracket,
    RBracket,
    VerticalBar,
    Ampersand,
    Plus,
    Minus,
    Hash,
    Tilde,
    Star,
    Slash,
    Backslash,
    Percent,
    At,
    Exclamation,
    QuestionMark,
    Semicolon,
    LAngle,
    RAngle,
    Quote,
    Identifier,
    Word // Word as low-priority fallback for text
];

export const MermaidLexer = new Lexer(allMeTokens);
