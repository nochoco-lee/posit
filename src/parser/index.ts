import { SequenceLexer } from "./lexer";
import { parser } from "./parser";
import { visitor } from "./visitor";
import { IRDiagram, IRStatement, IRNode, IRContainer, IREdge } from "../ir/types";

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
    const lexResult = SequenceLexer.tokenize(unescapedText);
    
    if (lexResult.errors.length > 0) {
        // console.error("RAW ERRORS:", lexResult.errors.map(e => e.message));
    }

    parser.input = lexResult.tokens;
    const cst = (parser as any).diagram();

    if (parser.errors.length > 0) {
        throw new Error("Parsing errors: " + parser.errors.map(e => e.message).join(", "));
    }

    const ast = visitor.visit(cst);
    if (!ast) {
        throw new Error("Parsing errors: Visitor returned null ast");
    }
    ast.syntax = 'plantuml';

    // Auto-detect diagram type based on elements
    let diagramType: 'sequence' | 'class' | 'deployment' | 'unknown' = 'unknown';
    
    const sequenceOnlyKeywords = [
        'participant', 'autonumber', 'newpage', 'box', 'alt', 'opt', 'loop', 
        'par', 'break', 'critical', 'group', 'activate', 'deactivate', 'destroy', 'return'
    ];
    
    const sharedKeywords = [
        'actor', 'boundary', 'control', 'entity', 'database', 'collections', 'queue', 'stack', 'together'
    ];
    
    const classKeywords = [
        'class', 'interface', 'enum', 'struct', 'annotation', 'abstract',
        'object', 'circle', 'diamond', 'exception', 'metaclass', 'protocol', 
        'record', 'stereotype', 'dataclass'
    ];
    
    const deploymentKeywords = [
        'artifact', 'cloud', 'component', 'node', 'storage', 
        'rectangle', 'card', 'file', 'hexagon', 'person', 'process', 
        'agent', 'label', 'usecase', 'action', 'map', 'state',
        'frame', 'rect', 'package', 'namespace', 'folder', 'json'
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
                if (sequenceOnlyKeywords.includes(node.shape)) {
                    scores.sequence += 50;
                } else if (sharedKeywords.includes(node.shape)) {
                    scores.sequence += 20;
                    scores.deployment += 10;
                } else if (classKeywords.includes(node.shape)) {
                    scores.class += 50;
                } else if (deploymentKeywords.includes(node.shape)) {
                    scores.deployment += 50;
                }
                
                if (node.members && node.members.length > 0) {
                    scores.class += 40;
                }
                if (node.parents && node.parents.length > 0) {
                    scores.class += 40;
                }
                if (node.isCreation) {
                    scores.sequence += 50;
                }
                if (node.name.includes('()')) {
                    scores.sequence += 20;
                }
            } else if (statement.type === 'container') {
                const container = statement as IRContainer;
                if (sequenceOnlyKeywords.includes(container.keyword)) {
                    scores.sequence += 50;
                } else if (sharedKeywords.includes(container.keyword)) {
                    scores.sequence += 20;
                    scores.deployment += 10;
                } else if (classKeywords.includes(container.keyword)) {
                    scores.class += 50;
                } else if (deploymentKeywords.includes(container.keyword)) {
                    scores.deployment += 50;
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
                
                const hasDirection = arrow.includes('-up-') || arrow.includes('-down-') || 
                                   arrow.includes('-left-') || arrow.includes('-right-') ||
                                   arrow.match(/-[udlr]-/);
                
                const hasBracketStyle = arrow.includes('[') && arrow.includes(']');
                const hasColor = arrow.includes('#');

                if (isClassSpecific) {
                    scores.class += 50;
                } 
                
                if (isSequenceSpecific) {
                    scores.sequence += 50;
                } 

                if (hasDirection) {
                    if (scores.deployment > scores.class) scores.deployment += 40;
                    else scores.class += 40;
                } else if (hasBracketStyle) {
                    if (hasColor) {
                        scores.sequence += 25;
                    } else {
                        if (scores.deployment > scores.class) scores.deployment += 40;
                        else scores.class += 40;
                    }
                } else if (arrow.includes('>') || arrow.includes('<')) {
                    if (edge.label) {
                        // Very strong sequence indicator if it looks like a message
                        scores.sequence += 40;

                        // But also could be deployment if we already have deployment shapes
                        if (scores.deployment > 0) scores.deployment += 40;
                        if (scores.class > 0) scores.class += 20;
                    }
                    else {
                        if (scores.class > 0 || scores.deployment > 0) {
                            if (scores.deployment > scores.class) scores.deployment += 20;
                            else scores.class += 20;
                        } else {
                            scores.sequence += 10;
                        }
                    }
                }
 else if (arrow === '--' || arrow === '..' || arrow.includes('|')) {
                    if (edge.label) {
                        if (scores.deployment > 0) scores.deployment += 30;
                        else scores.class += 30;
                    }
                    else {
                        if (scores.deployment > 0) scores.deployment += 20;
                        else scores.class += 20;
                    }
                }

                if (edge.fromLabel || edge.toLabel) {
                    scores.class += 50;
                }
                if (edge.isCreation || edge.isDeletion) {
                    scores.sequence += 50;
                }
            } else if (['activation', 'return', 'autoactivate', 'autonumber', 'divider', 'delay', 'ref'].includes(statement.type)) {
                scores.sequence += 50;
            } else if (statement.type === 'group') {
                const group = statement as any;
                if (['alt', 'opt', 'loop', 'par', 'group', 'box'].includes(group.keyword)) {
                    scores.sequence += 50;
                }
            } else if (statement.type === 'note') {
                const note = statement as any;
                if (note.placement === 'over' || note.placement === 'across' || 
                    note.placement === 'left of' || note.placement === 'right of') {
                    scores.sequence += 30;
                } else if (note.placement === 'on link') {
                    scores.class += 40;
                    scores.deployment += 30;
                } else {
                    if (scores.class > 0) scores.class += 20;
                    else if (scores.deployment > 0) scores.deployment += 20;
                    else scores.sequence += 10;
                }
            }
        }
    };

    checkType(ast.statements);
    
    // Check for sequence specific top-level markers
    const lowerText = unescapedText.toLowerCase();
    
    // Explicit type markers
    const startMatch = lowerText.match(/@startuml[ \t]+([a-z]+)/);
    if (startMatch) {
        const type = startMatch[1];
        if (type === 'sequence') scores.sequence += 100;
        else if (type === 'class') scores.class += 100;
        else if (type === 'deployment' || type === 'component' || type === 'usecase') scores.deployment += 100;
    }

    if (lowerText.includes('allow_mixing') || lowerText.includes('allowmixing')) {
        scores.class += 50;
        scores.deployment += 50;
    }

    if (lowerText.includes('header') || lowerText.includes('footer') || lowerText.includes('title')) {
        if (scores.sequence > 0 || (scores.class === 0 && scores.deployment === 0)) {
            scores.sequence += 10;
        }
    }
    if (lowerText.includes('skinparam') || lowerText.includes('left to right direction')) {
        if (scores.class > 0) scores.class += 20;
        if (scores.deployment > 0) scores.deployment += 20;
    }

    // Final decision based on scores
    if (scores.deployment >= scores.sequence && scores.deployment >= scores.class && scores.deployment > 0) {
        diagramType = 'deployment';
    } else if (scores.class >= scores.sequence && scores.class > 0) {
        diagramType = 'class';
    } else if (scores.sequence > 0) {
        diagramType = 'sequence';
    }

    ast.diagramType = diagramType;

    return ast;
}
