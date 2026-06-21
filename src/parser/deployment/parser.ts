import { CstParser, EOF, defaultParserErrorProvider } from "chevrotain";
import * as lexer from "./lexer";
import * as common from "../common/tokens";

const fastErrorProvider = {
    ...defaultParserErrorProvider,
    buildNoViableAltMessage: (options: any) => {
        return `Expecting one of the possible Token sequences, but found: '${options.actual[0].image}'`;
    }
};

export class DeploymentParser extends CstParser {
    constructor() {
        super(lexer.allDeploymentTokens, {
            skipValidations: true,
            errorMessageProvider: fastErrorProvider,
            nodeLocationTracking: "full"
        });
        this.performSelfAnalysis();
    }

    public anyToken = this.RULE("anyToken", () => {
        this.OR([
            { ALT: () => this.CONSUME(common.Identifier) },
            { ALT: () => this.CONSUME(common.NumberToken) },
            { ALT: () => this.CONSUME(common.StringLiteral) },
            { ALT: () => this.CONSUME(common.Color) },
            { ALT: () => this.CONSUME(lexer.Arrow) },
            { ALT: () => this.CONSUME(lexer.Stereotype) },
            { ALT: () => this.CONSUME(common.Comma) },
            { ALT: () => this.CONSUME(common.LParen) },
            { ALT: () => this.CONSUME(common.RParen) },
            { ALT: () => this.CONSUME(common.LBrace) },
            { ALT: () => this.CONSUME(common.RBrace) },
            { ALT: () => this.CONSUME(common.LBracket) },
            { ALT: () => this.CONSUME(common.RBracket) },
            { ALT: () => this.CONSUME(common.Colon) },
            { ALT: () => this.CONSUME(common.Star) },
            { ALT: () => this.CONSUME(common.VerticalBar) },
            { ALT: () => this.CONSUME(common.Dot) },
            { ALT: () => this.CONSUME(common.Slash) },
            { ALT: () => this.CONSUME(common.Backslash) },
            { ALT: () => this.CONSUME(common.Exclamation) },
            { ALT: () => this.CONSUME(common.QuestionMark) },
            { ALT: () => this.CONSUME(common.LAngle) },
            { ALT: () => this.CONSUME(common.RAngle) },
            { ALT: () => this.CONSUME(common.Plus) },
            { ALT: () => this.CONSUME(common.Minus) },
            { ALT: () => this.CONSUME(common.Tilde) },
            { ALT: () => this.CONSUME(common.Hash) }
        ]);
    });

    public nodeIdentifier = this.RULE("nodeIdentifier", () => {
        this.OR([
            { ALT: () => this.CONSUME(common.Identifier) },
            { ALT: () => this.CONSUME(common.NumberToken) },
            { ALT: () => this.CONSUME(common.StringLiteral) },
            { ALT: () => this.CONSUME(lexer.Artifact) },
            { ALT: () => this.CONSUME(lexer.Cloud) },
            { ALT: () => this.CONSUME(lexer.Component) },
            { ALT: () => this.CONSUME(lexer.NodeKeyword) },
            { ALT: () => this.CONSUME(lexer.Storage) },
            { ALT: () => this.CONSUME(lexer.Rectangle) },
            { ALT: () => this.CONSUME(lexer.Card) },
            { ALT: () => this.CONSUME(lexer.FileKeyword) },
            { ALT: () => this.CONSUME(lexer.Hexagon) },
            { ALT: () => this.CONSUME(lexer.Person) },
            { ALT: () => this.CONSUME(lexer.Process) },
            { ALT: () => this.CONSUME(lexer.Agent) },
            { ALT: () => this.CONSUME(lexer.Usecase) },
            { ALT: () => this.CONSUME(lexer.Action) },
            { ALT: () => this.CONSUME(lexer.LabelEntity) },
            { ALT: () => this.CONSUME(lexer.Together) },
            { ALT: () => this.CONSUME(lexer.Control) },
            { ALT: () => this.CONSUME(lexer.Boundary) },
            { ALT: () => this.CONSUME(lexer.Entity) },
            { ALT: () => this.CONSUME(lexer.Package) },
            { ALT: () => this.CONSUME(lexer.Namespace) },
            { ALT: () => this.CONSUME(lexer.Folder) },
            { ALT: () => this.CONSUME(lexer.Frame) },
            { ALT: () => this.CONSUME(lexer.Database) },
            { ALT: () => this.CONSUME(lexer.Collections) },
            { ALT: () => this.CONSUME(lexer.Queue) },
            { ALT: () => this.CONSUME(lexer.Stack) },
            { ALT: () => this.CONSUME(lexer.Actor) },
            { ALT: () => this.CONSUME(lexer.ActorSlash) },
            { ALT: () => this.CONSUME(lexer.UsecaseSlash) },
            { ALT: () => this.CONSUME(lexer.Interface) },
            { ALT: () => this.CONSUME(lexer.Circle) }
        ]);
    });

    public namePart = this.RULE("namePart", () => { 
        this.OR([
            { ALT: () => this.SUBRULE(this.nodeIdentifier) },
            { ALT: () => this.CONSUME(common.StringLiteral) },
            { ALT: () => {
                this.CONSUME(common.LBracket);
                this.MANY({
                    GATE: () => this.LA(1).tokenType !== common.RBracket && this.LA(1).tokenType !== common.EndUml && this.LA(1).tokenType !== EOF,
                    DEF: () => this.SUBRULE(this.anyToken)
                });
                this.OPTION(() => this.CONSUME(common.RBracket));
            }},
            { ALT: () => {
                this.CONSUME(common.LParen);
                this.MANY1({ 
                    GATE: () => this.LA(1).tokenType !== common.RParen && this.LA(1).tokenType !== common.EndUml && this.LA(1).tokenType !== EOF, 
                    DEF: () => this.SUBRULE1(this.anyToken) 
                });
                this.OPTION1(() => this.CONSUME1(common.RParen));
            }},
            { ALT: () => {
                this.CONSUME(common.Colon);
                this.MANY2({
                    GATE: () => this.LA(1).tokenType !== common.Colon && this.LA(1).tokenType !== common.EndUml && this.LA(1).tokenType !== EOF,
                    DEF: () => this.SUBRULE2(this.anyToken)
                });
                this.OPTION2(() => this.CONSUME1(common.Colon));
            }}
        ]); 
    });

    public name = this.RULE("name", () => {
        this.SUBRULE(this.namePart, { LABEL: "part" });
        this.MANY(() => {
            this.CONSUME(common.Dot, { LABEL: "sep" });
            this.SUBRULE1(this.namePart, { LABEL: "part" });
        });
    });

    public payload = this.RULE("payload", () => {
        this.CONSUME(common.Colon);
        this.MANY({ 
            GATE: () => { const next = this.LA(1).tokenType; return next !== common.EndUml && next !== common.Newline && next !== EOF; }, 
            DEF: () => this.SUBRULE(this.anyToken) 
        });
    });

    public nodeOrContainer = this.RULE("nodeOrContainer", () => {
        this.OPTION(() => {
            this.OR([
                { ALT: () => this.CONSUME(lexer.Package) },
                { ALT: () => this.CONSUME(lexer.Namespace) },
                { ALT: () => this.CONSUME(lexer.Folder) },
                { ALT: () => this.CONSUME(lexer.Cloud) },
                { ALT: () => this.CONSUME(lexer.Frame) },
                { ALT: () => this.CONSUME(lexer.Artifact) },
                { ALT: () => this.CONSUME(lexer.Storage) },
                { ALT: () => this.CONSUME(lexer.Rectangle) },
                { ALT: () => this.CONSUME(lexer.Card) },
                { ALT: () => this.CONSUME(lexer.Component) },
                { ALT: () => this.CONSUME(lexer.NodeKeyword) },
                { ALT: () => this.CONSUME(lexer.Database) },
                { ALT: () => this.CONSUME(lexer.FileKeyword) },
                { ALT: () => this.CONSUME(lexer.Hexagon) },
                { ALT: () => this.CONSUME(lexer.Person) },
                { ALT: () => this.CONSUME(lexer.Process) },
                { ALT: () => this.CONSUME(lexer.Agent) },
                { ALT: () => this.CONSUME(lexer.Usecase) },
                { ALT: () => this.CONSUME(lexer.Action) },
                { ALT: () => this.CONSUME(lexer.LabelEntity) },
                { ALT: () => this.CONSUME(lexer.Together) },
                { ALT: () => this.CONSUME(lexer.Control) },
                { ALT: () => this.CONSUME(lexer.Boundary) },
                { ALT: () => this.CONSUME(lexer.Entity) },
                { ALT: () => this.CONSUME(lexer.Collections) },
                { ALT: () => this.CONSUME(lexer.Queue) },
                { ALT: () => this.CONSUME(lexer.Stack) },
                { ALT: () => this.CONSUME(lexer.Actor) },
                { ALT: () => this.CONSUME(lexer.ActorSlash) },
                { ALT: () => this.CONSUME(lexer.UsecaseSlash) },
                { ALT: () => this.CONSUME(lexer.Interface) },
                { ALT: () => this.CONSUME(lexer.Port) },
                { ALT: () => this.CONSUME(lexer.Portin) },
                { ALT: () => this.CONSUME(lexer.Portout) },
                { ALT: () => this.CONSUME(lexer.Abstract) },
                { ALT: () => this.CONSUME(lexer.Annotation) },
                { ALT: () => this.CONSUME(lexer.Circle) },
                { ALT: () => this.CONSUME(lexer.Diamond) },
                { ALT: () => this.CONSUME(lexer.Enum) },
                { ALT: () => this.CONSUME(lexer.Exception) },
                { ALT: () => this.CONSUME(lexer.Metaclass) },
                { ALT: () => this.CONSUME(lexer.Protocol) },
                { ALT: () => this.CONSUME(lexer.Struct) },
                { ALT: () => this.CONSUME(lexer.ObjectKeyword) },
                { ALT: () => this.CONSUME(lexer.Map) },
                { ALT: () => this.CONSUME(lexer.State) },
                { ALT: () => { this.CONSUME(common.LParen); this.CONSUME(common.RParen); } }
            ]);
        });
        this.SUBRULE(this.name, { LABEL: "name" });
        this.MANY(() => {
            this.OR1([
                { ALT: () => { this.CONSUME(lexer.As); this.SUBRULE1(this.name, { LABEL: "alias" }); }},
                { ALT: () => this.CONSUME(lexer.Stereotype, { LABEL: "stereo" }) },
                { ALT: () => this.CONSUME(common.Color, { LABEL: "color" }) }
            ]);
        });
        this.OPTION1(() => this.CONSUME(common.PosComment, { LABEL: "layout" }));
        this.OPTION2(() => {
            this.OR3([
                { ALT: () => {
                    this.CONSUME(common.LBrace);
                    this.MANY1({
                        GATE: () => this.LA(1).tokenType !== common.RBrace && this.LA(1).tokenType !== common.EndUml && this.LA(1).tokenType !== EOF,
                        DEF: () => this.OR2([ { ALT: () => this.CONSUME(common.Newline) }, { ALT: () => this.SUBRULE(this.statement) } ])
                    });
                    this.CONSUME(common.RBrace);
                }},
                { ALT: () => {
                    this.CONSUME(common.LBracket);
                    this.MANY2({
                        GATE: () => this.LA(1).tokenType !== common.RBracket && this.LA(1).tokenType !== common.EndUml && this.LA(1).tokenType !== EOF,
                        DEF: () => this.OR4([ { ALT: () => this.CONSUME1(common.Newline) }, { ALT: () => this.SUBRULE3(this.anyToken) } ])
                    });
                    this.OPTION3(() => this.CONSUME(common.RBracket));
                }}
            ]);
        });
    });

    public connectionDeclaration = this.RULE("connectionDeclaration", () => {
        this.SUBRULE1(this.name, { LABEL: "from" });
        this.CONSUME(lexer.Arrow, { LABEL: "arrow" });
        this.SUBRULE2(this.name, { LABEL: "to" });
        this.OPTION2(() => this.CONSUME(common.Color, { LABEL: "color" }));
        this.OPTION(() => this.SUBRULE(this.payload));
        this.OPTION1(() => this.CONSUME(common.PosComment, { LABEL: "layout" }));
    });

    public ignoredStatement = this.RULE("ignoredStatement", () => {
        this.OR([
            { ALT: () => this.CONSUME(common.Exclamation) },
            { ALT: () => this.CONSUME(common.Skinparam) },
            { ALT: () => this.CONSUME(common.Hide) },
            { ALT: () => this.CONSUME(common.Show) },
            { ALT: () => this.CONSUME(common.Page) },
            { ALT: () => this.CONSUME(common.Header) },
            { ALT: () => this.CONSUME(common.Footer) },
            { ALT: () => this.CONSUME(common.Title) },
            { ALT: () => this.CONSUME(lexer.Allowmixing) },
            { ALT: () => this.CONSUME(lexer.Remove) },
            { ALT: () => this.CONSUME(lexer.Restore) },
            { ALT: () => this.CONSUME(lexer.Scale) },
            { ALT: () => this.CONSUME(lexer.Set) },
            { ALT: () => this.CONSUME(lexer.Json) },
            { ALT: () => this.CONSUME(lexer.Pragma) },
            { ALT: () => {
                this.CONSUME(common.Identifier);
                this.CONSUME1(common.Identifier);
                this.CONSUME2(common.Identifier);
                this.CONSUME3(common.Identifier);
            }}
        ]);
        this.MANY({
             GATE: () => this.LA(1).tokenType !== common.Newline && this.LA(1).tokenType !== common.LBrace && this.LA(1).tokenType !== common.EndUml && this.LA(1).tokenType !== EOF,
             DEF: () => this.SUBRULE(this.anyToken)
        });
        this.OPTION(() => {
            this.CONSUME(common.LBrace);
            this.MANY1({
                GATE: () => this.LA(1).tokenType !== common.RBrace && this.LA(1).tokenType !== common.EndUml && this.LA(1).tokenType !== EOF,
                DEF: () => this.OR1([
                    { ALT: () => this.CONSUME(common.Newline) },
                    { ALT: () => this.SUBRULE1(this.anyToken) }
                ])
            });
            this.CONSUME(common.RBrace);
        });
    });

    public statement = this.RULE("statement", () => {
        this.OR([
            { GATE: () => this.isIgnored(), ALT: () => this.SUBRULE(this.ignoredStatement) },
            { GATE: () => this.isConnection(), ALT: () => this.SUBRULE(this.connectionDeclaration) },
            { ALT: () => this.SUBRULE(this.nodeOrContainer) }
        ]);
    });

    private isIgnored(): boolean {
        const tok = this.LA(1).tokenType;
        if (tok === common.Exclamation || tok === common.Skinparam || tok === common.Hide || tok === common.Show || tok === common.Page || tok === common.Header || tok === common.Footer || tok === common.Title) return true;
        if (tok === lexer.Allowmixing || tok === lexer.Remove || tok === lexer.Restore || tok === lexer.Scale || tok === lexer.Set || tok === lexer.Json || tok === lexer.Pragma) return true;
        const nextImage = this.LA(1).image?.toLowerCase();
        if (nextImage === 'left' || nextImage === 'right' || nextImage === 'top' || nextImage === 'bottom') {
            const secondImage = this.LA(2).image?.toLowerCase();
            if (secondImage === 'to') {
                const fourthImage = this.LA(4).image?.toLowerCase();
                if (fourthImage === 'direction') return true;
            }
        }
        return false;
    }

    private isConnection(): boolean {
        let i = 1;
        while(true) {
            const tok = this.LA(i).tokenType;
            if (tok === lexer.Arrow) return true;
            if (tok === common.Newline || tok === common.EndUml || tok === EOF) return false;
            i++;
            if (i > 30) return false;
        }
    }

    public diagram = this.RULE("diagram", () => {
        this.MANY(() => {
            this.OR([
                { ALT: () => this.CONSUME(common.Newline) },
                { ALT: () => this.CONSUME(common.StartUml) },
                { ALT: () => this.CONSUME(common.PosComment) },
                { ALT: () => this.SUBRULE(this.statement) },
                { ALT: () => this.CONSUME(common.EndUml) }
            ]);
        });
    });
}

export const parser = new DeploymentParser();
