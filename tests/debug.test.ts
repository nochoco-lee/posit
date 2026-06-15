import { describe, it } from 'vitest';
import { ClassLexer } from '../src/parser/class/lexer';

describe('Parser Debug', () => {
    it('should parse diagram_34 correctly', () => {
        const text = `@startuml
package "My Package" {
  class ClassA {
    +field1
  }
}
@enduml`;
        const lexResult = ClassLexer.tokenize(text);
        console.log("TOKENS:", lexResult.tokens.map(t => `${t.tokenType.name}: ${t.image}`));
        if (lexResult.errors.length > 0) {
            console.error("Lexing errors:", lexResult.errors);
        }
    });
});
