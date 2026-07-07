/**
 * Theme definitions and CSS-variable bridge for Posit Diagramming Engine.
 *
 * CSS variables are the source of truth. They are set on `document.documentElement`
 * and read back by `syncThemeFromCSS()` to populate the mutable `THEME` object
 * used by Konva canvas renderers.
 */

export interface ThemeVars {
    '--pos-stroke': string;
    '--pos-node-fill': string;
    '--pos-note-fill': string;
    '--pos-header-fill': string;
    '--pos-sequence-fill': string;
    '--pos-activation-fill': string;
    '--pos-box-fill': string;
    '--pos-text': string;
    '--pos-bg': string;
    '--pos-node-radius': string;
    '--pos-note-radius': string;
    '--pos-shadow': string;
    '--pos-stroke-width': string;
    '--pos-font-family': string;
    '--pos-font-size': string;
    '--pos-box-top': string;
    '--pos-box-side': string;
    '--pos-arrow-fill': string;
}

export const LIGHT_THEME: ThemeVars = {
    '--pos-stroke': '#4A5568',
    '--pos-node-fill': '#FFFFFF',
    '--pos-note-fill': '#FFFDE7',
    '--pos-header-fill': '#EDF2F7',
    '--pos-sequence-fill': '#EBF4FF',
    '--pos-activation-fill': '#EBF4FF',
    '--pos-box-fill': '#E2E8F0',
    '--pos-text': '#1A202C',
    '--pos-bg': '#F7FAFC',
    '--pos-node-radius': '6',
    '--pos-note-radius': '4',
    '--pos-shadow': '0 2px 8px rgba(0,0,0,0.08)',
    '--pos-stroke-width': '1.5',
    '--pos-font-family': "'Inter', 'Segoe UI', system-ui, sans-serif",
    '--pos-font-size': '14',
    '--pos-box-top': '#E8EDF4',
    '--pos-box-side': '#D4DBE8',
    '--pos-arrow-fill': '#4A5568',
};

export const DARK_THEME: ThemeVars = {
    '--pos-stroke': '#90CDF4',
    '--pos-node-fill': '#2D3748',
    '--pos-note-fill': '#3D4A5C',
    '--pos-header-fill': '#4A5568',
    '--pos-sequence-fill': '#2C5282',
    '--pos-activation-fill': '#2C5282',
    '--pos-box-fill': '#4A5568',
    '--pos-text': '#E2E8F0',
    '--pos-bg': '#1A202C',
    '--pos-node-radius': '6',
    '--pos-note-radius': '4',
    '--pos-shadow': '0 2px 8px rgba(0,0,0,0.3)',
    '--pos-stroke-width': '1.5',
    '--pos-font-family': "'Inter', 'Segoe UI', system-ui, sans-serif",
    '--pos-font-size': '14',
    '--pos-box-top': '#3D5170',
    '--pos-box-side': '#2C3E54',
    '--pos-arrow-fill': '#90CDF4',
};

export const PASTEL_THEME: ThemeVars = {
    '--pos-stroke': '#9F7AEA',
    '--pos-node-fill': '#FFFAF0',
    '--pos-note-fill': '#FEFCBF',
    '--pos-header-fill': '#F0EBF8',
    '--pos-sequence-fill': '#E9D8FD',
    '--pos-activation-fill': '#E9D8FD',
    '--pos-box-fill': '#E8E0F0',
    '--pos-text': '#4A5568',
    '--pos-bg': '#FFFAF0',
    '--pos-node-radius': '8',
    '--pos-note-radius': '6',
    '--pos-shadow': '0 2px 10px rgba(159,122,234,0.10)',
    '--pos-stroke-width': '1.5',
    '--pos-font-family': "'Inter', 'Segoe UI', system-ui, sans-serif",
    '--pos-font-size': '14',
    '--pos-box-top': '#DDD0F0',
    '--pos-box-side': '#D0C4E8',
    '--pos-arrow-fill': '#9F7AEA',
};

export const THEMES: Record<string, ThemeVars> = {
    light: LIGHT_THEME,
    dark: DARK_THEME,
    pastel: PASTEL_THEME,
};

/**
 * Apply a theme by setting CSS custom properties on `document.documentElement`.
 */
export function applyTheme(theme: ThemeVars) {
    for (const [key, value] of Object.entries(theme)) {
        document.documentElement.style.setProperty(key, value);
    }
}

/**
 * Read computed CSS variables back into a ThemeVars object.
 * Falls back to Light theme values if a variable is not set.
 */
export function readThemeFromCSS(): ThemeVars {
    const s = getComputedStyle(document.documentElement);
    const v = (name: string, fallback: string) =>
        s.getPropertyValue(name).trim() || fallback;
    return {
        '--pos-stroke': v('--pos-stroke', LIGHT_THEME['--pos-stroke']),
        '--pos-node-fill': v('--pos-node-fill', LIGHT_THEME['--pos-node-fill']),
        '--pos-note-fill': v('--pos-note-fill', LIGHT_THEME['--pos-note-fill']),
        '--pos-header-fill': v('--pos-header-fill', LIGHT_THEME['--pos-header-fill']),
        '--pos-sequence-fill': v('--pos-sequence-fill', LIGHT_THEME['--pos-sequence-fill']),
        '--pos-activation-fill': v('--pos-activation-fill', LIGHT_THEME['--pos-activation-fill']),
        '--pos-box-fill': v('--pos-box-fill', LIGHT_THEME['--pos-box-fill']),
        '--pos-text': v('--pos-text', LIGHT_THEME['--pos-text']),
        '--pos-bg': v('--pos-bg', LIGHT_THEME['--pos-bg']),
        '--pos-node-radius': v('--pos-node-radius', LIGHT_THEME['--pos-node-radius']),
        '--pos-note-radius': v('--pos-note-radius', LIGHT_THEME['--pos-note-radius']),
        '--pos-shadow': v('--pos-shadow', LIGHT_THEME['--pos-shadow']),
        '--pos-stroke-width': v('--pos-stroke-width', LIGHT_THEME['--pos-stroke-width']),
        '--pos-font-family': v('--pos-font-family', LIGHT_THEME['--pos-font-family']),
        '--pos-font-size': v('--pos-font-size', LIGHT_THEME['--pos-font-size']),
        '--pos-box-top': v('--pos-box-top', LIGHT_THEME['--pos-box-top']),
        '--pos-box-side': v('--pos-box-side', LIGHT_THEME['--pos-box-side']),
        '--pos-arrow-fill': v('--pos-arrow-fill', LIGHT_THEME['--pos-arrow-fill']),
    };
}

/**
 * Parse a CSS shadow string into a Konva-compatible shadow config.
 */
export function parseShadow(shadowStr: string): {
    shadowColor: string;
    shadowBlur: number;
    shadowOffsetX: number;
    shadowOffsetY: number;
    shadowOpacity: number;
} | null {
    if (!shadowStr || shadowStr === 'none') return null;
    // Parse: "0 2px 8px rgba(0,0,0,0.08)"
    const match = shadowStr.match(
        /(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)\s+(rgba?\([^)]+\))/
    );
    if (!match) return null;
    const opacityMatch = match[4].match(/rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+(?:\s*,\s*([\d.]+))?\s*\)/);
    const opacity = opacityMatch && opacityMatch[1] !== undefined ? parseFloat(opacityMatch[1]) : 1;
    return {
        shadowColor: match[4],
        shadowBlur: parseFloat(match[3]),
        shadowOffsetX: parseFloat(match[1]),
        shadowOffsetY: parseFloat(match[2]),
        shadowOpacity: opacity,
    };
}
