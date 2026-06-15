import { describe, it } from 'vitest';
import { SequenceLexer } from '../src/parser/lexer';
import { parser } from '../src/parser/parser';
import { visitor } from '../src/parser/visitor';

describe('Parser Debug', () => {
    it('should parse diagram_34 correctly', () => {
        const text = `@startuml
node node1
artifact artifact1
node1 -- artifact1
@enduml`;
        const lexResult = SequenceLexer.tokenize(text);
        parser.input = lexResult.tokens;
        const cst = parser.diagram();
        if (parser.errors.length > 0) {
            console.error("Parser Errors:", JSON.stringify(parser.errors.map(e => e.message), null, 2));
        } else {
            const ast = visitor.visit(cst);
            console.log("AST:", JSON.stringify(ast, null, 2));
        }
    });
});
