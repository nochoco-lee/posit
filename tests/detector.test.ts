import { describe, it, expect } from 'vitest';
import { detectLanguage, Language } from '../src/detector';

describe('detectLanguage', () => {
    it('should detect PlantUML', () => {
        const text = `@startuml\nactor User\n@enduml`;
        expect(detectLanguage(text)).toBe(Language.PlantUML);
    });

    it('should detect PlantUML with leading whitespace', () => {
        const text = `  @startuml\nactor User\n@enduml`;
        expect(detectLanguage(text)).toBe(Language.PlantUML);
    });

    it('should detect Mermaid sequence diagram', () => {
        const text = `sequenceDiagram\nparticipant A\nA->>B: Hello`;
        expect(detectLanguage(text)).toBe(Language.Mermaid);
    });

    it('should detect Mermaid class diagram', () => {
        const text = `   classDiagram\nclass BankAccount`;
        expect(detectLanguage(text)).toBe(Language.Mermaid);
    });

    it('should return Unknown for empty text', () => {
        expect(detectLanguage('')).toBe(Language.Unknown);
    });

    it('should return Unknown for unrecognized syntax', () => {
        const text = `digraph G {\n A -> B\n}`;
        expect(detectLanguage(text)).toBe(Language.Unknown);
    });
});
