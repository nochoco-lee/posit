import { IRDiagram } from "../ir/types";
import { PlantUmlScanner } from "./scanner";
import { SequenceLexer } from "./sequence/lexer";
import { parser as sequenceParser } from "./sequence/parser";
import { visitor as sequenceVisitor } from "./sequence/visitor";
import { ClassLexer } from "./class/lexer";
import { parser as classParser } from "./class/parser";
import { visitor as classVisitor } from "./class/visitor";
import { DeploymentLexer } from "./deployment/lexer";
import { parser as deploymentParser } from "./deployment/parser";
import { visitor as deploymentVisitor } from "./deployment/visitor";

function unescapeHtml(text: string): string {
    return text
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#34;/g, '"')
        .replace(/&#39;/g, "'");
}

export function parsePlantUml(text: string): IRDiagram {
    const unescapedText = unescapeHtml(text);
    const scanner = new PlantUmlScanner();
    const diagramType = scanner.scan(unescapedText);

    if (diagramType === 'unknown') {
        throw new Error("Could not determine PlantUML diagram type. Please ensure your script starts with @startuml and contains valid diagram elements.");
    }

    let lexer: any;
    let parser: any;
    let visitor: any;

    switch (diagramType) {
        case 'sequence':
            lexer = SequenceLexer;
            parser = sequenceParser;
            visitor = sequenceVisitor;
            break;
        case 'class':
            lexer = ClassLexer;
            parser = classParser;
            visitor = classVisitor;
            break;
        case 'deployment':
            lexer = DeploymentLexer;
            parser = deploymentParser;
            visitor = deploymentVisitor;
            break;
        default:
            throw new Error(`Unsupported diagram type: ${diagramType}`);
    }

    const lexResult = lexer.tokenize(unescapedText);
    if (lexResult.errors.length > 0) {
        // console.warn("Lexing errors:", lexResult.errors);
    }

    parser.input = lexResult.tokens;
    const cst = parser.diagram();

    if (parser.errors.length > 0) {
        const maxErrors = 5;
        const messages = parser.errors.slice(0, maxErrors).map((e: any) => e.message);
        let combined = messages.join("; ");
        if (parser.errors.length > maxErrors) {
            combined += `; ... and ${parser.errors.length - maxErrors} more error(s)`;
        }
        throw new Error(`Parsing errors (${diagramType}): ` + combined);
    }

    const ast = visitor.visit(cst);
    if (!ast) {
        throw new Error(`Parsing errors: Visitor returned null AST for ${diagramType}`);
    }
    
    ast.syntax = 'plantuml';
    ast.diagramType = diagramType;

    return ast;
}
