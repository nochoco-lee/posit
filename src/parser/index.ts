import { SequenceLexer } from "./lexer";
import { parser } from "./parser";
import { visitor } from "./visitor";
import { IRDiagram, IRStatement, IRNode, IRContainer, IREdge } from "../ir/types";

function unescapeHtml(text: string): string {
    return text
        .replace(/&quot;/g, '"')
        .replace(/&#34;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
}

function formatParserError(error: any): string {
    let msg = error.message;
    const token = error.token;
    const line = token ? token.startLine : (error.previousToken ? error.previousToken.startLine : undefined);
    const lineSuffix = line !== undefined ? ` at line ${line}` : "";

    // Simplify "Expecting one of these possible Token sequences"
    if (msg.includes("Expecting: one of these possible Token sequences")) {
        let foundPart = "";
        if (token && token.image) {
            foundPart = ` (found '${token.image}')`;
        }
        return `Unexpected input or incomplete statement${lineSuffix}${foundPart}.`;
    }

    // Simplify "Expecting token of type --> X <-- but found --> Y <--"
    const match = msg.match(/Expecting token of type --> (.*?) <-- but found --> (.*?) <--/);
    if (match) {
        return `Expected ${match[1]} but found '${match[2]}'${lineSuffix}.`;
    }

    return msg + lineSuffix;
}

export function parsePlantUml(text: string): IRDiagram {
    // 0. Pre-process (unescape HTML from potential scrapes)
    const processedText = unescapeHtml(text);

    // 1. Lexing
    const lexingResult = SequenceLexer.tokenize(processedText);

    if (lexingResult.errors.length > 0) {
        throw new Error(`Lexing errors:\n${lexingResult.errors.map(e => e.message).join("\n")}`);
    }

    // 2. Parsing
    parser.input = lexingResult.tokens;
    const cst = parser.diagram();

    if (parser.errors.length > 0) {
        console.log("RAW ERRORS:", parser.errors.map(e => e.message));
        const simplifiedErrors = parser.errors.map(formatParserError);
        throw new Error(`Parsing errors:\n${simplifiedErrors.join("\n")}`);
    }

    // 3. Visiting to create AST
    const ast = visitor.visit(cst);

    // Auto-detect diagram type based on elements
    let diagramType: 'sequence' | 'class' | 'deployment' | 'unknown' = 'unknown';
    
    const deploymentKeywords = [
        'database', 'queue', 'stack', 'cloud', 'artifact', 'storage', 
        'rectangle', 'card', 'file', 'hexagon', 'person', 'process', 
        'agent', 'label', 'usecase', 'component', 'action', 'map', 'state',
        'frame', 'rect', 'node', 'collections', 'boundary', 'control', 'entity'
    ];

    const checkType = (statements: IRStatement[]) => {
        for (const statement of statements) {
            if (!statement) continue;
            
            if (statement.type === 'node') {
                const node = statement as IRNode;
                if (deploymentKeywords.includes(node.shape)) {
                    diagramType = 'deployment';
                } else if (node.shape === 'class' || node.shape === 'interface') {
                    if (diagramType === 'unknown') diagramType = 'class';
                } else if (node.shape === 'participant' || node.shape === 'actor') {
                    diagramType = 'sequence';
                }
            } else if (statement.type === 'container') {
                const container = statement as IRContainer;
                if (deploymentKeywords.includes(container.keyword)) {
                    diagramType = 'deployment';
                } else if (container.keyword === 'class' || container.keyword === 'interface') {
                    if (diagramType === 'unknown') diagramType = 'class';
                }
                checkType(container.statements);
            } else if (statement.type === 'edge') {
                const edge = statement as IREdge;
                const arrow = edge.arrow;
                
                const isClassSpecific = arrow.includes('<|') || arrow.includes('|>') || 
                                     arrow.includes('*--') || arrow.includes('--*') || 
                                     arrow.includes('o--') || arrow.includes('--o') ||
                                     arrow.includes('+--') || arrow.includes('--+') ||
                                     arrow.includes('#--') || arrow.includes('--#');
                
                const isSequenceSpecific = arrow.includes('//') || arrow.includes('\\\\') || 
                                         arrow.includes('->>') || arrow.includes('<<-') ||
                                         arrow.includes('->x') || arrow.includes('x<-') ||
                                         arrow.includes('->?') || arrow.includes('?<-') ||
                                         arrow.includes('[->') || arrow.includes('<-]');

                if (isClassSpecific) {
                    diagramType = 'class';
                } else if (isSequenceSpecific) {
                    diagramType = 'sequence';
                } else if (arrow.includes('>') || arrow.includes('<')) {
                    // Generic arrows like -> or <--
                    if (diagramType === 'unknown') {
                        // Default to sequence for ambiguous arrows like -> or <--
                        diagramType = 'sequence';
                    }
                } else if (arrow === '--' || arrow === '..' || arrow.includes('|')) {
                    if (diagramType === 'unknown') diagramType = 'class';
                }
            } else if (['activation', 'group', 'return', 'autoactivate'].includes(statement.type)) {
                diagramType = 'sequence';
            }
        }
    };

    checkType(ast.statements);
    ast.diagramType = diagramType;

    return ast;
}
