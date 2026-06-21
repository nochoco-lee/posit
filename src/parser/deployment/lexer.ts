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
export const LabelEntity = createToken({ name: "LabelEntity", pattern: /label\b/i, categories: [common.IdentifierLike] });
export const Together = createToken({ name: "Together", pattern: /together\b/i, categories: [common.IdentifierLike] });
export const Control = createToken({ name: "Control", pattern: /control\b/i, categories: [common.IdentifierLike] });
export const Boundary = createToken({ name: "Boundary", pattern: /boundary\b/i, categories: [common.IdentifierLike] });
export const Entity = createToken({ name: "Entity", pattern: /entity\b/i, categories: [common.IdentifierLike] });
export const Package = createToken({ name: "Package", pattern: /package\b/i, categories: [common.IdentifierLike] });
export const Namespace = createToken({ name: "Namespace", pattern: /namespace\b/i, categories: [common.IdentifierLike] });
export const Folder = createToken({ name: "Folder", pattern: /folder\b/i, categories: [common.IdentifierLike] });
export const Frame = createToken({ name: "Frame", pattern: /frame\b/i, categories: [common.IdentifierLike] });
export const Database = createToken({ name: "Database", pattern: /database\b/i, categories: [common.IdentifierLike] });
export const Collections = createToken({ name: "Collections", pattern: /collections\b/i, categories: [common.IdentifierLike] });
export const Queue = createToken({ name: "Queue", pattern: /queue\b/i, categories: [common.IdentifierLike] });
export const Stack = createToken({ name: "Stack", pattern: /stack\b/i, categories: [common.IdentifierLike] });
export const Actor = createToken({ name: "Actor", pattern: /actor\b/i, categories: [common.IdentifierLike] });
export const ActorSlash = createToken({ name: "ActorSlash", pattern: /actor\//i, categories: [common.IdentifierLike] });
export const UsecaseSlash = createToken({ name: "UsecaseSlash", pattern: /usecase\//i, categories: [common.IdentifierLike] });
export const Interface = createToken({ name: "Interface", pattern: /interface\b/i, categories: [common.IdentifierLike] });

export const As = createToken({ name: "As", pattern: /as\b/i, categories: [common.IdentifierLike] });
export const Stereotype = createToken({ name: "Stereotype", pattern: /<<[^>]+>>/ });

export const Allowmixing = createToken({ name: "Allowmixing", pattern: /allowmixing\b/i, categories: [common.IdentifierLike] });
export const Port = createToken({ name: "Port", pattern: /port\b/i, categories: [common.IdentifierLike] });
export const Portin = createToken({ name: "Portin", pattern: /portin\b/i, categories: [common.IdentifierLike] });
export const Portout = createToken({ name: "Portout", pattern: /portout\b/i, categories: [common.IdentifierLike] });
export const Abstract = createToken({ name: "Abstract", pattern: /abstract\b/i, categories: [common.IdentifierLike] });
export const Annotation = createToken({ name: "Annotation", pattern: /annotation\b/i, categories: [common.IdentifierLike] });
export const Enum = createToken({ name: "Enum", pattern: /enum\b/i, categories: [common.IdentifierLike] });
export const Exception = createToken({ name: "Exception", pattern: /exception\b/i, categories: [common.IdentifierLike] });
export const Metaclass = createToken({ name: "Metaclass", pattern: /metaclass\b/i, categories: [common.IdentifierLike] });
export const Protocol = createToken({ name: "Protocol", pattern: /protocol\b/i, categories: [common.IdentifierLike] });
export const Struct = createToken({ name: "Struct", pattern: /struct\b/i, categories: [common.IdentifierLike] });
export const ObjectKeyword = createToken({ name: "ObjectKeyword", pattern: /object\b/i, categories: [common.IdentifierLike] });
export const Map = createToken({ name: "Map", pattern: /map\b/i, categories: [common.IdentifierLike] });
export const State = createToken({ name: "State", pattern: /state\b/i, categories: [common.IdentifierLike] });
export const Remove = createToken({ name: "Remove", pattern: /remove\b/i, categories: [common.IdentifierLike] });
export const Restore = createToken({ name: "Restore", pattern: /restore\b/i, categories: [common.IdentifierLike] });
export const Scale = createToken({ name: "Scale", pattern: /scale\b/i, categories: [common.IdentifierLike] });
export const Set = createToken({ name: "Set", pattern: /set\b/i, categories: [common.IdentifierLike] });
export const Json = createToken({ name: "Json", pattern: /json\b/i, categories: [common.IdentifierLike] });
export const Pragma = createToken({ name: "Pragma", pattern: /pragma\b/i, categories: [common.IdentifierLike] });
export const Style = createToken({ name: "Style", pattern: /style\b/i, categories: [common.IdentifierLike] });
export const Diamond = createToken({ name: "Diamond", pattern: /diamond\b/i, categories: [common.IdentifierLike] });
export const Circle = createToken({ name: "Circle", pattern: /circle\b/i, categories: [common.IdentifierLike] });

export const StyleBlock = createToken({
    name: "StyleBlock",
    pattern: /<style>[\s\S]*?<\/style>/i,
    group: Lexer.SKIPPED
});

export const Arrow = createToken({
    name: "Arrow",
    pattern: /[-=.~]+(?:\[[^\]]+\])[-=.~]*(?:\|>|>>|[>x\/\\o*?^+#])*|[<>*+#o()0\-=\.~\\/|x]{1,4}(?:left|right|up|down|le|ri|do|ur|dl|ld|rd|[lrud])?[<>*+#o()0\-=\.~\\/|x]{1,6}|[<>*+#o()0\-=\.~\\/|x]{2,12}/
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
    StyleBlock,
    Stereotype,
    Arrow,
    common.Plus,
    common.Minus,
    As,
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
    UsecaseSlash,
    Usecase,
    Action,
    LabelEntity,
    Together,
    Control,
    Boundary,
    Entity,
    Package,
    Namespace,
    Folder,
    Frame,
    Database,
    Collections,
    Queue,
    Stack,
    ActorSlash,
    Actor,
    Interface,
    common.Skinparam,
    common.Title,
    common.Header,
    common.Footer,
    common.Hide,
    common.Show,
    common.Page,
    Allowmixing,
    Port,
    Portin,
    Portout,
    Abstract,
    Annotation,
    Enum,
    Exception,
    Metaclass,
    Protocol,
    Struct,
    ObjectKeyword,
    Map,
    State,
    Remove,
    Restore,
    Scale,
    Set,
    Json,
    Pragma,
    Style,
    Diamond,
    Circle,
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
    common.Hash,
    common.Tilde,
    common.StringLiteral,
    common.Identifier,
    common.NumberToken
];

export const DeploymentLexer = new Lexer(allDeploymentTokens);
