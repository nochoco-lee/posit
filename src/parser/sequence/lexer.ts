import { createToken, Lexer } from "chevrotain";
import * as common from "../common/tokens";

export const Participant = createToken({ name: "Participant", pattern: /participant\b/i });
export const Actor = createToken({ name: "Actor", pattern: /actor\b/i });
export const Boundary = createToken({ name: "Boundary", pattern: /boundary\b/i });
export const Control = createToken({ name: "Control", pattern: /control\b/i });
export const Entity = createToken({ name: "Entity", pattern: /entity\b/i });
export const Database = createToken({ name: "Database", pattern: /database\b/i });
export const Collections = createToken({ name: "Collections", pattern: /collections\b/i });
export const Queue = createToken({ name: "Queue", pattern: /queue\b/i });
export const Class = createToken({ name: "Class", pattern: /class\b/i });
export const ObjectKeyword = createToken({ name: "ObjectKeyword", pattern: /object\b/i });

export const Alt = createToken({ name: "Alt", pattern: /alt\b/i });
export const Else = createToken({ name: "Else", pattern: /else\b/i });
export const Opt = createToken({ name: "Opt", pattern: /opt\b/i });
export const Loop = createToken({ name: "Loop", pattern: /loop\b/i });
export const Par = createToken({ name: "Par", pattern: /par\b/i });
export const Group = createToken({ name: "Group", pattern: /group\b/i });
export const End = createToken({ name: "End", pattern: /end\b/i });
export const Partition = createToken({ name: "Partition", pattern: /partition\b/i });
export const Box = createToken({ name: "Box", pattern: /box\b/i });

export const Note = createToken({ name: "Note", pattern: /note\b/i });
export const Hnote = createToken({ name: "Hnote", pattern: /hnote\b/i });
export const Rnote = createToken({ name: "Rnote", pattern: /rnote\b/i });
export const EndNote = createToken({ name: "EndNote", pattern: /end\s*note\b/i });
export const EndHnote = createToken({ name: "EndHnote", pattern: /end\s*hnote\b/i });
export const EndRnote = createToken({ name: "EndRnote", pattern: /end\s*rnote\b/i });

export const Ref = createToken({ name: "Ref", pattern: /ref\b/i });
export const EndRef = createToken({ name: "EndRef", pattern: /end\s*ref\b/i });

export const Autonumber = createToken({ name: "Autonumber", pattern: /autonumber\b/i });
export const Newpage = createToken({ name: "Newpage", pattern: /newpage\b/i });
export const Activate = createToken({ name: "Activate", pattern: /activate\b/i });
export const Deactivate = createToken({ name: "Deactivate", pattern: /deactivate\b/i });
export const Destroy = createToken({ name: "Destroy", pattern: /destroy\b/i });
export const Autoactivate = createToken({ name: "Autoactivate", pattern: /autoactivate\b/i });
export const Return = createToken({ name: "Return", pattern: /return\b/i });
export const Create = createToken({ name: "Create", pattern: /create\b/i });
export const Bye = createToken({ name: "Bye", pattern: /bye\b/i });
export const Mainframe = createToken({ name: "Mainframe", pattern: /mainframe\b/i });
export const Order = createToken({ name: "Order", pattern: /order\b/i });

export const As = createToken({ name: "As", pattern: /as\b/i });
export const Stereotype = createToken({ name: "Stereotype", pattern: /<<[^>]+>>/ });
export const Left = createToken({ name: "Left", pattern: /left\b/i });
export const Right = createToken({ name: "Right", pattern: /right\b/i });
export const Top = createToken({ name: "Top", pattern: /top\b/i });
export const Bottom = createToken({ name: "Bottom", pattern: /bottom\b/i });
export const Over = createToken({ name: "Over", pattern: /over\b/i });
export const Off = createToken({ name: "Off", pattern: /off\b/i });
export const Of = createToken({ name: "Of", pattern: /of\b/i });
export const On = createToken({ name: "On", pattern: /on\b/i });
export const Across = createToken({ name: "Across", pattern: /across\b/i });
export const Stop = createToken({ name: "Stop", pattern: /stop\b/i });
export const Resume = createToken({ name: "Resume", pattern: /resume\b/i });
export const Inc = createToken({ name: "Inc", pattern: /inc\b/i });
export const Ignore = createToken({ name: "Ignore", pattern: /ignore\b/i });

export const Delay = createToken({ name: "Delay", pattern: /\.\.\./ });
export const Divider = createToken({ name: "Divider", pattern: /==+/ });
export const SpaceSeparator = createToken({ name: "SpaceSeparator", pattern: /\|\|(?:\d+\|\||\|)/ });

// Use a string pattern to avoid literal regex escaping pitfalls.
// Require at least one stick char AND (head OR multiple sticks).
const headChars = "?#*x<>\\[\\]\\\\/|o";
const head = `[${headChars}]`;
const arrowBody = `[-=.]+(?:\\[#[^\\]\\s]+\\])?[-=.]*`;
export const Arrow = createToken({
    name: "Arrow",
    pattern: new RegExp(`(${head}+${arrowBody}${head}*|${head}*${arrowBody}${head}+|${head}*${arrowBody}>${head}*)`),
});

export const allSequenceTokens = [
    common.WhiteSpace,
    common.Newline,
    common.StartUml,
    common.EndUml,
    common.PosComment,
    common.MultiLineComment,
    common.LineComment,
    
    Stereotype,
    Delay,
    Divider,
    Arrow, // High priority
    EndNote,
    EndHnote,
    EndRnote,
    EndRef,
    End,
    Alt,
    Else,
    Opt,
    Loop,
    Par,
    Group,
    Partition,
    Box,
    Participant,
    Actor,
    Boundary,
    Control,
    Entity,
    Database,
    Collections,
    Queue,
    Class,
    ObjectKeyword,
    Note,
    Hnote,
    Rnote,
    Ref,
    Autonumber,
    Newpage,
    Activate,
    Deactivate,
    Destroy,
    Autoactivate,
    Return,
    Create,
    Bye,
    Mainframe,
    Order,
    As,
    Left,
    Right,
    Top,
    Bottom,
    Over,
    Off, 
    Of,
    On,
    Across,
    Stop,
    Resume,
    Inc,
    Ignore,

    common.LParen,
    common.RParen,
    common.LBrace,
    common.RBrace,
    common.LBracket,
    common.RBracket,
    common.Colon,
    common.Comma,
    common.Dot,
    common.Star,
    SpaceSeparator,
    common.VerticalBar,
    common.LAngle,
    common.RAngle,
    common.Plus,
    common.Minus,
    common.Slash,
    common.Backslash,
    common.Exclamation,
    common.QuestionMark,
    common.Tilde,
    common.Color,
    common.Hash,
    common.Skinparam,
    common.Hide,
    common.Show,
    common.Page,
    common.Header,
    common.Footer,
    common.Title,

    common.StringLiteral,
    common.IdentifierLike,
    common.Identifier,
    common.NumberToken
];

export const SequenceLexer = new Lexer(allSequenceTokens);
