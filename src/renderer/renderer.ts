import Konva from 'konva';
import { LayoutMap } from "../layout/types";
import { syncThemeFromCSS } from "./primitives";
// Type-only imports — erased at runtime, so these modules are NOT bundled eagerly.
// The actual code is loaded on-demand via dynamic import() inside the lazy getters below.
import type { SequenceRenderer as SequenceRendererType } from './sequence';
import type { ClassRenderer as ClassRendererType } from './class';
import type { DeploymentRenderer as DeploymentRendererType } from './deployment';

export class LayoutPumlRenderer {
    public stage: Konva.Stage;
    private layer: Konva.Layer;
    private onNodeMoveCallback?: (id: string, newX: number, newY: number) => void;

    // Lazily instantiated — null until first render of that diagram type
    private _sequenceRenderer: SequenceRendererType | null = null;
    private _classRenderer: ClassRendererType | null = null;
    private _deploymentRenderer: DeploymentRendererType | null = null;

    private contentWidth: number = 0;
    private contentHeight: number = 0;

    constructor(containerId: string) {
        const container = document.getElementById(containerId)!;
        const w = container.clientWidth || 1200;
        const h = container.clientHeight || 800;

        this.stage = new Konva.Stage({
            container: containerId,
            width: w,
            height: h,
        });

        this.layer = new Konva.Layer();
        this.stage.add(this.layer);

        // Resize the stage when the window resizes so we never paint
        // more pixels than the viewport requires, but don't shrink below content.
        window.addEventListener('resize', () => {
            const w = container.clientWidth;
            const h = container.clientHeight;
            this.stage.width(Math.max(w, this.contentWidth));
            this.stage.height(Math.max(h, this.contentHeight));
        });
    }

    // ── Lazy sub-renderer getters ──────────────────────────────────────────────
    // Each getter dynamically imports its module on first call and caches the
    // instance for all subsequent calls. The drag-end callback is applied
    // immediately if it was registered before the renderer was created.

    private async getSequenceRenderer(): Promise<SequenceRendererType> {
        if (!this._sequenceRenderer) {
            const { SequenceRenderer } = await import('./sequence');
            this._sequenceRenderer = new SequenceRenderer(this.stage, this.layer);
            if (this.onNodeMoveCallback) {
                this._sequenceRenderer.setOnDragEnd(this.onNodeMoveCallback);
            }
        }
        return this._sequenceRenderer;
    }

    private async getClassRenderer(): Promise<ClassRendererType> {
        if (!this._classRenderer) {
            const { ClassRenderer } = await import('./class');
            this._classRenderer = new ClassRenderer(this.stage, this.layer);
            if (this.onNodeMoveCallback) {
                this._classRenderer.setOnDragEnd(this.onNodeMoveCallback);
            }
        }
        return this._classRenderer;
    }

    private async getDeploymentRenderer(): Promise<DeploymentRendererType> {
        if (!this._deploymentRenderer) {
            const { DeploymentRenderer } = await import('./deployment');
            this._deploymentRenderer = new DeploymentRenderer(this.stage, this.layer);
            if (this.onNodeMoveCallback) {
                this._deploymentRenderer.setOnDragEnd(this.onNodeMoveCallback);
            }
        }
        return this._deploymentRenderer;
    }

    // ── Public API ─────────────────────────────────────────────────────────────

    public onDragEnd(callback: (id: string, newX: number, newY: number) => void) {
        this.onNodeMoveCallback = callback;
        // Apply to any already-instantiated sub-renderers
        this._sequenceRenderer?.setOnDragEnd(callback);
        this._classRenderer?.setOnDragEnd(callback);
        this._deploymentRenderer?.setOnDragEnd(callback);
    }

    public async render(map: LayoutMap): Promise<void> {
        this.adjustLayoutBounds(map);
        syncThemeFromCSS();
        if (map.diagramType === 'sequence') {
            const r = await this.getSequenceRenderer();
            r.render(map);
        } else if (map.diagramType === 'class') {
            const r = await this.getClassRenderer();
            r.render(map);
        } else if (map.diagramType === 'deployment') {
            const r = await this.getDeploymentRenderer();
            r.render(map);
        } else {
            // Default to sequence for unknown
            const r = await this.getSequenceRenderer();
            r.render(map);
        }

        this.fitStageToContent(map);
    }

    private adjustLayoutBounds(map: LayoutMap): { shiftX: number; shiftY: number } {
        let minX = Infinity;
        let minY = Infinity;

        const nodes = Object.values(map.nodes);
        nodes.forEach(n => {
            minX = Math.min(minX, n.position.x);
            minY = Math.min(minY, n.position.y);
        });
        if (map.notes) {
            map.notes.forEach(n => {
                minX = Math.min(minX, n.position.x);
                minY = Math.min(minY, n.position.y);
            });
        }
        if (map.groups) {
            map.groups.forEach(g => {
                minX = Math.min(minX, g.position.x);
                minY = Math.min(minY, g.position.y);
            });
        }
        if (map.connections) {
            map.connections.forEach(c => {
                if (c.position) {
                    minX = Math.min(minX, c.position.x);
                    minY = Math.min(minY, c.position.y);
                }
                if (c.calculatedY !== undefined) {
                    minY = Math.min(minY, c.calculatedY);
                }
            });
        }
        if (map.dividers) {
            map.dividers.forEach(d => {
                minX = Math.min(minX, d.position.x);
                minY = Math.min(minY, d.position.y);
            });
        }
        if (map.delays) {
            map.delays.forEach(d => {
                minX = Math.min(minX, d.position.x);
                minY = Math.min(minY, d.position.y);
            });
        }
        if (map.activations) {
            map.activations.forEach(a => {
                minX = Math.min(minX, a.startPosition.x);
                minY = Math.min(minY, a.startPosition.y);
            });
        }

        if (minX === Infinity) {
            return { shiftX: 0, shiftY: 0 };
        }

        const shiftX = minX < 0 ? -minX : 0;
        const shiftY = minY < 0 ? -minY : 0;

        if (shiftX > 0 || shiftY > 0) {
            nodes.forEach(n => {
                n.position.x += shiftX;
                n.position.y += shiftY;
                if (n.lifelineX !== undefined) n.lifelineX += shiftX;
                if (n.lifelineY !== undefined) n.lifelineY += shiftY;
            });
            if (map.notes) {
                map.notes.forEach(n => {
                    n.position.x += shiftX;
                    n.position.y += shiftY;
                });
            }
            if (map.groups) {
                map.groups.forEach(g => {
                    g.position.x += shiftX;
                    g.position.y += shiftY;
                    if (g.contentStartY !== undefined) g.contentStartY += shiftY;
                });
            }
            if (map.connections) {
                map.connections.forEach(c => {
                    if (c.position) {
                        c.position.x += shiftX;
                        c.position.y += shiftY;
                    }
                    if (c.calculatedY !== undefined) {
                        c.calculatedY += shiftY;
                    }
                });
            }
            if (map.dividers) {
                map.dividers.forEach(d => {
                    d.position.x += shiftX;
                    d.position.y += shiftY;
                });
            }
            if (map.delays) {
                map.delays.forEach(d => {
                    d.position.x += shiftX;
                    d.position.y += shiftY;
                });
            }
            if (map.activations) {
                map.activations.forEach(a => {
                    a.startPosition.x += shiftX;
                    a.startPosition.y += shiftY;
                });
            }
        }

        return { shiftX, shiftY };
    }

    private fitStageToContent(map: LayoutMap) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        const nodes = Object.values(map.nodes);
        if (nodes.length === 0 && (!map.notes || map.notes.length === 0) && (!map.groups || map.groups.length === 0)) return;

        nodes.forEach(n => {
            minX = Math.min(minX, n.position.x);
            minY = Math.min(minY, n.position.y);
            maxX = Math.max(maxX, n.position.x + n.size.width);
            maxY = Math.max(maxY, n.position.y + n.size.height);
        });
        if (map.notes) map.notes.forEach(n => {
            minX = Math.min(minX, n.position.x);
            minY = Math.min(minY, n.position.y);
            maxX = Math.max(maxX, n.position.x + n.size.width);
            maxY = Math.max(maxY, n.position.y + n.size.height);
        });
        if (map.groups) map.groups.forEach(g => {
            minX = Math.min(minX, g.position.x);
            minY = Math.min(minY, g.position.y);
            maxX = Math.max(maxX, g.position.x + g.size.width);
            maxY = Math.max(maxY, g.position.y + g.size.height);
        });
        map.connections.forEach(c => {
            if (c.position) {
                maxX = Math.max(maxX, c.position.x + 200);
                maxY = Math.max(maxY, c.position.y + 20);
            }
            if (c.calculatedY !== undefined) {
                maxY = Math.max(maxY, c.calculatedY + 20);
            }
        });

        const padding = 40;
        this.contentWidth = maxX - minX + padding * 2;
        this.contentHeight = maxY - minY + padding * 2;
        const container = this.stage.container();
        const containerW = container.clientWidth || 1200;
        const containerH = container.clientHeight || 800;

        this.stage.width(Math.max(this.contentWidth, containerW));
        this.stage.height(Math.max(this.contentHeight, containerH));
        // Reset offsets when canvas auto-resizes / shifts elements inside fitStageToContent
        this.stage.offsetX(0);
        this.stage.offsetY(0);
    }

    /** Wipe the canvas — called when the editor is cleared */
    public clear() {
        this.layer.destroyChildren();
        this.layer.draw();
    }

    public syncPositions(map: LayoutMap) {
        this.adjustLayoutBounds(map);
        this.fitStageToContent(map);

        // Sub-renderers are guaranteed to exist here since syncPositions is only called
        // after a drag-end, which requires the diagram to already be rendered.
        if (map.diagramType === 'sequence' || map.diagramType === 'unknown') {
            this._sequenceRenderer?.syncPositions(map);
        } else if (map.diagramType === 'class') {
            this._classRenderer?.syncPositions(map);
        } else if (map.diagramType === 'deployment') {
            this._deploymentRenderer?.syncPositions(map);
        }
    }

    /** Called by main.ts to toggle shadow rendering off during drag for performance */
    public setDragging(isDragging: boolean) {
        this._sequenceRenderer?.setDragging(isDragging);
        this._classRenderer?.setDragging(isDragging);
        this._deploymentRenderer?.setDragging(isDragging);
    }
}
