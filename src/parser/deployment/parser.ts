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
            skipValidations: false,
            errorMessageProvider: fastErrorProvider
        });
        this.performSelfAnalysis();
    }

    public anyToken = this.RULE("anyToken", () => {
        this.OR([
            { ALT: () => this.CONSUME(common.IdentifierLike) },
            { ALT: () => this.CONSUME(lexer.Arrow) },
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
            { ALT: () => this.CONSUME(common.StringLiteral) },
            { ALT: () => this.CONSUME(common.Color) },
            { ALT: () => this.CONSUME(lexer.Stereotype) }
        ]);
    });

    public nodeIdentifier = this.RULE("nodeIdentifier", () => { this.CONSUME(common.IdentifierLike); });
    public namePart = this.RULE("namePart", () => { 
        this.OR([
            { ALT: () => this.SUBRULE(this.nodeIdentifier) },
            { ALT: () => this.CONSUME(common.StringLiteral) },
            { ALT: () => {
                this.CONSUME(common.LBracket);
                this.SUBRULE1(this.namePart);
                this.CONSUME(common.RBracket);
            }},
            { ALT: () => {
                this.CONSUME(common.LParen);
                this.SUBRULE2(this.namePart);
                this.CONSUME(common.RParen);
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
            GATE: () => { const next = this.LA(1).tokenType; return next !== common.EndUml && next !== common.Newline; }, 
            DEF: () => this.SUBRULE(this.anyToken) 
        });
    });

    public nodeOrContainer = this.RULE("nodeOrContainer", () => {
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
            { ALT: () => this.CONSUME(lexer.Action) }
        ]);
        this.SUBRULE(this.name, { LABEL: "name" });
        this.MANY(() => {
            this.OR1([
                { ALT: () => { this.CONSUME(lexer.As); this.SUBRULE1(this.name, { LABEL: "alias" }); }},
                { ALT: () => this.CONSUME(lexer.Stereotype, { LABEL: "stereo" }) },
                { ALT: () => this.CONSUME(common.Color, { LABEL: "color" }) }
            ]);
        });
        this.OPTION(() => this.CONSUME(common.PosComment, { LABEL: "layout" }));
        this.OPTION1(() => {
            this.CONSUME(common.LBrace);
            this.MANY1({
                GATE: () => this.LA(1).tokenType !== common.RBrace && this.LA(1).tokenType !== common.EndUml,
                DEF: () => this.OR2([ { ALT: () => this.CONSUME(common.Newline) }, { ALT: () => this.SUBRULE(this.statement) } ])
            });
            this.CONSUME(common.RBrace);
        });
    });

    public connectionDeclaration = this.RULE("connectionDeclaration", () => {
        this.SUBRULE1(this.name, { LABEL: "from" });
        this.CONSUME(lexer.Arrow, { LABEL: "arrow" });
        this.SUBRULE2(this.name, { LABEL: "to" });
        this.OPTION(() => this.SUBRULE(this.payload));
        this.OPTION1(() => this.CONSUME(common.PosComment, { LABEL: "layout" }));
    });

    public ignoredStatement = this.RULE("ignoredStatement", () => {
        this.OR([
            { ALT: () => this.CONSUME(common.Skinparam) },
            { ALT: () => this.CONSUME(common.Hide) },
            { ALT: () => this.CONSUME(common.Show) },
            { ALT: () => this.CONSUME(common.Page) },
            { ALT: () => this.CONSUME(common.Header) },
            { ALT: () => this.CONSUME(common.Footer) },
            { ALT: () => this.CONSUME(common.Title) }
        ]);
        this.MANY({
             GATE: () => this.LA(1).tokenType !== common.Newline && this.LA(1).tokenType !== common.LBrace && this.LA(1).tokenType !== common.EndUml,
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
            { GATE: this.isIgnored, ALT: () => this.SUBRULE(this.ignoredStatement) },
            { ALT: () => this.SUBRULE(this.nodeOrContainer) },
            { GATE: this.isConnection, ALT: () => this.SUBRULE(this.connectionDeclaration) }
        ]);
    });

    private isIgnored(): boolean {
        const tok = this.LA(1).tokenType;
        return tok === common.Skinparam || tok === common.Hide || tok === common.Show || tok === common.Page || tok === common.Header || tok === common.Footer || tok === common.Title;
    }

    private isConnection(): boolean {
        let i = 1;
        while(true) {
            const tok = this.LA(i).tokenType;
            if (tok === lexer.Arrow) return true;
            if (tok === common.Newline || tok === common.EndUml || tok === EOF) return false;
            i++;
            if (i > 10) return false;
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
