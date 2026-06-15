export type DiagramType = 'sequence' | 'class' | 'deployment' | 'unknown';

export class PlantUmlScanner {
    public scan(text: string): DiagramType {
        const scores = { sequence: 0, class: 0, deployment: 0 };
        const lines = text.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("'") || trimmed.startsWith("@")) continue;
            
            // 1. Strong Connection Patterns (+300)
            // Sequence: A -> B : label
            if (/\w+\s*[-=.]+>\s*\w+\s*:[^:]/.test(trimmed)) scores.sequence += 300;
            if (/->>|<<-|->x|x<-|->\?|\?<-|\[->|<-]|->\+|-->-|->\*|!->|--\+\+|--\*/.test(trimmed)) scores.sequence += 300;
            if (/\b(?:autoactivate|autonumber|return)\b/i.test(trimmed)) scores.sequence += 300;

            // Class: A <|-- B or A *-- B
            if (/<\||\|>|\*--|--\*|o--|--o|\+--|--\+|#--|--#|--\+/.test(trimmed)) scores.class += 300;
            if (/\b(?:class|interface|enum|struct|annotation|abstract|dataclass|protocol|exception)\s+[\w"()]+\s*\{/i.test(trimmed)) scores.class += 300;
            if (/-+(?:up|down|left|right|hidden|horizontal|vertical|[lrud])-*>/i.test(trimmed)) scores.class += 300;

            // Deployment: [comp] -> [other]
            if (/\[.+\]\s*[-=.~]+\s*\[.+\]/.test(trimmed)) scores.deployment += 300;
            if (/\[.+\]\s*[-=.~]+>\s*\[.+\]/.test(trimmed)) scores.deployment += 300;
            if (/\b(?:node|artifact|cloud|component|storage|rectangle|card|file|hexagon|person|process|agent|usecase|action|frame|rect|folder|together)\s+[\w"()]+\s*\{/i.test(trimmed)) scores.deployment += 300;
            if (/\b(?:node|artifact|cloud|component|storage|rectangle|card|file|hexagon|person|process|agent|usecase|action|frame|rect|folder|together)\s+[\w"()]+\s+as\b/i.test(trimmed)) scores.deployment += 300;

            // 2. Medium Keywords (+100)
            if (/\b(?:participant|actor|boundary|control|entity|database|collections|queue)\b/i.test(trimmed)) scores.sequence += 100;
            if (/\b(?:class|interface|enum|struct|annotation|abstract|metaclass|protocol|record|stereotype)\b/i.test(trimmed)) scores.class += 100;
            if (/\b(?:artifact|cloud|component|storage|rectangle|node|stack)\b/i.test(trimmed)) scores.deployment += 100;

            // 3. Weak Indicators (+20)
            if (/\w+\s*[-=.]+>\s*\w+/.test(trimmed)) {
                // If we see a basic arrow, it's likely sequence if we haven't seen class/deployment indicators yet
                if (scores.class === 0 && scores.deployment === 0) scores.sequence += 50;
                else scores.sequence += 20;
            }
        }

        const max = Math.max(scores.sequence, scores.class, scores.deployment);
        if (max === 0) {
            if (text.includes('@startuml')) return 'sequence'; // Fallback
            return 'unknown';
        }
        
        // Tie-breaking: Sequence > Class > Deployment
        if (scores.sequence >= max) return 'sequence';
        if (scores.class >= max) return 'class';
        return 'deployment';
    }
}
