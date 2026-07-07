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
    // New typography & stroke properties for deeper structural differentiation
    '--pos-font-weight-header': string;
    '--pos-font-weight-body': string;
    '--pos-actor-stroke-width': string;
    '--pos-connection-stroke-width': string;
    '--pos-node-border-dash': string;
    '--pos-lifeline-dash': string;
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
    '--pos-font-weight-header': '600',
    '--pos-font-weight-body': 'normal',
    '--pos-actor-stroke-width': '2.0',
    '--pos-connection-stroke-width': '1.5',
    '--pos-node-border-dash': 'none',
    '--pos-lifeline-dash': '5,5',
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
    '--pos-font-weight-header': '600',
    '--pos-font-weight-body': 'normal',
    '--pos-actor-stroke-width': '2.0',
    '--pos-connection-stroke-width': '1.5',
    '--pos-node-border-dash': 'none',
    '--pos-lifeline-dash': '5,5',
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
    '--pos-node-radius': '10',
    '--pos-note-radius': '6',
    '--pos-shadow': '0 3px 12px rgba(159,122,234,0.15)',
    '--pos-stroke-width': '2.0',
    '--pos-font-family': "'Quicksand', 'Nunito', 'Segoe UI', sans-serif",
    '--pos-font-size': '14',
    '--pos-box-top': '#DDD0F0',
    '--pos-box-side': '#D0C4E8',
    '--pos-arrow-fill': '#9F7AEA',
    '--pos-font-weight-header': '700',
    '--pos-font-weight-body': '500',
    '--pos-actor-stroke-width': '2.0',
    '--pos-connection-stroke-width': '2.0',
    '--pos-node-border-dash': 'none',
    '--pos-lifeline-dash': '6,6',
};

export const FOREST_THEME: ThemeVars = {
    '--pos-stroke': '#2F5E42',
    '--pos-node-fill': '#FAF8F5',
    '--pos-note-fill': '#FCF6E8',
    '--pos-header-fill': '#E8EFE9',
    '--pos-sequence-fill': '#E2ECE5',
    '--pos-activation-fill': '#D2E4D8',
    '--pos-box-fill': '#E9EDE9',
    '--pos-text': '#1C2E24',
    '--pos-bg': '#FAF8F5',
    '--pos-node-radius': '4',
    '--pos-note-radius': '2',
    '--pos-shadow': '0 2px 8px rgba(47,97,68,0.12)',
    '--pos-stroke-width': '1.2',
    '--pos-font-family': "'Georgia', 'Times New Roman', serif",
    '--pos-font-size': '14',
    '--pos-box-top': '#D5E4D9',
    '--pos-box-side': '#BCCFC0',
    '--pos-arrow-fill': '#2F5E42',
    '--pos-font-weight-header': 'bold',
    '--pos-font-weight-body': 'normal',
    '--pos-actor-stroke-width': '1.5',
    '--pos-connection-stroke-width': '1.2',
    '--pos-node-border-dash': 'none',
    '--pos-lifeline-dash': '4,4',
};

export const NEOBRUTALIST_THEME: ThemeVars = {
    '--pos-stroke': '#000000',
    '--pos-node-fill': '#FDFFB6', // retro saturated light yellow
    '--pos-note-fill': '#FFD6A5', // retro orange
    '--pos-header-fill': '#FFADAD', // retro red
    '--pos-sequence-fill': '#CAFFBF', // retro green
    '--pos-activation-fill': '#9BF6FF', // retro cyan
    '--pos-box-fill': '#E8F0FE',
    '--pos-text': '#000000',
    '--pos-bg': '#FFFFFF',
    '--pos-node-radius': '0',
    '--pos-note-radius': '0',
    '--pos-shadow': '4px 4px 0px #000000', // hard offset, no blur
    '--pos-stroke-width': '3.0',
    '--pos-font-family': "'Consolas', 'Courier New', monospace",
    '--pos-font-size': '13',
    '--pos-box-top': '#E0E0E0',
    '--pos-box-side': '#B5B5B5',
    '--pos-arrow-fill': '#000000',
    '--pos-font-weight-header': '900',
    '--pos-font-weight-body': '700',
    '--pos-actor-stroke-width': '3.0',
    '--pos-connection-stroke-width': '2.5',
    '--pos-node-border-dash': 'none',
    '--pos-lifeline-dash': 'none', // solid
};

export const SKETCH_THEME: ThemeVars = {
    '--pos-stroke': '#1D3B6F', // ink blue
    '--pos-node-fill': '#F4F8FF', // light wash blue
    '--pos-note-fill': '#FFFEE0', // sticky note yellow
    '--pos-header-fill': '#EAF2FF',
    '--pos-sequence-fill': '#E3EFFF',
    '--pos-activation-fill': '#D1E6FF',
    '--pos-box-fill': '#F0F4FA',
    '--pos-text': '#1D3B6F',
    '--pos-bg': '#FAFBFD',
    '--pos-node-radius': '8',
    '--pos-note-radius': '4',
    '--pos-shadow': '0 2px 6px rgba(29,59,111,0.06)',
    '--pos-stroke-width': '2.0',
    '--pos-font-family': "'Architects Daughter', 'Comic Sans MS', cursive, sans-serif",
    '--pos-font-size': '14',
    '--pos-box-top': '#E1EDFC',
    '--pos-box-side': '#C6DCF9',
    '--pos-arrow-fill': '#1D3B6F',
    '--pos-font-weight-header': 'bold',
    '--pos-font-weight-body': 'normal',
    '--pos-actor-stroke-width': '2.0',
    '--pos-connection-stroke-width': '1.8',
    '--pos-node-border-dash': 'none',
    '--pos-lifeline-dash': '12,6', // long dashed pencil stroke style
};

export const MERMAID_THEME: ThemeVars = {
    '--pos-stroke': '#333333',
    '--pos-node-fill': '#ECECFF',
    '--pos-note-fill': '#FFF5AD',
    '--pos-header-fill': '#ECECFF',
    '--pos-sequence-fill': '#ECECFF',
    '--pos-activation-fill': '#ECECFF',
    '--pos-box-fill': '#F4F4F4',
    '--pos-text': '#333333',
    '--pos-bg': '#FFFFFF',
    '--pos-node-radius': '5',
    '--pos-note-radius': '2',
    '--pos-shadow': '0 1px 3px rgba(0,0,0,0.05)',
    '--pos-stroke-width': '1.2',
    '--pos-font-family': "'trebuchet ms', verdana, arial, sans-serif",
    '--pos-font-size': '14',
    '--pos-box-top': '#E0E0E0',
    '--pos-box-side': '#CCCCCC',
    '--pos-arrow-fill': '#333333',
    '--pos-font-weight-header': '600',
    '--pos-font-weight-body': 'normal',
    '--pos-actor-stroke-width': '1.5',
    '--pos-connection-stroke-width': '1.2',
    '--pos-node-border-dash': 'none',
    '--pos-lifeline-dash': '4,4',
};

export const THEMES: Record<string, ThemeVars> = {
    light: LIGHT_THEME,
    dark: DARK_THEME,
    pastel: PASTEL_THEME,
    forest: FOREST_THEME,
    neobrutalist: NEOBRUTALIST_THEME,
    sketch: SKETCH_THEME,
    mermaid: MERMAID_THEME,
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
        '--pos-font-weight-header': v('--pos-font-weight-header', LIGHT_THEME['--pos-font-weight-header']),
        '--pos-font-weight-body': v('--pos-font-weight-body', LIGHT_THEME['--pos-font-weight-body']),
        '--pos-actor-stroke-width': v('--pos-actor-stroke-width', LIGHT_THEME['--pos-actor-stroke-width']),
        '--pos-connection-stroke-width': v('--pos-connection-stroke-width', LIGHT_THEME['--pos-connection-stroke-width']),
        '--pos-node-border-dash': v('--pos-node-border-dash', LIGHT_THEME['--pos-node-border-dash']),
        '--pos-lifeline-dash': v('--pos-lifeline-dash', LIGHT_THEME['--pos-lifeline-dash']),
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
    
    // Parse: "0 2px 8px rgba(0,0,0,0.08)" or "4px 4px 0px #000000"
    const match = shadowStr.match(
        /(-?\d+(?:\.\d+)?)(?:px)?\s+(-?\d+(?:\.\d+)?)(?:px)?\s+(-?\d+(?:\.\d+)?)(?:px)?\s+(rgba?\([^)]+\)|#[0-9a-fA-F]{3,8}|[a-zA-Z]+)/
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
