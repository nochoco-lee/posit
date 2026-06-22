import { Lexer, createToken } from "chevrotain";

// Categories
export const Keyword = createToken({ name: "Keyword", pattern: Lexer.NA });
export const Symbol = createToken({ name: "Symbol", pattern: Lexer.NA });

// ----------------- Tokens -----------------
export const SequenceDiagramHdr = createToken({ name: "SequenceDiagramHdr", pattern: /sequenceDiagram\b/i, categories: [Keyword] });
export const ClassDiagramHdr = createToken({ name: "ClassDiagramHdr", pattern: /classDiagram\b/i, categories: [Keyword] });
export const FlowchartHdr = createToken({ name: "FlowchartHdr", pattern: /(?:flowchart|graph)\b/i, categories: [Keyword] });

// YAML Frontmatter
export const YAMLFrontmatter = createToken({
    name: "YAMLFrontmatter",
    pattern: /---\s*[\s\S]*?---\s*/,
    group: Lexer.SKIPPED
});

// Keywords
export const As = createToken({ name: "As", pattern: /as\b/i, categories: [Keyword] });
export const End = createToken({ name: "End", pattern: /end\b/i, categories: [Keyword] });
export const Participant = createToken({ name: "Participant", pattern: /participant\b/i, categories: [Keyword] });
export const Actor = createToken({ name: "Actor", pattern: /actor\b/i, categories: [Keyword] });
export const Activate = createToken({ name: "Activate", pattern: /activate\b/i, categories: [Keyword] });
export const Deactivate = createToken({ name: "Deactivate", pattern: /deactivate\b/i, categories: [Keyword] });
export const Note = createToken({ name: "Note", pattern: /note\b/i, categories: [Keyword] });
export const RightOf = createToken({ name: "RightOf", pattern: /right\s+of\b/i, categories: [Keyword] });
export const LeftOf = createToken({ name: "LeftOf", pattern: /left\s+of\b/i, categories: [Keyword] });
export const Over = createToken({ name: "Over", pattern: /over\b/i, categories: [Keyword] });
export const Loop = createToken({ name: "Loop", pattern: /loop\b/i, categories: [Keyword] });
export const Alt = createToken({ name: "Alt", pattern: /alt\b/i, categories: [Keyword] });
export const Else = createToken({ name: "Else", pattern: /else\b/i, categories: [Keyword] });
export const Opt = createToken({ name: "Opt", pattern: /opt\b/i, categories: [Keyword] });
export const Par = createToken({ name: "Par", pattern: /par\b/i, categories: [Keyword] });
export const Critical = createToken({ name: "Critical", pattern: /critical\b/i, categories: [Keyword] });
export const Option = createToken({ name: "Option", pattern: /option\b/i, categories: [Keyword] });
export const And = createToken({ name: "And", pattern: /and\b/i, categories: [Keyword] });
export const Rect = createToken({ name: "Rect", pattern: /rect\b/i, categories: [Keyword] });
export const Autonumber = createToken({ name: "Autonumber", pattern: /autonumber\b/i, categories: [Keyword] });
export const Box = createToken({ name: "Box", pattern: /box\b/i, categories: [Keyword] });
export const Create = createToken({ name: "Create", pattern: /create\b/i, categories: [Keyword] });
export const Destroy = createToken({ name: "Destroy", pattern: /destroy\b/i, categories: [Keyword] });
export const Break = createToken({ name: "Break", pattern: /break\b/i, categories: [Keyword] });
export const Class = createToken({ name: "Class", pattern: /class\b/i, categories: [Keyword] });
export const Interface = createToken({ name: "Interface", pattern: /interface\b/i, categories: [Keyword] });
export const Subgraph = createToken({ name: "Subgraph", pattern: /subgraph\b/i, categories: [Keyword] });
export const Click = createToken({ name: "Click", pattern: /click\b/i, categories: [Keyword] });
export const Link = createToken({ name: "Link", pattern: /link\b/i, categories: [Keyword] });
export const Links = createToken({ name: "Links", pattern: /links\b/i, categories: [Keyword] });
export const Direction = createToken({ name: "Direction", pattern: /direction\b/i, categories: [Keyword] });
export const DirType = createToken({ name: "DirType", pattern: /(?:LR|RL|TB|BT|TD)\b/i, categories: [Keyword] });
export const Namespace = createToken({ name: "Namespace", pattern: /namespace\b/i, categories: [Keyword] });
export const Callback = createToken({ name: "Callback", pattern: /callback\b/i, categories: [Keyword] });
export const Style = createToken({ name: "Style", pattern: /style\b/i, categories: [Keyword] });
export const ClassDef = createToken({ name: "ClassDef", pattern: /classDef\b/i, categories: [Keyword] });

// Arrows
export const Arrow = createToken({
    name: "Arrow",
    pattern: /(?:<\||[o*<x])[-=.]+(?:>>|\|?>|>|x|[)])?|[-=.]+(?:>>|\|?>|>|x|[)])|[-=.]{2,}|==+>|==+|--/
});

// Delimiters / Symbols
export const Colon = createToken({ name: "Colon", pattern: /:/, categories: [Symbol] });
export const Comma = createToken({ name: "Comma", pattern: /,/, categories: [Symbol] });
export const LParen = createToken({ name: "LParen", pattern: /\(/, categories: [Symbol] });
export const RParen = createToken({ name: "RParen", pattern: /\)/, categories: [Symbol] });
export const LBrace = createToken({ name: "LBrace", pattern: /\{/, categories: [Symbol] });
export const RBrace = createToken({ name: "RBrace", pattern: /\}/, categories: [Symbol] });
export const LBracket = createToken({ name: "LBracket", pattern: /\[/, categories: [Symbol] });
export const RBracket = createToken({ name: "RBracket", pattern: /\]/, categories: [Symbol] });
export const VerticalBar = createToken({ name: "VerticalBar", pattern: /\|/, categories: [Symbol] });
export const Ampersand = createToken({ name: "Ampersand", pattern: /&/, categories: [Symbol] });
export const Plus = createToken({ name: "Plus", pattern: /\+/, categories: [Symbol] });
export const Minus = createToken({ name: "Minus", pattern: /-/, categories: [Symbol] });
export const Hash = createToken({ name: "Hash", pattern: /#/, categories: [Symbol] });
export const Tilde = createToken({ name: "Tilde", pattern: /~/, categories: [Symbol] });
export const Star = createToken({ name: "Star", pattern: /\*/, categories: [Symbol] });
export const Slash = createToken({ name: "Slash", pattern: /\//, categories: [Symbol] });
export const Backslash = createToken({ name: "Backslash", pattern: /\\/, categories: [Symbol] });
export const Percent = createToken({ name: "Percent", pattern: /%/, categories: [Symbol] });
export const At = createToken({ name: "At", pattern: /@/, categories: [Symbol] });
export const Exclamation = createToken({ name: "Exclamation", pattern: /!/, categories: [Symbol] });
export const QuestionMark = createToken({ name: "QuestionMark", pattern: /\?/, categories: [Symbol] });
export const Semicolon = createToken({ name: "Semicolon", pattern: /;/, categories: [Symbol] });
export const Quote = createToken({ name: "Quote", pattern: /"/, categories: [Symbol] });
export const LAngle = createToken({ name: "LAngle", pattern: /</, categories: [Symbol] });
export const RAngle = createToken({ name: "RAngle", pattern: />/, categories: [Symbol] });
export const Equal = createToken({ name: "Equal", pattern: /=/, categories: [Symbol] });

// Node Shapes (Flowchart) - multi-char only; single [ ] ( ) are LBracket/RBracket/LParen/RParen
export const LShape = createToken({ name: "LShape", pattern: /\[\[|\[\(|\[\/|\[\\|\(\(\(|\(\(|\(\{|\{\{|\{\|/, categories: [Symbol] });
export const RShape = createToken({ name: "RShape", pattern: /\]\]|\)\)\)|\)\)|\)\]|\/\]|\\\]|\}\)|\}\}|\|\}/, categories: [Symbol] });

// String Literals
export const StringLiteral = createToken({ name: "StringLiteral", pattern: /"(?:[^\\"]|\\.)*"/ });
export const BacktickIdentifier = createToken({ name: "BacktickIdentifier", pattern: /`[^`]+`/ });

// Metadata Layout Comment
export const PosComment = createToken({
    name: "PosComment",
    pattern: /%%\s*@pos\s*\(\s*-?\d+\s*,\s*-?\d+\s*\)/
});

// Identifier
export const Identifier = createToken({ name: "Identifier", pattern: /[a-zA-Z0-9_\u00A0-\uFFFF]+/ });

export const Newline = createToken({ name: "Newline", pattern: /\n|\r\n|\r/ });
export const WhiteSpace = createToken({ name: "WhiteSpace", pattern: /[ \t]+/, group: Lexer.SKIPPED });

export const allMeTokens = [
    WhiteSpace,
    Newline,
    PosComment,
    YAMLFrontmatter,
    
    Keyword, // Categories first? Chevrotain doesn't use categories in the list like this.
    Symbol,
    
    SequenceDiagramHdr,
    ClassDiagramHdr,
    FlowchartHdr,
    
    Arrow,
    
    As, End, Participant, Actor, Activate, Deactivate, Note, RightOf, LeftOf, Over, Loop, Alt, Else, Opt, Par, Critical, Option, And, Rect, Autonumber, Box, Create, Destroy, Break, Class, Interface, Subgraph, Click, Links, Link, Direction, DirType, Namespace, Callback, Style, ClassDef,
    
    StringLiteral,
    BacktickIdentifier,
    
    Colon, Comma, LShape, RShape, LBrace, RBrace, LParen, RParen, LBracket, RBracket, VerticalBar, Ampersand, Plus, Minus, Hash, Tilde, Star, Slash, Backslash, Percent, At, Exclamation, QuestionMark, Semicolon, LAngle, RAngle, Quote, Equal,
    
    Identifier
];

export const MermaidLexer = new Lexer(allMeTokens);
