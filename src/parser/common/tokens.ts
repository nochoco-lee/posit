import { createToken, Lexer } from "chevrotain";

export const IdentifierLike = createToken({ name: "IdentifierLike", pattern: Lexer.NA });
export const StartUml = createToken({ name: "StartUml", pattern: /@startuml/ });
export const EndUml = createToken({ name: "EndUml", pattern: /@enduml/ });

export const PosComment = createToken({
    name: "PosComment",
    pattern: /\/'\s*@pos\s*\(\s*-?\d+\s*,\s*-?\d+\s*\)\s*'\//
});

export const MultiLineComment = createToken({
    name: "MultiLineComment",
    pattern: /\/'[\s\S]*?'\//,
    group: Lexer.SKIPPED
});

export const LineComment = createToken({
    name: "LineComment",
    pattern: /'.*/,
    group: Lexer.SKIPPED
});

export const WhiteSpace = createToken({
    name: "WhiteSpace",
    pattern: /[ \t]+/,
    group: Lexer.SKIPPED
});

export const Newline = createToken({
    name: "Newline",
    pattern: /\n|\r\n|\r/
});

export const Identifier = createToken({ name: "Identifier", pattern: /[a-zA-Z_$][a-zA-Z0-9_$]*/, categories: [IdentifierLike] });
export const NumberToken = createToken({ name: "Number", pattern: /[0-9]+/, categories: [IdentifierLike] });
export const StringLiteral = createToken({
    name: "StringLiteral",
    pattern: /"(?:[^\\"]|\\.|[\r\n])*"/
});

export const Color = createToken({ name: "Color", pattern: /#+(?!(?:class|interface|enum|struct|annotation|abstract|entity|participant|actor|boundary|control|database|collections|queue|object|package|namespace|json|together|hnote|rnote|note|ref|alt|opt|loop|par|group|partition|box|else|end|create|return|autoactivate|newpage|ignore|skinparam|hide|show|remove|restore|empty|members|fields|methods|header|footer|title|mainframe|scale|page|set|separator|none|width|height|to|direction|left|right|top|bottom|across|of|over)\b)(?:[a-zA-Z0-9]+)?(?:[-/|\\.;\[\]a-zA-Z0-9]+|:[a-zA-Z0-9]+)*/ });

export const Skinparam = createToken({ name: "Skinparam", pattern: /skinparam\b/i, categories: [IdentifierLike] });
export const Title = createToken({ name: "Title", pattern: /title/i, categories: [IdentifierLike] });
export const Header = createToken({ name: "Header", pattern: /header\b/i, categories: [IdentifierLike] });
export const Footer = createToken({ name: "Footer", pattern: /footer\b/i, categories: [IdentifierLike] });
export const Hide = createToken({ name: "Hide", pattern: /hide/i, categories: [IdentifierLike] });
export const Show = createToken({ name: "Show", pattern: /show/i, categories: [IdentifierLike] });
export const Page = createToken({ name: "Page", pattern: /page\b/i, categories: [IdentifierLike] });

export const LParen = createToken({ name: "LParen", pattern: /\(/ });
export const RParen = createToken({ name: "RParen", pattern: /\)/ });
export const LBrace = createToken({ name: "LBrace", pattern: /\{/ });
export const RBrace = createToken({ name: "RBrace", pattern: /\}/ });
export const LBracket = createToken({ name: "LBracket", pattern: /\[/ });
export const RBracket = createToken({ name: "RBracket", pattern: /\]/ });
export const Colon = createToken({ name: "Colon", pattern: /:/ });
export const Comma = createToken({ name: "Comma", pattern: /,/ });
export const Star = createToken({ name: "Star", pattern: /\*/ });
export const VerticalBar = createToken({ name: "VerticalBar", pattern: /\|/ });
export const Dot = createToken({ name: "Dot", pattern: /\./ });
export const Slash = createToken({ name: "Slash", pattern: /\// });
export const Backslash = createToken({ name: "Backslash", pattern: /\\/ });
export const Exclamation = createToken({ name: "Exclamation", pattern: /!/ });
export const QuestionMark = createToken({ name: "QuestionMark", pattern: /\?/ });
export const LAngle = createToken({ name: "LAngle", pattern: /</ });
export const RAngle = createToken({ name: "RAngle", pattern: />/ });
export const Plus = createToken({ name: "Plus", pattern: /\+/ });
export const Minus = createToken({ name: "Minus", pattern: /-/ });
export const Tilde = createToken({ name: "Tilde", pattern: /~/ });
export const Hash = createToken({ name: "Hash", pattern: /#/ });

export const commonTokens = [
    WhiteSpace,
    Newline,
    IdentifierLike,
    StartUml,
    EndUml,
    PosComment,
    MultiLineComment,
    LineComment,
    Skinparam,
    Title,
    Header,
    Footer,
    Hide,
    Show,
    Page,
    StringLiteral,
    Identifier,
    NumberToken,
    Color,
    LParen,
    RParen,
    LBrace,
    RBrace,
    LBracket,
    RBracket,
    Colon,
    Comma,
    Star,
    VerticalBar,
    Dot,
    Slash,
    Backslash,
    Exclamation,
    QuestionMark,
    LAngle,
    RAngle,
    Plus,
    Minus,
    Tilde,
    Hash
];
