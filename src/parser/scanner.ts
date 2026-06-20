export type DiagramType = 'sequence' | 'class' | 'deployment' | 'unknown';

export class PlantUmlScanner {
    public scan(text: string): DiagramType {
        const scores = { sequence: 0, class: 0, deployment: 0 };
        const lines = text.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith("'") || trimmed.startsWith("@")) continue;
            
            // 1. Strong Connection Patterns (+300)
            // Sequence ONLY: ->>, <<-, ->x, etc.
            if (/->>|<<-|->x|x<-|->\?|\?<-|\[->|<-]|->\+|-->-|->\*|!->|--\+\+|--\*/.test(trimmed)) scores.sequence += 300;
            if (/\b(?:autoactivate|autonumber|return)\b/i.test(trimmed)) scores.sequence += 300;

            // Class ONLY: <|--, *--, o--, etc.
            if (/<\||\|>|\*--|--\*|o--|--o|\+--|--\+|#--|--#|--\+/.test(trimmed)) scores.class += 300;
            if (/\b(?:class|interface|enum|struct|annotation|abstract|dataclass|protocol|exception|object)\s+[\w"()]+\s*\{/i.test(trimmed)) scores.class += 300;
            if (/-+(?:up|down|left|right|hidden|horizontal|vertical|[lrud])-*>/i.test(trimmed)) scores.class += 300;

            // Deployment ONLY: [comp]
            if (/\[.+\]\s*[-=.~]+\s*\[.+\]/.test(trimmed)) scores.deployment += 300;
            if (/\[.+\]\s*[-=.~]+>\s*\[.+\]/.test(trimmed)) scores.deployment += 300;
            if (/\b(?:node|artifact|cloud|component|storage|rectangle|card|file|hexagon|person|process|agent|usecase|action|frame|rect|folder|together|database|stack)\s+[\w"()]+\s*\{/i.test(trimmed)) scores.deployment += 300;
            if (/^\s*(?:node|artifact|cloud|component|storage|rectangle|card|file|hexagon|person|process|agent|usecase|action|frame|rect|folder|together|database|stack)\s+[\w"()\[\]]/i.test(trimmed)) scores.deployment += 300;
            if (/^\s*\[[^\]]+\]\s*$/.test(trimmed)) scores.deployment += 150;
            if (/^\s*\([^)]+\)\s*$/.test(trimmed)) scores.deployment += 150;

            // 2. Ambiguous but characteristic patterns
            // A -> B : label (Common in Sequence and Class)
            if (/\w+\s*[-=.]+>\s*\w+\s*:[^:]/.test(trimmed)) {
                // Check for other indicators to decide
                if (scores.class > scores.sequence) scores.class += 200;
                else if (scores.sequence > scores.class) scores.sequence += 200;
                else if (scores.deployment > scores.sequence) scores.deployment += 200;
                else {
                     // Truly ambiguous, give sequence a slight edge for simple arrows
                     scores.sequence += 150;
                     scores.class += 100;
                }
            }

            // 3. Medium Keywords (+100)
            if (/\b(?:participant|actor|boundary|control|entity|collections|queue)\b/i.test(trimmed)) scores.sequence += 150;
            if (/\b(?:class|interface|enum|struct|annotation|abstract|metaclass|protocol|record|stereotype|object)\b/i.test(trimmed)) scores.class += 150;
            if (/\b(?:artifact|cloud|component|storage|rectangle|node|stack|frame|folder|database)\b/i.test(trimmed)) scores.deployment += 150;

            // 4. Weak Indicators (+20)
            if (/\w+\s*[-=.]+>\s*\w+/.test(trimmed)) {
                scores.sequence += 20;
                scores.class += 20;
            }
        }

        const max = Math.max(scores.sequence, scores.class, scores.deployment);
        if (max === 0) {
            if (text.includes('@startuml')) return 'sequence'; // Fallback
            return 'unknown';
        }
        
        // Tie-breaking: Sequence > Class > Deployment (Sequence is the most common)
        if (scores.sequence >= max && scores.sequence > 0) return 'sequence';
        if (scores.class >= max && scores.class > 0) return 'class';
        if (scores.deployment >= max && scores.deployment > 0) return 'deployment';
        
        return 'unknown';
    }
}
