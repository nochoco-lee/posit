export type DiagramType = 'sequence' | 'class' | 'deployment' | 'unknown';

export class PlantUmlScanner {
    public scan(text: string): DiagramType {
        const lowerText = text.toLowerCase();
        
        // 1. Check for explicit type markers in @startuml
        const startMatch = lowerText.match(/@startuml[ \t]+([a-z]+)/);
        if (startMatch) {
            const type = startMatch[1];
            if (type === 'sequence') return 'sequence';
            if (type === 'class') return 'class';
            if (['deployment', 'component', 'usecase', 'object', 'state', 'salt'].includes(type)) return 'deployment';
        }

        // 2. Scoring logic based on keywords and syntax patterns
        let scores = {
            sequence: 0,
            class: 0,
            deployment: 0
        };

        // Sequence indicators
        if (/\b(?:participant|actor|boundary|control|entity|database|collections|queue|autonumber|newpage|box|activate|deactivate|destroy|return)\b/i.test(text)) scores.sequence += 50;
        if (/\b(?:alt|opt|loop|par|break|critical|group)\b/i.test(text)) scores.sequence += 40;
        if (/->>|<<-|->x|x<-|->\?|\?<-|\[->|<-]|->\+|-->-|->\*|!->/.test(text)) scores.sequence += 60;
        if (/->|<-|-->>|<<--/.test(text)) scores.sequence += 20; // Common arrows
        if (/\balice\b|\bbob\b/i.test(text)) scores.sequence += 10; // Common sequence names

        // Class indicators
        if (/\b(?:class|interface|enum|struct|annotation|abstract|extends|implements)\b/i.test(text)) scores.class += 50;
        if (/<\||\|>|\*--|--\*|o--|--o|\+--|--\+|#--|--#/.test(text)) scores.class += 60;
        if (/[{}]/.test(text) && /\b(?:class|interface|enum)\b/i.test(text)) scores.class += 40;

        // Deployment indicators
        if (/\b(?:artifact|cloud|component|node|storage|rectangle|card|file|hexagon|person|process|agent|label|usecase|action|frame|rect|package|namespace|folder)\b/i.test(text)) scores.deployment += 50;
        if (/\b(?:database|collections|queue|stack)\b/i.test(text)) scores.deployment += 30;
        if (/-up-|-down-|-left-|-right-/.test(text)) scores.deployment += 40;
        if (/\[/.test(text) && /]/.test(text) && !scores.sequence) scores.deployment += 20; // [Component] style

        // Tie-breakers and special cases
        if (lowerText.includes('allow_mixing') || lowerText.includes('allowmixing')) {
            scores.class += 10;
        }

        // Final decision
        if (scores.sequence > scores.class && scores.sequence > scores.deployment) return 'sequence';
        if (scores.class > scores.sequence && scores.class > scores.deployment) return 'class';
        if (scores.deployment > scores.sequence && scores.deployment > scores.class) return 'deployment';
        
        // If tied or all zero, look for any hint
        if (scores.sequence > 0) return 'sequence';
        if (scores.class > 0) return 'class';
        if (scores.deployment > 0) return 'deployment';

        // If @startuml is present but nothing else, assume sequence to allow parser to handle errors
        if (lowerText.includes('@startuml')) return 'sequence';

        return 'unknown';
    }
}
