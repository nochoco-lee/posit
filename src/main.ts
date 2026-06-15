import { parsePlantUml } from "./parser";
import { parseMermaid } from "./mermaid/index";
import { detectLanguage, Language } from "./detector";
import { LayoutManager } from "./layout/engine";
import { LayoutPumlRenderer } from "./renderer/renderer";
import { LayoutPumlSvgRenderer } from "./renderer/svg_renderer";
import { Emitter } from "./layout/emitter";
import { DEFAULTS } from "./layout/types";

const editor = document.getElementById('editor') as HTMLTextAreaElement;
const errorPanel = document.getElementById('error-panel') as HTMLDivElement;
const pngButton = document.getElementById('download-png') as HTMLButtonElement;
const svgButton = document.getElementById('download-svg') as HTMLButtonElement;

const renderer = new LayoutPumlRenderer('canvas-container');
const svgRenderer = new LayoutPumlSvgRenderer();

let currentAst: any = null;
let currentLayoutMap: any = null;
let currentText: string = "";
let currentLanguage: Language = Language.Unknown;

function showError(message: string | null) {
    if (message) {
        errorPanel.textContent = message;
        errorPanel.classList.add('visible');
    } else {
        errorPanel.textContent = "";
        errorPanel.classList.remove('visible');
    }
}

function refreshDiagram() {
    try {
        const text = editor.value;
        currentText = text;
        currentLanguage = detectLanguage(text);

        if (currentLanguage === Language.Mermaid) {
            currentAst = parseMermaid(text);
        } else {
            // Default to PlantUML for currently unknown formats
            currentAst = parsePlantUml(text);
        }

        const layoutManager = new LayoutManager();
        currentLayoutMap = layoutManager.process(currentAst);
        renderer.render(currentLayoutMap);
        showError(null);
    } catch (e: any) {
        console.error("Parse Error:", e.message);
        showError(e.message);
    }
}

// Initial draw
refreshDiagram();

// Dismiss the loading overlay now that the diagram engine is ready
const loadingOverlay = document.getElementById('loading-overlay');
if (loadingOverlay) {
    loadingOverlay.classList.add('hidden');
    // Remove from DOM after transition completes to free memory
    loadingOverlay.addEventListener('transitionend', () => loadingOverlay.remove(), { once: true });
}

// Live update on type with debounce
let debounceTimer: any = null;
editor.addEventListener('input', () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        refreshDiagram();
    }, 200);
});

// Download PNG
pngButton.addEventListener('click', () => {
    if (!renderer.stage) return;
    
    // High-quality export
    const dataURL = renderer.stage.toDataURL({ pixelRatio: 2 });
    const link = document.createElement('a');
    link.download = `posit_diagram_${Date.now()}.png`;
    link.href = dataURL;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// Download SVG
svgButton.addEventListener('click', () => {
    if (!currentLayoutMap) return;
    
    const svg = svgRenderer.render(currentLayoutMap);
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.download = `posit_diagram_${Date.now()}.svg`;
    link.href = url;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
});

// For Phase 4 (Two-Way sync)
renderer.onMove((id, newX, newY) => {
    // 1. We must have valid cached models to perform an update
    if (!currentAst || !currentLayoutMap) return;

    // 2. Update the in-memory coordinate location for the dragged Element
    if (currentLayoutMap.nodes[id]) {
        currentLayoutMap.nodes[id].position = { x: newX, y: newY };
    } else if (id.startsWith('div-')) {
        const label = id.substring(4);
        const div = currentLayoutMap.dividers?.find((d: any) => d.label === label);
        if (div) div.position = { x: newX, y: newY };
    } else if (currentLayoutMap.groups.find((g: any) => g.id === id)) {
        const group = currentLayoutMap.groups.find((g: any) => g.id === id);
        if (group) group.position = { x: newX, y: newY };
    } else if (id.startsWith('conn-')) {
        // ID format: `conn-${conn.from}-${conn.to}-${conn.label || ''}`
        const parts = id.split('-');
        const from = parts[1];
        const to = parts[2];
        const label = parts.slice(3).join('-') || null;

        const connIndex = currentLayoutMap.connections.findIndex((c: any) => 
            c.from === from && c.to === to && (c.label === label || (!c.label && !label))
        );

        if (connIndex !== -1) {
            // Clamping logic: Dragged message cannot go above the previous one + MIN_GAP
            let clampedY = newY;
            if (connIndex > 0) {
                const prevConn = currentLayoutMap.connections[connIndex - 1];
                const minY = prevConn.calculatedY + DEFAULTS.SEQUENCE_MIN_Y_GAP;
                if (clampedY < minY) clampedY = minY;
            } else {
                // First message clamping against headers
                const minY = DEFAULTS.SEQUENCE_START_Y + DEFAULTS.PARTICIPANT_HEIGHT + 20;
                if (clampedY < minY) clampedY = minY;
            }

            const conn = currentLayoutMap.connections[connIndex];
            conn.position = { x: newX, y: clampedY };
            conn.calculatedY = clampedY;

            // Cascade updates DOWNWARDS to maintain SEQUENCE_MIN_Y_GAP for subsequent messages
            let lastYDown = clampedY;
            for (let i = connIndex + 1; i < currentLayoutMap.connections.length; i++) {
                const nextConn = currentLayoutMap.connections[i];
                const minY = lastYDown + DEFAULTS.SEQUENCE_MIN_Y_GAP;
                if (nextConn.calculatedY < minY) {
                    nextConn.calculatedY = minY;
                    if (!nextConn.position) {
                        nextConn.position = { x: 0, y: minY };
                    } else {
                        nextConn.position.y = minY;
                    }
                }
                lastYDown = nextConn.calculatedY;
            }
        }
    }

    // Update visuals without a full redraw to avoid reset of dragging state
    renderer.syncPositions(currentLayoutMap);

    // 3. Initiate the Emitter Two-Way Sync
    if (currentLanguage === Language.Mermaid) {
        console.warn("Two-way sync is not yet supported for Mermaid diagrams.");
        return;
    }

    try {
        const emitter = new Emitter();
        // Use currentText which corresponds exactly to the offsets in currentAst
        const updatedSource = emitter.emitPlantUml(currentText, currentAst, currentLayoutMap);
        
        // 4. Update the actual text area payload
        editor.value = updatedSource;
        currentText = updatedSource;
        currentAst = parsePlantUml(currentText);
        showError(null);

        // Note: we don't call refreshDiagram() here otherwise it resets Konva dragging bounds and causes lag
    } catch (e: any) {
        console.error("Emitter Error on Move:", e.message);
        showError("Emitter Error: " + e.message);
    }
});
