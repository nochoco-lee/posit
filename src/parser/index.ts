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
    
    const sequenceKeywords = [
        'participant', 'actor', 'boundary', 'control', 'entity'
    ];
    
    const classKeywords = [
        'class', 'interface', 'enum', 'struct', 'annotation', 'abstract'
    ];
    
    const deploymentKeywords = [
        'artifact', 'cloud', 'component', 'node', 'storage', 
        'rectangle', 'card', 'file', 'hexagon', 'person', 'process', 
        'agent', 'label', 'usecase', 'action', 'map', 'state',
        'frame', 'rect', 'package', 'namespace', 'folder',
        'database', 'collections', 'queue', 'stack'
    ];

    let scores = {
        sequence: 0,
        class: 0,
        deployment: 0
    };

    const checkType = (statements: IRStatement[]) => {
        for (const statement of statements) {
            if (!statement) continue;
            
            if (statement.type === 'node') {
                const node = statement as IRNode;
                if (sequenceKeywords.includes(node.shape)) {
                    scores.sequence += 5;
                } else if (classKeywords.includes(node.shape)) {
                    scores.class += 5;
                } else if (deploymentKeywords.includes(node.shape)) {
                    scores.deployment += 5;
                }
                
                if (node.members && node.members.length > 0) {
                    scores.class += 20;
                }
                if (node.parents && node.parents.length > 0) {
                    scores.class += 20;
                }
                if (node.isCreation) {
                    scores.sequence += 20;
                }
            } else if (statement.type === 'container') {
                const container = statement as IRContainer;
                if (sequenceKeywords.includes(container.keyword)) {
                    scores.sequence += 5;
                } else if (classKeywords.includes(container.keyword)) {
                    scores.class += 5;
                } else if (deploymentKeywords.includes(container.keyword)) {
                    scores.deployment += 5;
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
                                         arrow.includes('[->') || arrow.includes('<-]') ||
                                         arrow.includes('->+') || arrow.includes('-->-') ||
                                         arrow.includes('->*') || arrow.includes('!->');

                if (isClassSpecific) {
                    scores.class += 20;
                } else if (isSequenceSpecific) {
                    scores.sequence += 20;
                } else if (arrow.includes('>') || arrow.includes('<')) {
                    // Generic arrows
                    if (edge.label) scores.sequence += 5; 
                    else scores.sequence += 2;
                } else if (arrow === '--' || arrow === '..' || arrow.includes('|')) {
                    if (edge.label) scores.deployment += 5;
                    else scores.class += 2;
                }

                if (edge.fromLabel || edge.toLabel) {
                    scores.class += 20;
                }
                if (edge.isCreation || edge.isDeletion) {
                    scores.sequence += 20;
                }
            } else if (['activation', 'return', 'autoactivate', 'autonumber', 'divider', 'delay', 'ref'].includes(statement.type)) {
                scores.sequence += 15;
            } else if (statement.type === 'group') {
                const group = statement as any;
                if (['alt', 'opt', 'loop', 'par', 'group', 'box'].includes(group.keyword)) {
                    scores.sequence += 10;
                }
            } else if (statement.type === 'note') {
                const note = statement as any;
                if (note.placement === 'over' || note.placement === 'across' || 
                    note.placement === 'left of' || note.placement === 'right of') {
                    scores.sequence += 10;
                }
            }
        }
    };

    checkType(ast.statements);
    
    // Final decision based on scores
    if (scores.sequence >= scores.class && scores.sequence >= scores.deployment && scores.sequence > 0) {
        diagramType = 'sequence';
    } else if (scores.class >= scores.deployment && scores.class > 0) {
        diagramType = 'class';
    } else if (scores.deployment > 0) {
        diagramType = 'deployment';
    }

    ast.diagramType = diagramType;

    return ast;
}
