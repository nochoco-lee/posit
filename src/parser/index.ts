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

    // Auto-detect diagram type based on elements
    let diagramType: 'sequence' | 'class' | 'deployment' | 'unknown' = 'unknown';
    
    const sequenceOnlyKeywords = [
        'participant', 'actor', 'boundary', 'control', 'entity',
        'autonumber', 'newpage', 'box', 'alt', 'opt', 'loop', 'par', 'break', 'critical', 'group'
    ];
    
    const sharedKeywords = [
        'database', 'collections', 'queue', 'stack'
    ];
    
    const classKeywords = [
        'class', 'interface', 'enum', 'struct', 'annotation', 'abstract'
    ];
    
    const deploymentKeywords = [
        'artifact', 'cloud', 'component', 'node', 'storage', 
        'rectangle', 'card', 'file', 'hexagon', 'person', 'process', 
        'agent', 'label', 'usecase', 'action', 'map', 'state',
        'frame', 'rect', 'package', 'namespace', 'folder'
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
                    scores.sequence += 30;
                } else if (sharedKeywords.includes(node.shape)) {
                    scores.sequence += 10;
                    scores.deployment += 5;
                } else if (classKeywords.includes(node.shape)) {
                    scores.class += 30;
                } else if (deploymentKeywords.includes(node.shape)) {
                    scores.deployment += 30;
                }
                
                if (node.members && node.members.length > 0) {
                    scores.class += 40;
                }
                if (node.parents && node.parents.length > 0) {
                    scores.class += 40;
                }
                if (node.isCreation) {
                    scores.sequence += 30;
                }
                if (node.name.includes('()')) {
                    scores.sequence += 10;
                }
            } else if (statement.type === 'container') {
                const container = statement as IRContainer;
                if (sequenceOnlyKeywords.includes(container.keyword)) {
                    scores.sequence += 30;
                } else if (sharedKeywords.includes(container.keyword)) {
                    scores.sequence += 10;
                    scores.deployment += 5;
                } else if (classKeywords.includes(container.keyword)) {
                    scores.class += 30;
                } else if (deploymentKeywords.includes(container.keyword)) {
                    scores.deployment += 30;
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
                    scores.class += 30;
                } else if (isSequenceSpecific) {
                    scores.sequence += 30;
                } else if (hasDirection) {
                    if (scores.deployment > scores.class) scores.deployment += 40;
                    else scores.class += 40;
                } else if (hasBracketStyle) {
                    if (hasColor) {
                        scores.sequence += 15;
                    } else {
                        if (scores.deployment > scores.class) scores.deployment += 40;
                        else scores.class += 40;
                    }
                } else if (arrow.includes('>') || arrow.includes('<')) {
                    if (edge.label) {
                        // Very strong sequence indicator if it looks like a message
                        scores.sequence += 40;

                        // But also could be deployment if we already have deployment shapes
                        if (scores.deployment > 0) scores.deployment += 20;
                        if (scores.class > 0) scores.class += 10;
                    }
                    else {
                        if (scores.class > 0 || scores.deployment > 0) {
                            if (scores.deployment > scores.class) scores.deployment += 10;
                            else scores.class += 10;
                        } else {
                            scores.sequence += 5;
                        }
                    }
                }
 else if (arrow === '--' || arrow === '..' || arrow.includes('|')) {
                    if (edge.label) {
                        if (scores.deployment > 0) scores.deployment += 25;
                        else scores.class += 20;
                    }
                    else {
                        if (scores.deployment > 0) scores.deployment += 15;
                        else scores.class += 15;
                    }
                }

                if (edge.fromLabel || edge.toLabel) {
                    scores.class += 40;
                }
                if (edge.isCreation || edge.isDeletion) {
                    scores.sequence += 40;
                }
            } else if (['activation', 'return', 'autoactivate', 'autonumber', 'divider', 'delay', 'ref'].includes(statement.type)) {
                scores.sequence += 30;
            } else if (statement.type === 'group') {
                const group = statement as any;
                if (['alt', 'opt', 'loop', 'par', 'group', 'box'].includes(group.keyword)) {
                    scores.sequence += 30;
                }
            } else if (statement.type === 'note') {
                const note = statement as any;
                if (note.placement === 'over' || note.placement === 'across' || 
                    note.placement === 'left of' || note.placement === 'right of') {
                    scores.sequence += 25;
                } else if (note.placement === 'on link') {
                    scores.class += 30;
                    scores.deployment += 20;
                } else {
                    if (scores.class > 0) scores.class += 10;
                    else if (scores.deployment > 0) scores.deployment += 10;
                    else scores.sequence += 5;
                }
            }
        }
    };

    checkType(ast.statements);
    
    // Check for sequence specific top-level markers
    const lowerText = unescapedText.toLowerCase();
    if (lowerText.includes('header') || lowerText.includes('footer') || lowerText.includes('title')) {
        if (scores.sequence > 0 || (scores.class === 0 && scores.deployment === 0)) {
            scores.sequence += 10;
        }
    }
    if (lowerText.includes('skinparam') || lowerText.includes('left to right direction')) {
        if (scores.class > 0) scores.class += 10;
        if (scores.deployment > 0) scores.deployment += 10;
    }

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
