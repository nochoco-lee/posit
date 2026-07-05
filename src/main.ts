import { parsePlantUml, warmUpParsers, warmUpParser } from "./parser";
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
const syncButton = document.getElementById('sync-btn') as HTMLButtonElement;
const diagramTypeSelect = document.getElementById('diagram-type') as HTMLSelectElement;

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

async function refreshDiagram() {
    const text = editor.value;
    currentText = text;

    // Short-circuit on empty editor — clear canvas and reset state immediately
    if (!text.trim()) {
        currentAst = null;
        currentLayoutMap = null;
        currentLanguage = Language.Unknown;
        renderer.clear();
        showError(null);
        return;
    }

    try {

        const sel = diagramTypeSelect.value; // 'auto' | 'puml-sequence' | 'puml-class' | 'puml-deployment' | 'mermaid'

        // Resolve language — skip the regex detector when the user has forced a type
        if (sel === 'mermaid') {
            currentLanguage = Language.Mermaid;
        } else if (sel !== 'auto') {
            currentLanguage = Language.PlantUML;
        } else {
            currentLanguage = detectLanguage(text);
        }

        // Extract the PlantUML sub-type from the select value, if forced
        const forcedPumlType = (sel !== 'auto' && sel !== 'mermaid')
            ? sel.replace('puml-', '') as 'sequence' | 'class' | 'deployment'
            : undefined;

        if (currentLanguage === Language.Mermaid) {
            currentAst = await parseMermaid(text);
        } else {
            // Pass forcedPumlType so parsePlantUml can skip its scanner entirely
            currentAst = await parsePlantUml(text, forcedPumlType);
        }

        const layoutManager = new LayoutManager();
        currentLayoutMap = layoutManager.process(currentAst);
        await renderer.render(currentLayoutMap);
        showError(null);
    } catch (e: any) {
        console.error("Parse Error:", e.message);
        showError(e.message);
    }
}

// Dismiss the loading overlay immediately — the editor starts empty so there
// is nothing to parse on startup. Parsers are loaded on-demand when the user
// first types. Use requestAnimationFrame so the app frame is painted first.
requestAnimationFrame(() => {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.classList.add('hidden');
        loadingOverlay.addEventListener('transitionend', () => loadingOverlay.remove(), { once: true });
    }
});

// Diagram-type selector: immediately warm the chosen parser and re-render
diagramTypeSelect.addEventListener('change', () => {
    const sel = diagramTypeSelect.value;
    if (sel !== 'auto' && sel !== 'mermaid') {
        // Warm the specific parser right now — no delay — so the next
        // refreshDiagram() call doesn't pay the cold-start cost.
        warmUpParser(sel.replace('puml-', '') as 'sequence' | 'class' | 'deployment');
    }
    refreshDiagram();
});


// Live update on type with debounce.
// On the very first keystroke, pre-warm the parser for the currently selected
// type immediately (before the debounce fires) so it loads in parallel with
// the user's initial typing — minimising the cold-start delay on first render.
let hasStartedTyping = false;
let debounceTimer: any = null;
editor.addEventListener('input', () => {
    if (!hasStartedTyping) {
        hasStartedTyping = true;
        const sel = diagramTypeSelect.value;
        if (sel !== 'auto' && sel !== 'mermaid') {
            // Specific type selected — warm exactly that one, right now
            warmUpParser(sel.replace('puml-', '') as 'sequence' | 'class' | 'deployment');
        } else if (sel === 'auto') {
            // Auto-detect — warm all three staggered so they're ready when
            // the user switches diagram types later in the session
            warmUpParsers(0); // 0ms initial delay: user is already interacting
        }
    }
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        refreshDiagram();
        // (fire-and-forget — errors are caught inside refreshDiagram)
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

/**
 * Orchestrates the two-way sync: Layout -> Source Code.
 * This is an expensive operation as it involves re-patching the source and re-parsing.
 * It is now only triggered by the manual "Sync" button, not automatically on drag end.
 */
async function syncLayoutToSource() {
    if (!currentAst || !currentLayoutMap) return;
    if (currentLanguage === Language.Mermaid) {
        console.warn("Two-way sync is not yet supported for Mermaid diagrams.");
        return;
    }

    try {
        const emitter = new Emitter();
        const sel = diagramTypeSelect.value;
        const forcedPumlType = (sel !== 'auto' && sel !== 'mermaid')
            ? sel.replace('puml-', '') as 'sequence' | 'class' | 'deployment'
            : undefined;
        // Use currentText which corresponds exactly to the offsets in currentAst
        const updatedSource = emitter.emitPlantUml(currentText, currentAst, currentLayoutMap);
        
        // Update the actual text area payload
        editor.value = updatedSource;
        currentText = updatedSource;
        currentAst = await parsePlantUml(currentText, forcedPumlType);
        showError(null);
    } catch (e: any) {
        console.error("Emitter Error on Sync:", e.message);
        showError("Emitter Error: " + e.message);
    }
}

// --- Sync button state helpers ---
function markOutOfSync() {
    syncButton.classList.add('out-of-sync');
    syncButton.classList.remove('syncing');
}

function markSynced() {
    syncButton.classList.remove('out-of-sync', 'syncing');
}

// Sync button click handler
syncButton.addEventListener('click', async () => {
    syncButton.disabled = true;
    syncButton.classList.add('syncing');
    syncButton.classList.remove('out-of-sync');
    await syncLayoutToSource();
    syncButton.disabled = false;
    markSynced();
});


renderer.onDragEnd((id, newX, newY) => {
    // 1. We must have valid cached models to perform an update
    if (!currentAst || !currentLayoutMap) return;

    // 2. Update the in-memory coordinate location for the dragged Element
    if (currentLayoutMap.nodes[id]) {
        currentLayoutMap.nodes[id].position = { x: newX, y: newY };
    } else if (id.startsWith('div-')) {
        const label = id.substring(4);
        const div = currentLayoutMap.dividers?.find((d: any) => d.label === label);
        if (div) div.position = { x: newX, y: newY };
    } else if (id.startsWith('note-')) {
        // Find note by prefix of text
        const prefix = id.substring(5);
        const note = currentLayoutMap.notes.find((n: any) => n.text.startsWith(prefix));
        if (note) note.position = { x: newX, y: newY };
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
            conn.position = { x: 0, y: clampedY }; // Standardized coordinate for connection drag
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

    // 3. Mark diagram as out-of-sync with the source.
    //    The user can click the Sync button to write @pos tags back — this avoids
    //    the 6-9s main-thread freeze that parsePlantUml() caused on every drag end.
    markOutOfSync();
});
