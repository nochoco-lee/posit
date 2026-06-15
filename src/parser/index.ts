import { SequenceLexer } from "./lexer";
import { parser } from "./parser";
import { visitor } from "./visitor";
import { IRDiagram, IRStatement, IRNode, IRContainer } from "../ir/types";

export function parsePlantUml(text: string): IRDiagram {
    // 1. Lexing
    const lexingResult = SequenceLexer.tokenize(text);

    if (lexingResult.errors.length > 0) {
        throw new Error(`Lexing errors:\n${lexingResult.errors.map(e => e.message).join("\n")}`);
    }

    // 2. Parsing
    parser.input = lexingResult.tokens;
    const cst = parser.diagram();

    if (parser.errors.length > 0) {
        throw new Error(`Parsing errors:\n${parser.errors.map(e => e.message).join("\n")}`);
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
                    if (diagramType === 'unknown' || diagramType === 'sequence') {
                         diagramType = 'deployment';
                    }
                } else if (node.shape === 'class' || node.shape === 'interface') {
                    if (diagramType === 'unknown') diagramType = 'class';
                } else if (node.shape === 'participant' || node.shape === 'actor') {
                    if (diagramType === 'unknown' || diagramType === 'class') diagramType = 'sequence';
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
                if (edge.arrow.includes('>') || edge.arrow.includes('<') || edge.arrow.includes('\\\\') || edge.arrow.includes('/')) {
                    diagramType = 'sequence'; // Definite sequence arrow
                } else if (edge.arrow === '--' || edge.arrow === '..' || edge.arrow.includes('|')) {
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
