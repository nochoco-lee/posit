import { Lexer, createToken } from "chevrotain";
import * as common from "../common/tokens";

export const Class = createToken({ name: "Class", pattern: /class\b/i, categories: [common.IdentifierLike] });
export const Interface = createToken({ name: "Interface", pattern: /interface\b/i, categories: [common.IdentifierLike] });
export const Enum = createToken({ name: "Enum", pattern: /enum\b/i, categories: [common.IdentifierLike] });
export const Struct = createToken({ name: "Struct", pattern: /struct\b/i, categories: [common.IdentifierLike] });
export const Annotation = createToken({ name: "Annotation", pattern: /annotation\b/i, categories: [common.IdentifierLike] });
export const Abstract = createToken({ name: "Abstract", pattern: /abstract\b/i, categories: [common.IdentifierLike] });
export const Entity = createToken({ name: "Entity", pattern: /entity\b/i, categories: [common.IdentifierLike] });
export const Circle = createToken({ name: "Circle", pattern: /circle\b/i, categories: [common.IdentifierLike] });
export const Diamond = createToken({ name: "Diamond", pattern: /diamond\b/i, categories: [common.IdentifierLike] });
export const Exception = createToken({ name: "Exception", pattern: /exception\b/i, categories: [common.IdentifierLike] });
export const Metaclass = createToken({ name: "Metaclass", pattern: /metaclass\b/i, categories: [common.IdentifierLike] });
export const Protocol = createToken({ name: "Protocol", pattern: /protocol\b/i, categories: [common.IdentifierLike] });
export const Record = createToken({ name: "Record", pattern: /record\b/i, categories: [common.IdentifierLike] });
export const Stereotype = createToken({ name: "Stereotype", pattern: /stereotype\b/i, categories: [common.IdentifierLike] });
export const Extends = createToken({ name: "Extends", pattern: /extends\b/i, categories: [common.IdentifierLike] });
export const Implements = createToken({ name: "Implements", pattern: /implements\b/i, categories: [common.IdentifierLike] });

export const Arrow = createToken({
    name: "Arrow",
    pattern: /(?:<\||<<|[o*<x#^+#}])?[-=.~]{1,4}(?:up|down|left|right|hidden|horizontal|vertical|[lrud])?[-=.~]{0,4}(?:\|>|>>|[>x\/\\o*?^+#{0@!~#|~=.\-\[\]])*/
});

export const Visibility = createToken({
    name: "Visibility",
    pattern: /[\+\-#~]/,
    longer_alt: [Arrow, common.Color]
});

export const StaticModifier = createToken({ name: "StaticModifier", pattern: /\{static\}/, categories: [common.IdentifierLike] });
export const AbstractModifier = createToken({ name: "AbstractModifier", pattern: /\{abstract\}/, categories: [common.IdentifierLike] });
export const FieldMarker = createToken({ name: "FieldMarker", pattern: /\{field\}/, categories: [common.IdentifierLike] });
export const MethodMarker = createToken({ name: "MethodMarker", pattern: /\{method\}/, categories: [common.IdentifierLike] });

export const allClassTokens = [
    common.WhiteSpace,
    common.Newline,
    common.IdentifierLike,
    common.StartUml,
    common.EndUml,
    common.PosComment,
    common.MultiLineComment,
    common.LineComment,
    common.Plus,
    common.Minus,
    Arrow,
    common.Color,
    Visibility,
    Class,
    Interface,
    Enum,
    Struct,
    Annotation,
    Abstract,
    Entity,
    Circle,
    Diamond,
    Exception,
    Metaclass,
    Protocol,
    Record,
    Stereotype,
    Extends,
    Implements,
    StaticModifier,
    AbstractModifier,
    FieldMarker,
    MethodMarker,
    common.Skinparam,
    common.Title,
    common.Header,
    common.Footer,
    common.Hide,
    common.Show,
    common.Page,
    common.LBrace,
    common.RBrace,
    common.LParen,
    common.RParen,
    common.LBracket,
    common.RBracket,
    common.Colon,
    common.Comma,
    common.Star,
    common.VerticalBar,
    common.Dot,
    common.Slash,
    common.Backslash,
    common.Exclamation,
    common.QuestionMark,
    common.LAngle,
    common.RAngle,
    common.StringLiteral,
    common.Identifier,
    common.NumberToken
];

export const ClassLexer = new Lexer(allClassTokens);
