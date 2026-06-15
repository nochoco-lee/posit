export enum Language {
    PlantUML = 'plantuml',
    Mermaid = 'mermaid',
    Unknown = 'unknown'
}

export function detectLanguage(text: string): Language {
    if (!text || typeof text !== 'string') return Language.Unknown;

    if (/^\s*@startuml/m.test(text)) {
        return Language.PlantUML;
    }

    if (/^\s*(sequenceDiagram|classDiagram)/m.test(text)) {
        return Language.Mermaid;
    }

    return Language.Unknown;
}
