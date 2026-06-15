import { Lexer, createToken } from "chevrotain";
import * as common from "../common/tokens";

export const Artifact = createToken({ name: "Artifact", pattern: /artifact\b/i, categories: [common.IdentifierLike] });
export const Cloud = createToken({ name: "Cloud", pattern: /cloud\b/i, categories: [common.IdentifierLike] });
export const Component = createToken({ name: "Component", pattern: /component\b/i, categories: [common.IdentifierLike] });
export const NodeKeyword = createToken({ name: "NodeKeyword", pattern: /node\b/i, categories: [common.IdentifierLike] });
export const Storage = createToken({ name: "Storage", pattern: /storage\b/i, categories: [common.IdentifierLike] });
export const Rectangle = createToken({ name: "Rectangle", pattern: /rectangle\b/i, categories: [common.IdentifierLike] });
export const Card = createToken({ name: "Card", pattern: /card\b/i, categories: [common.IdentifierLike] });
export const FileKeyword = createToken({ name: "FileKeyword", pattern: /file\b/i, categories: [common.IdentifierLike] });
export const Hexagon = createToken({ name: "Hexagon", pattern: /hexagon\b/i, categories: [common.IdentifierLike] });
export const Person = createToken({ name: "Person", pattern: /person\b/i, categories: [common.IdentifierLike] });
export const Process = createToken({ name: "Process", pattern: /process\b/i, categories: [common.IdentifierLike] });
export const Agent = createToken({ name: "Agent", pattern: /agent\b/i, categories: [common.IdentifierLike] });
export const Usecase = createToken({ name: "Usecase", pattern: /usecase\b/i, categories: [common.IdentifierLike] });
export const Action = createToken({ name: "Action", pattern: /action\b/i, categories: [common.IdentifierLike] });
export const Package = createToken({ name: "Package", pattern: /package\b/i, categories: [common.IdentifierLike] });
export const Namespace = createToken({ name: "Namespace", pattern: /namespace\b/i, categories: [common.IdentifierLike] });
export const Folder = createToken({ name: "Folder", pattern: /folder\b/i, categories: [common.IdentifierLike] });
export const Frame = createToken({ name: "Frame", pattern: /frame\b/i, categories: [common.IdentifierLike] });
export const Database = createToken({ name: "Database", pattern: /database\b/i, categories: [common.IdentifierLike] });
export const Collections = createToken({ name: "Collections", pattern: /collections\b/i, categories: [common.IdentifierLike] });
export const Queue = createToken({ name: "Queue", pattern: /queue\b/i, categories: [common.IdentifierLike] });
export const Stack = createToken({ name: "Stack", pattern: /stack\b/i, categories: [common.IdentifierLike] });

export const Stereotype = createToken({ name: "Stereotype", pattern: /<<[^>]+>>/ });

export const Arrow = createToken({
    name: "Arrow",
    pattern: /[-=.~]{1,4}(?:up|down|left|right|hidden|horizontal|vertical|[lrud])?[-=.~]{0,4}(?:\|>|>>|[>x\/\\o*?^+#{0@!~#|~=.\-\[\]])*/
});

export const allDeploymentTokens = [
    common.WhiteSpace,
    common.Newline,
    common.IdentifierLike,
    common.StartUml,
    common.EndUml,
    common.PosComment,
    common.MultiLineComment,
    common.LineComment,
    Stereotype,
    Arrow,
    common.Color,
    Artifact,
    Cloud,
    Component,
    NodeKeyword,
    Storage,
    Rectangle,
    Card,
    FileKeyword,
    Hexagon,
    Person,
    Process,
    Agent,
    Usecase,
    Action,
    Package,
    Namespace,
    Folder,
    Frame,
    Database,
    Collections,
    Queue,
    Stack,
    common.Skinparam,
    common.Title,
    common.Header,
    common.Footer,
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

export const DeploymentLexer = new Lexer(allDeploymentTokens);
