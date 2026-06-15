import { Lexer, createToken } from "chevrotain";
import * as common from "../common/tokens";

export const Participant = createToken({ name: "Participant", pattern: /participant\b/i, categories: [common.IdentifierLike] });
export const Actor = createToken({ name: "Actor", pattern: /actor\b/i, categories: [common.IdentifierLike] });
export const Order = createToken({ name: "Order", pattern: /order\b/i, categories: [common.IdentifierLike] });
export const Boundary = createToken({ name: "Boundary", pattern: /boundary\b/i, categories: [common.IdentifierLike] });
export const Control = createToken({ name: "Control", pattern: /control\b/i, categories: [common.IdentifierLike] });
export const Entity = createToken({ name: "Entity", pattern: /entity\b/i, categories: [common.IdentifierLike] });
export const Database = createToken({ name: "Database", pattern: /database\b/i, categories: [common.IdentifierLike] });
export const Collections = createToken({ name: "Collections", pattern: /collections\b/i, categories: [common.IdentifierLike] });
export const Queue = createToken({ name: "Queue", pattern: /queue\b/i, categories: [common.IdentifierLike] });
export const Alt = createToken({ name: "Alt", pattern: /alt\b/i, categories: [common.IdentifierLike] });
export const Else = createToken({ name: "Else", pattern: /else\b/i, categories: [common.IdentifierLike] });
export const Opt = createToken({ name: "Opt", pattern: /opt\b/i, categories: [common.IdentifierLike] });
export const Loop = createToken({ name: "Loop", pattern: /loop\b/i, categories: [common.IdentifierLike] });
export const Par = createToken({ name: "Par", pattern: /par\b/i, categories: [common.IdentifierLike] });
export const Group = createToken({ name: "Group", pattern: /group\b/i, categories: [common.IdentifierLike] });
export const Box = createToken({ name: "Box", pattern: /box\b/i, categories: [common.IdentifierLike] });
export const End = createToken({ name: "End", pattern: /end\b/i, categories: [common.IdentifierLike] });
export const Note = createToken({ name: "Note", pattern: /note\b/i, categories: [common.IdentifierLike] });
export const Ref = createToken({ name: "Ref", pattern: /ref\b/i, categories: [common.IdentifierLike] });
export const Autonumber = createToken({ name: "Autonumber", pattern: /autonumber\b/i, categories: [common.IdentifierLike] });
export const Newpage = createToken({ name: "Newpage", pattern: /newpage\b/i, categories: [common.IdentifierLike] });
export const Activate = createToken({ name: "Activate", pattern: /activate\b/i, categories: [common.IdentifierLike] });
export const Deactivate = createToken({ name: "Deactivate", pattern: /deactivate\b/i, categories: [common.IdentifierLike] });
export const Destroy = createToken({ name: "Destroy", pattern: /destroy\b/i, categories: [common.IdentifierLike] });
export const Autoactivate = createToken({ name: "Autoactivate", pattern: /autoactivate\b/i, categories: [common.IdentifierLike] });
export const Return = createToken({ name: "Return", pattern: /return\b/i, categories: [common.IdentifierLike] });
export const Create = createToken({ name: "Create", pattern: /create\b/i, categories: [common.IdentifierLike] });
export const As = createToken({ name: "As", pattern: /as\b/i, categories: [common.IdentifierLike] });
export const Left = createToken({ name: "Left", pattern: /left\b/i, categories: [common.IdentifierLike] });
export const Right = createToken({ name: "Right", pattern: /right\b/i, categories: [common.IdentifierLike] });
export const Top = createToken({ name: "Top", pattern: /top\b/i, categories: [common.IdentifierLike] });
export const Bottom = createToken({ name: "Bottom", pattern: /bottom\b/i, categories: [common.IdentifierLike] });
export const Over = createToken({ name: "Over", pattern: /over\b/i, categories: [common.IdentifierLike] });
export const Of = createToken({ name: "Of", pattern: /of\b/i, categories: [common.IdentifierLike] });
export const On = createToken({ name: "On", pattern: /on\b/i, categories: [common.IdentifierLike] });
export const Across = createToken({ name: "Across", pattern: /across\b/i, categories: [common.IdentifierLike] });
export const Off = createToken({ name: "Off", pattern: /off\b/i, categories: [common.IdentifierLike] });

export const Arrow = createToken({
    name: "Arrow",
    pattern: /(?:\([^)\r\n]+\))?(?:(?:<<|\/\/|\\\\|[<x\/\\o*^+#}0@!~#\[\]])+[-=.~]{1,4}(?:\[[^\]\r\n]+\])?[-=.~]{0,4}(?:\|>|>>|\\\\|\/\/|[>x\/\\o*?^+#{0@!~#|~=.\-\[\]])*(?:\+|-)*|[-=.~]{1,4}(?:\[[^\]\r\n]+\])?[-=.~]{0,4}(?:\|>|>>|\\\\|\/\/|[>x\/\\o*?^+#{0@!~#|~=.\-\[\]])+(?:\+|-)*|[-=.~]{1,4}(?:(?:up|down|left|right|hidden|horizontal|vertical|[lrud]|le|ri|do)(?![a-zA-Z_$])[-=.~]{0,4})+(?:\|>|>>|\\\\|\/\/|[>x\/\\o*?^+#{0@!~#|~=.\-\[\]])*(?:\+|-)*|[-=.~]{2,4}(?:\[[^\]\r\n]+\])?[-=.~]{0,4}(?:\+|-)*|=>|<->|<-|->|[0()]+[-=.~]{1,4}[0()\-.~]*|[-=.~]{1,4}(?!\([1-9])[0()\-.~]*[-=.~]+[0()\-.~]*)(?:\([^)\r\n]+\))?/
});

export const Divider = createToken({ name: "Divider", pattern: /==+[ \t]*[^ \n\r\t:=]+[ \t]*==+/ });
export const Delay = createToken({ name: "Delay", pattern: /\.\.\.[^.\n]*\.\.\.|\.\.\./ });

export const allSequenceTokens = [
    common.WhiteSpace,
    common.Newline,
    common.IdentifierLike,
    common.StartUml,
    common.EndUml,
    common.PosComment,
    common.MultiLineComment,
    common.LineComment,
    Delay,
    Divider,
    Arrow,
    common.Color,
    Participant,
    Actor,
    Order,
    Boundary,
    Control,
    Entity,
    Database,
    Collections,
    Queue,
    Alt,
    Else,
    Opt,
    Loop,
    Par,
    Group,
    Box,
    End,
    Note,
    Ref,
    Autonumber,
    Newpage,
    common.Skinparam,
    common.Header,
    common.Footer,
    common.Title,
    common.Hide,
    common.Show,
    common.Page,
    Activate,
    Deactivate,
    Destroy,
    Autoactivate,
    Return,
    Create,
    As,
    Left,
    Right,
    Top,
    Bottom,
    Over,
    Of,
    On,
    Across,
    Off,
    common.Colon,
    common.Comma,
    common.LBrace,
    common.RBrace,
    common.LParen,
    common.RParen,
    common.LBracket,
    common.RBracket,
    common.Dot,
    common.Slash,
    common.Backslash,
    common.Exclamation,
    common.QuestionMark,
    common.Star,
    common.VerticalBar,
    common.StringLiteral,
    common.Identifier,
    common.NumberToken
];

export const SequenceLexer = new Lexer(allSequenceTokens);
