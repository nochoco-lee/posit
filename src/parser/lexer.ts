import { Lexer, createToken } from "chevrotain";

// ----------------- Tokens -----------------
export const IdentifierLike = createToken({ name: "IdentifierLike", pattern: Lexer.NA });
export const StartUml = createToken({ name: "StartUml", pattern: /@startuml/ });
export const EndUml = createToken({ name: "EndUml", pattern: /@enduml/ });

// Keywords (Sequence)
export const Participant = createToken({ name: "Participant", pattern: /participant\b/, categories: [IdentifierLike] });
export const Actor = createToken({ name: "Actor", pattern: /actor\b/, categories: [IdentifierLike] });
export const Order = createToken({ name: "Order", pattern: /order\b/, categories: [IdentifierLike] });
export const Boundary = createToken({ name: "Boundary", pattern: /boundary\b/, categories: [IdentifierLike] });
export const Control = createToken({ name: "Control", pattern: /control\b/, categories: [IdentifierLike] });
export const Entity = createToken({ name: "Entity", pattern: /entity\b/, categories: [IdentifierLike] });
export const Database = createToken({ name: "Database", pattern: /database\b/, categories: [IdentifierLike] });
export const Collections = createToken({ name: "Collections", pattern: /collections\b/, categories: [IdentifierLike] });
export const Queue = createToken({ name: "Queue", pattern: /queue\b/, categories: [IdentifierLike] });
export const Alt = createToken({ name: "Alt", pattern: /alt\b/, categories: [IdentifierLike] });
export const Else = createToken({ name: "Else", pattern: /else\b/, categories: [IdentifierLike] });
export const Opt = createToken({ name: "Opt", pattern: /opt\b/, categories: [IdentifierLike] });
export const Loop = createToken({ name: "Loop", pattern: /loop\b/, categories: [IdentifierLike] });
export const Par = createToken({ name: "Par", pattern: /par\b/, categories: [IdentifierLike] });
export const Group = createToken({ name: "Group", pattern: /group\b/, categories: [IdentifierLike] });
export const Partition = createToken({ name: "Partition", pattern: /partition\b/, categories: [IdentifierLike] });
export const Box = createToken({ name: "Box", pattern: /box\b/, categories: [IdentifierLike] });
export const Endhnote = createToken({ name: "Endhnote", pattern: /endhnote\b/, categories: [IdentifierLike] });
export const Endrnote = createToken({ name: "Endrnote", pattern: /endrnote\b/, categories: [IdentifierLike] });
export const EndNote = createToken({ name: "EndNote", pattern: /end\s+note\b/, categories: [IdentifierLike] });
export const Endref = createToken({ name: "Endref", pattern: /end\s+ref\b/, categories: [IdentifierLike] });
export const End = createToken({ name: "End", pattern: /end\b/, categories: [IdentifierLike] });
export const Hnote = createToken({ name: "Hnote", pattern: /hnote\b/, categories: [IdentifierLike] });
export const Rnote = createToken({ name: "Rnote", pattern: /rnote\b/, categories: [IdentifierLike] });
export const Note = createToken({ name: "Note", pattern: /note\b/, categories: [IdentifierLike] });
export const Ref = createToken({ name: "Ref", pattern: /ref\b/, categories: [IdentifierLike] });
export const Autonumber = createToken({ name: "Autonumber", pattern: /autonumber\b/, categories: [IdentifierLike] });
export const Newpage = createToken({ name: "Newpage", pattern: /newpage\b/, categories: [IdentifierLike] });
export const Ignore = createToken({ name: "Ignore", pattern: /ignore\b/, categories: [IdentifierLike] });
export const Skinparam = createToken({ name: "Skinparam", pattern: /skinparam\b/, categories: [IdentifierLike] });
export const Header = createToken({ name: "Header", pattern: /header\b/, categories: [IdentifierLike] });
export const Footer = createToken({ name: "Footer", pattern: /footer\b/, categories: [IdentifierLike] });
export const Title = createToken({ name: "Title", pattern: /title/, categories: [IdentifierLike] });
export const Hide = createToken({ name: "Hide", pattern: /hide/, categories: [IdentifierLike] });
export const Show = createToken({ name: "Show", pattern: /show/, categories: [IdentifierLike] });
export const Remove = createToken({ name: "Remove", pattern: /remove\b/, categories: [IdentifierLike] });
export const Restore = createToken({ name: "Restore", pattern: /restore\b/, categories: [IdentifierLike] });
export const Empty = createToken({ name: "Empty", pattern: /empty/, categories: [IdentifierLike] });
export const Members = createToken({ name: "Members", pattern: /members\b/, categories: [IdentifierLike] });
export const Fields = createToken({ name: "Fields", pattern: /fields\b/, categories: [IdentifierLike] });
export const Methods = createToken({ name: "Methods", pattern: /methods\b/, categories: [IdentifierLike] });
export const Left = createToken({ name: "Left", pattern: /left\b/, categories: [IdentifierLike] });
export const Right = createToken({ name: "Right", pattern: /right\b/, categories: [IdentifierLike] });
export const Top = createToken({ name: "Top", pattern: /top\b/, categories: [IdentifierLike] });
export const Bottom = createToken({ name: "Bottom", pattern: /bottom\b/, categories: [IdentifierLike] });
export const Over = createToken({ name: "Over", pattern: /over\b/, categories: [IdentifierLike] });
export const Across = createToken({ name: "Across", pattern: /across\b/, categories: [IdentifierLike] });
export const Of = createToken({ name: "Of", pattern: /of\b/, categories: [IdentifierLike] });
export const Activate = createToken({ name: "Activate", pattern: /activate\b/, categories: [IdentifierLike] });
export const Deactivate = createToken({ name: "Deactivate", pattern: /deactivate\b/, categories: [IdentifierLike] });
export const Destroy = createToken({ name: "Destroy", pattern: /destroy\b/, categories: [IdentifierLike] });
export const Autoactivate = createToken({ name: "Autoactivate", pattern: /autoactivate\b/, categories: [IdentifierLike] });
export const Return = createToken({ name: "Return", pattern: /return\b/, categories: [IdentifierLike] });
export const Create = createToken({ name: "Create", pattern: /create\b/, categories: [IdentifierLike] });
export const Mainframe = createToken({ name: "Mainframe", pattern: /mainframe\b/, categories: [IdentifierLike] });
export const On = createToken({ name: "On", pattern: /on\b/, categories: [IdentifierLike] });
export const Off = createToken({ name: "Off", pattern: /off\b/, categories: [IdentifierLike] });
export const Allowmixing = createToken({ name: "Allowmixing", pattern: /allowmixing\b/, categories: [IdentifierLike] });
export const MapKeyword = createToken({ name: "MapKeyword", pattern: /map\b/, categories: [IdentifierLike] });
export const State = createToken({ name: "State", pattern: /state\b/, categories: [IdentifierLike] });

// Directives
export const Scale = createToken({ name: "Scale", pattern: /scale\b/, categories: [IdentifierLike] });
export const Page = createToken({ name: "Page", pattern: /page\b/, categories: [IdentifierLike] });
export const To = createToken({ name: "To", pattern: /to\b/, categories: [IdentifierLike] });
export const Direction = createToken({ name: "Direction", pattern: /direction\b/, categories: [IdentifierLike] });
export const Set = createToken({ name: "Set", pattern: /set\b/, categories: [IdentifierLike] });
export const Separator = createToken({ name: "Separator", pattern: /separator\b/, categories: [IdentifierLike] });
export const None = createToken({ name: "None", pattern: /none\b/, categories: [IdentifierLike] });
export const Width = createToken({ name: "Width", pattern: /width\b/, categories: [IdentifierLike] });
export const Height = createToken({ name: "Height", pattern: /height\b/, categories: [IdentifierLike] });

// Keywords (Class)
export const Class = createToken({ name: "Class", pattern: /class\b/, categories: [IdentifierLike] });
export const Interface = createToken({ name: "Interface", pattern: /interface\b/, categories: [IdentifierLike] });
export const Enum = createToken({ name: "Enum", pattern: /enum\b/, categories: [IdentifierLike] });
export const Struct = createToken({ name: "Struct", pattern: /struct\b/, categories: [IdentifierLike] });
export const Annotation = createToken({ name: "Annotation", pattern: /annotation\b/, categories: [IdentifierLike] });
export const Abstract = createToken({ name: "Abstract", pattern: /abstract\b/, categories: [IdentifierLike] });
export const Circle = createToken({ name: "Circle", pattern: /circle\b/, categories: [IdentifierLike] });
export const Diamond = createToken({ name: "Diamond", pattern: /diamond\b/, categories: [IdentifierLike] });
export const Exception = createToken({ name: "Exception", pattern: /exception\b/, categories: [IdentifierLike] });
export const Metaclass = createToken({ name: "Metaclass", pattern: /metaclass\b/, categories: [IdentifierLike] });
export const Protocol = createToken({ name: "Protocol", pattern: /protocol\b/, categories: [IdentifierLike] });
export const Record = createToken({ name: "Record", pattern: /record\b/, categories: [IdentifierLike] });
export const Stereotype = createToken({ name: "Stereotype", pattern: /stereotype\b/, categories: [IdentifierLike] });
export const Dataclass = createToken({ name: "Dataclass", pattern: /dataclass\b/, categories: [IdentifierLike] });
export const ObjectKeyword = createToken({ name: "ObjectKeyword", pattern: /object\b/, categories: [IdentifierLike] });
export const Json = createToken({ name: "Json", pattern: /json\b/, categories: [IdentifierLike] });
export const Together = createToken({ name: "Together", pattern: /together\b/, categories: [IdentifierLike] });
export const Package = createToken({ name: "Package", pattern: /package\b/, categories: [IdentifierLike] });
export const Namespace = createToken({ name: "Namespace", pattern: /namespace\b/, categories: [IdentifierLike] });
export const Folder = createToken({ name: "Folder", pattern: /folder\b/, categories: [IdentifierLike] });
export const Cloud = createToken({ name: "Cloud", pattern: /cloud\b/, categories: [IdentifierLike] });
export const Frame = createToken({ name: "Frame", pattern: /frame\b/, categories: [IdentifierLike] });
export const Rect = createToken({ name: "Rect", pattern: /rect\b/, categories: [IdentifierLike] });
export const NodeKeyword = createToken({ name: "NodeKeyword", pattern: /node\b/, categories: [IdentifierLike] });
export const Artifact = createToken({ name: "Artifact", pattern: /artifact\b/, categories: [IdentifierLike] });
export const Storage = createToken({ name: "Storage", pattern: /storage\b/, categories: [IdentifierLike] });
export const Rectangle = createToken({ name: "Rectangle", pattern: /rectangle\b/, categories: [IdentifierLike] });
export const Card = createToken({ name: "Card", pattern: /card\b/, categories: [IdentifierLike] });
export const FileKeyword = createToken({ name: "FileKeyword", pattern: /file\b/, categories: [IdentifierLike] });
export const Stack = createToken({ name: "Stack", pattern: /stack\b/, categories: [IdentifierLike] });
export const Hexagon = createToken({ name: "Hexagon", pattern: /hexagon\b/, categories: [IdentifierLike] });
export const Person = createToken({ name: "Person", pattern: /person\b/, categories: [IdentifierLike] });
export const Process = createToken({ name: "Process", pattern: /process\b/, categories: [IdentifierLike] });
export const Agent = createToken({ name: "Agent", pattern: /agent\b/, categories: [IdentifierLike] });
export const LabelKeyword = createToken({ name: "LabelKeyword", pattern: /label\b/, categories: [IdentifierLike] });
export const Usecase = createToken({ name: "Usecase", pattern: /usecase\b/, categories: [IdentifierLike] });
export const Component = createToken({ name: "Component", pattern: /component\b/, categories: [IdentifierLike] });
export const Action = createToken({ name: "Action", pattern: /action\b/, categories: [IdentifierLike] });
export const Port = createToken({ name: "Port", pattern: /port\b/, categories: [IdentifierLike] });
export const PortIn = createToken({ name: "PortIn", pattern: /portin\b/, categories: [IdentifierLike] });
export const PortOut = createToken({ name: "PortOut", pattern: /portout\b/, categories: [IdentifierLike] });

export const Extends = createToken({ name: "Extends", pattern: /extends\b/, categories: [IdentifierLike] });
export const Implements = createToken({ name: "Implements", pattern: /implements\b/, categories: [IdentifierLike] });

export const DiamondShort = createToken({ name: "DiamondShort", pattern: /<>/, categories: [IdentifierLike] });
export const DoubleColon = createToken({ name: "DoubleColon", pattern: /::/, categories: [IdentifierLike] });

export const LAngle = createToken({ name: "LAngle", pattern: /</ });
export const RAngle = createToken({ name: "RAngle", pattern: />/ });

// Arrows (Sequence & Class Relations)
export const Arrow = createToken({
    name: "Arrow",
    pattern: /(?:(?:<\||<<|\/\/|\\\\|[<x\/\\o*^+#}0@()])+[~=.-]{1,4}(?:\[[^\]\r\n]+\])?[~=.-]{0,4}(?:\|>|>>|\/\/|\\\\|[>x\/\\o*?^+#{0@()|:~=.-])*(?:\+|-)*|[~=.-]{1,4}(?:\[[^\]\r\n]+\])?[~=.-]{0,4}(?:\|>|>>|\/\/|\\\\|[>x\/\\o*?^+#{0@()|:~=.-])+(?:\+|-)*|[~=.-]{1,4}(?:(?:up|down|left|right|hidden|horizontal|vertical|[lrud]|le|ri|do)(?![a-zA-Z0-9_$])[~=.-]{0,4})?(?:\|>|>>|\/\/|\\\\|[>x\/\\o*?^+#{0@()|:~=.-])*(?:\+|-)*|[~=.-]{1,4}(?:\[[^\]\r\n]+\])?[~=.-]{0,4}(?:\+|-)*|\.\.{1,4}(?:\[[^\]\r\n]+\])?\.\.{0,4}(?:\|>|>>|\/\/|\\\\|[>x\/\\o*?^+#{0@()|:~=.-])*(?:\+|-)*|\.\.{1,4}(?:(?:up|down|left|right|hidden|horizontal|vertical|[lrud]|le|ri|do)(?![a-zA-Z0-9_$])\.\.{0,4})?(?:\|>|>>|\/\/|\\\\|[>x\/\\o*?^+#{0@()|:~=.-])*(?:\+|-)*|=>)/
});

// Delimiters & Symbols
export const Divider = createToken({ name: "Divider", pattern: /==+.*==+/ });
export const Delay = createToken({ name: "Delay", pattern: /\.\.\./ });

export const Dot = createToken({ name: "Dot", pattern: /\./, longer_alt: [Arrow, Delay] });

export const Comma = createToken({ name: "Comma", pattern: /,/ });
export const LBrace = createToken({ name: "LBrace", pattern: /\{/ });
export const RBrace = createToken({ name: "RBrace", pattern: /\}/ });
export const LParen = createToken({ name: "LParen", pattern: /\(/ });
export const RParen = createToken({ name: "RParen", pattern: /\)/ });
export const Colon = createToken({ name: "Colon", pattern: /:/, longer_alt: Arrow });
export const Slash = createToken({ name: "Slash", pattern: /\//, longer_alt: Arrow });

export const LBracket = createToken({ name: "LBracket", pattern: /\[/ });
export const RBracket = createToken({ name: "RBracket", pattern: /\]/ });
export const LGuillemet = createToken({ name: "LGuillemet", pattern: /<</ });
export const RGuillemet = createToken({ name: "RGuillemet", pattern: />>/ });
export const Quote = createToken({ name: "Quote", pattern: /"/ });
export const Backslash = createToken({ name: "Backslash", pattern: /\\/ });
export const Star = createToken({ name: "Star", pattern: /\*/ });
export const Exclamation = createToken({ name: "Exclamation", pattern: /!/ });
export const QuestionMark = createToken({ name: "QuestionMark", pattern: /\?/ });
export const Ampersand = createToken({ name: "Ampersand", pattern: /&/ });
export const VerticalBar = createToken({ name: "VerticalBar", pattern: /\|/ });

// String Literal: e.g. "This is a label\nwith newline"
export const StringLiteral = createToken({
    name: "StringLiteral",
    pattern: /"(?:[^\\"]|\\.|[\r\n])*"/
});

// Metadata Layout Comment: /' @pos(x, y) '/
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

// Identifier: e.g. "Alice", "UserService", "$C1"
export const Identifier = createToken({ name: "Identifier", pattern: /[a-zA-Z_][a-zA-Z0-9_]*/, categories: [IdentifierLike] });

export const As = createToken({ name: "As", pattern: /as\b/, longer_alt: Identifier, categories: [IdentifierLike] });

export const Other = createToken({ name: "Other", pattern: /./ });

// Newline must be handled as a separator
export const Newline = createToken({
    name: "Newline",
    pattern: /\n|\r\n|\r/
});

export const Color = createToken({ name: "Color", pattern: /#+(?!(?:class|interface|enum|struct|annotation|abstract|entity|participant|actor|boundary|control|database|collections|queue|object|package|namespace|json|together|hnote|rnote|note|ref|alt|opt|loop|par|group|partition|box|else|end|create|return|autoactivate|newpage|ignore|skinparam|hide|show|remove|restore|empty|members|fields|methods|header|footer|title|mainframe|scale|page|set|separator|none|width|height|to|direction|left|right|top|bottom|across|of|over)\b)(?:[a-zA-Z0-9]+)?(?:[-/|\\.;\[\]a-zA-Z0-9]+|:[a-zA-Z0-9]+)*/ });

// Class Diagram specific markers
export const Visibility = createToken({ 
    name: "Visibility", 
    pattern: /[\+\-#~]/,
    longer_alt: [Arrow, Color]
});

export const StaticModifier = createToken({ name: "StaticModifier", pattern: /\{static\}/, categories: [IdentifierLike] });
export const AbstractModifier = createToken({ name: "AbstractModifier", pattern: /\{abstract\}/, categories: [IdentifierLike] });
export const FieldMarker = createToken({ name: "FieldMarker", pattern: /\{field\}/, categories: [IdentifierLike] });
export const MethodMarker = createToken({ name: "MethodMarker", pattern: /\{method\}/, categories: [IdentifierLike] });
export const Generic = createToken({ name: "Generic", pattern: /~[a-zA-Z0-9_]+~/, categories: [IdentifierLike] });

// Whitespace (Ignored)
export const WhiteSpace = createToken({
    name: "WhiteSpace",
    pattern: /[ \t]+/,
    group: Lexer.SKIPPED
});

export const allTokens = [
    WhiteSpace,
    Newline,
    IdentifierLike,
    StartUml,
    EndUml,
    PosComment,
    MultiLineComment,
    LineComment,
    Generic,
    Dot,
    Visibility,
    Arrow,
    Divider,
    Color,
    Delay,
    Participant,
    Actor,
    Order,
    Boundary,
    Control,
    Entity,
    Database,
    Collections,
    Queue,
    Class,
    Interface,
    Enum,
    Struct,
    Annotation,
    Abstract,
    Circle,
    Diamond,
    Exception,
    Metaclass,
    Protocol,
    Record,
    Stereotype,
    Dataclass,
    ObjectKeyword,
    Json,
    Together,
    Package,
    Namespace,
    Folder,
    Cloud,
    Frame,
    Rect,
    NodeKeyword,
    Artifact,
    Storage,
    Rectangle,
    Card,
    FileKeyword,
    Stack,
    Hexagon,
    Person,
    Process,
    Agent,
    LabelKeyword,
    Usecase,
    Component,
    Action,
    Port,
    PortIn,
    PortOut,
    Extends,
    Implements,
    DiamondShort,
    DoubleColon,
    Alt,
    Else,
    Opt,
    Loop,
    Par,
    Group,
    Partition,
    Box,
    Endhnote,
    Endrnote,
    EndNote,
    Endref,
    End,
    Hnote,
    Rnote,
    Note,
    Ref,
    Autonumber,
    Newpage,
    Ignore,
    Skinparam,
    Header,
    Footer,
    Title,
    Hide,
    Show,
    Remove,
    Restore,
    Empty,
    Members,
    Fields,
    Methods,
    Left,
    Right,
    Top,
    Bottom,
    Over,
    Across,
    Of,
    As,
    Scale,
    Page,
    To,
    Direction,
    Set,
    Separator,
    None,
    Width,
    Height,
    Activate,
    Deactivate,
    Destroy,
    Autoactivate,
    Return,
    Create,
    Mainframe,
    On,
    Off,
    Allowmixing,
    MapKeyword,
    State,
    Generic,
    StaticModifier,
    AbstractModifier,
    FieldMarker,
    MethodMarker,
    Comma,
    LBrace,
    RBrace,
    LParen,
    RParen,
    LBracket,
    RBracket,
    LGuillemet,
    RGuillemet,
    Colon,
    Star,
    Exclamation,
    QuestionMark,
    Ampersand,
    VerticalBar,
    LAngle,
    RAngle,
    StringLiteral,
    Quote,
    Backslash,
    Slash,
    Identifier,
    Other
];

export const SequenceLexer = new Lexer(allTokens);
