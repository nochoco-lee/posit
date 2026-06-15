
/**
 * Utility for measuring text dimensions.
 * In a browser environment, it uses a canvas to get accurate measurements.
 * In a Node.js environment, it utilizes the 'canvas' npm package.
 */

let canvas: any = null;

function getContext(fontSize: number, fontFamily: string) {
    if (!canvas) {
        if (typeof document !== 'undefined') {
            canvas = document.createElement('canvas');
        } else {
            try {
                // Using require for Node.js environments to load the 'canvas' package
                const { createCanvas } = require('canvas');
                canvas = createCanvas(200, 200);
            } catch (e) {
                // If the canvas package is not available, we'll return null and use fallbacks
                return null;
            }
        }
    }
    const context = canvas.getContext('2d');
    if (context) {
        context.font = `${fontSize}px ${fontFamily}`;
    }
    return context;
}

export function measureText(
    text: string, 
    fontSize: number = 14, 
    fontFamily: string = 'sans-serif'
): { width: number, height: number } {
    const context = getContext(fontSize, fontFamily);
    
    if (!context) {
        // Fallback for environments where canvas is unavailable
        const lines = text.split('\n');
        const maxChars = Math.max(...lines.map(line => line.length));
        return {
            width: maxChars * fontSize * 0.7, // Slightly more conservative fallback
            height: lines.length * fontSize * 1.2
        };
    }

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
    const context = getContext(fontSize, fontFamily);
    
    if (!context) {
        // Simple fallback wrap (no-op)
        return text; 
    }

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
