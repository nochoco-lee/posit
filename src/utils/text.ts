
/**
 * Utility for measuring text dimensions.
 * In a browser environment, it uses a canvas to get accurate measurements.
 * In a Node.js environment without a global document, it falls back to estimates.
 */

let canvas: any = null;

export function measureText(
    text: string, 
    fontSize: number = 14, 
    fontFamily: string = 'sans-serif'
): { width: number, height: number } {
    if (typeof document === 'undefined') {
        // Fallback for Node.js environments (like some Vitest runs)
        const lines = text.split('\n');
        const maxChars = Math.max(...lines.map(line => line.length));
        // Rough estimate: average character width is ~0.6 of font size
        return {
            width: maxChars * fontSize * 0.6,
            height: lines.length * fontSize * 1.2
        };
    }

    if (!canvas) {
        canvas = document.createElement('canvas');
    }
    const context = canvas.getContext('2d');
    if (!context) {
        return { width: 100, height: 20 };
    }

    context.font = `${fontSize}px ${fontFamily}`;
    const lines = text.split('\n');
    let maxWidth = 0;
    
    for (const line of lines) {
        const metrics = context.measureText(line);
        maxWidth = Math.max(maxWidth, metrics.width);
    }

    return {
        width: maxWidth,
        height: lines.length * fontSize * 1.2
    };
}

export function wrapText(
    text: string,
    maxWidth: number,
    fontSize: number = 14,
    fontFamily: string = 'sans-serif'
): string {
    if (typeof document === 'undefined') {
        // Simple fallback wrap
        return text; 
    }

    if (!canvas) {
        canvas = document.createElement('canvas');
    }
    const context = canvas.getContext('2d');
    if (!context) return text;

    context.font = `${fontSize}px ${fontFamily}`;
    
    const words = text.split(' ');
    let lines: string[] = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
        const word = words[i];
        const width = context.measureText(currentLine + " " + word).width;
        if (width < maxWidth) {
            currentLine += " " + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    }
    lines.push(currentLine);
    return lines.join('\n');
}
