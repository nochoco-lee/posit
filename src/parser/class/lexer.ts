import { createToken, Lexer } from "chevrotain";
import * as common from "../common/tokens";

export const Class = createToken({ name: "Class", pattern: /class\b/i });
export const ObjectKeyword = createToken({ name: "ObjectKeyword", pattern: /object\b/i });
export const Interface = createToken({ name: "Interface", pattern: /interface\b/i });
export const Enum = createToken({ name: "Enum", pattern: /enum\b/i });
export const Annotation = createToken({ name: "Annotation", pattern: /annotation\b/i });
export const Abstract = createToken({ name: "Abstract", pattern: /abstract\b/i });
export const Static = createToken({ name: "Static", pattern: /static\b/i });
export const Entity = createToken({ name: "Entity", pattern: /entity\b/i });
export const Struct = createToken({ name: "Struct", pattern: /struct\b/i });
export const Protocol = createToken({ name: "Protocol", pattern: /protocol\b/i });
export const RecordKeyword = createToken({ name: "RecordKeyword", pattern: /record\b/i });
export const Metaclass = createToken({ name: "Metaclass", pattern: /metaclass\b/i });
export const StereotypeKeyword = createToken({ name: "StereotypeKeyword", pattern: /stereotype\b/i });
export const Dataclass = createToken({ name: "Dataclass", pattern: /dataclass\b/i });
export const Exception = createToken({ name: "Exception", pattern: /exception\b/i });
export const Circle = createToken({ name: "Circle", pattern: /circle\b/i });
export const Diamond = createToken({ name: "Diamond", pattern: /diamond\b/i });

export const Extends = createToken({ name: "Extends", pattern: /extends\b/i });
export const Implements = createToken({ name: "Implements", pattern: /implements\b/i });
export const Package = createToken({ name: "Package", pattern: /package\b/i });
export const Namespace = createToken({ name: "Namespace", pattern: /namespace\b/i });
export const Together = createToken({ name: "Together", pattern: /together\b/i });
export const Note = createToken({ name: "Note", pattern: /note\b/i });
export const End = createToken({ name: "End", pattern: /end\b/i });
export const Left = createToken({ name: "Left", pattern: /left\b/i });
export const Right = createToken({ name: "Right", pattern: /right\b/i });
export const Top = createToken({ name: "Top", pattern: /top\b/i });
export const Bottom = createToken({ name: "Bottom", pattern: /bottom\b/i });
export const Of = createToken({ name: "Of", pattern: /of\b/i });
export const As = createToken({ name: "As", pattern: /as\b/i });

export const Stereotype = createToken({ name: "Stereotype", pattern: /<<[^>]+>>/ });

// Use string pattern to avoid escaping pitfalls
const head = "[<*#@^x()\\[\\]\\\\/|+o{}>]";
export const Arrow = createToken({
    name: "Arrow",
    pattern: new RegExp(`${head}+[-.]+([du][lr])*[-.]*${head}*|${head}*[-.]+([du][lr])*[-.]*${head}+|[-.]{2,}`),
});

export const LBrace = createToken({ name: "LBrace", pattern: /\{/ });
export const RBrace = createToken({ name: "RBrace", pattern: /\}/ });

export const DividerDot = createToken({ name: "DividerDot", pattern: /\.\.+/ });
export const DividerEquals = createToken({ name: "DividerEquals", pattern: /==+/ });
export const DividerUnderscore = createToken({ name: "DividerUnderscore", pattern: /__+/ });
export const DividerMinus = createToken({ name: "DividerMinus", pattern: /--+/ });

export const allClassTokens = [
    common.WhiteSpace,
    common.Newline,
    common.StartUml,
    common.EndUml,
    common.PosComment,
    common.MultiLineComment,
    common.LineComment,

    Arrow, // High priority
    DividerDot,
    DividerEquals,
    DividerUnderscore,
    DividerMinus,

    Stereotype,

    Class,
    ObjectKeyword,
    Interface,
    Enum,
    Annotation,
    Abstract,
    Static,
    Entity,
    Struct,
    Protocol,
    RecordKeyword,
    Metaclass,
    StereotypeKeyword,
    Dataclass,
    Exception,
    Circle,
    Diamond,
    Extends,
    Implements,
    Package,
    Namespace,
    Together,
    Note,
    End,
    Left,
    Right,
    Top,
    Bottom,
    Of,
    As,
    LBrace,
    RBrace,

    common.LParen,
    common.RParen,
    common.LBracket,
    common.RBracket,
    common.Colon,
    common.Comma,
    common.Dot,
    common.Star,
    common.Slash,
    common.Backslash,
    common.Plus,
    common.Minus,
    common.VerticalBar,
    common.LAngle,
    common.RAngle,
    common.QuestionMark,
    common.Skinparam,
    common.Hide,
    common.Show,
    common.Page,
    common.Header,
    common.Footer,
    common.Title,
    common.Exclamation,

    common.StringLiteral,
    common.Color,
    common.Hash,
    common.Tilde,
    common.IdentifierLike,
    common.Identifier,
    common.NumberToken,
];

export const ClassLexer = new Lexer(allClassTokens);
