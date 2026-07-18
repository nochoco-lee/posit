/**
 * parserClient.ts
 *
 * Main-thread interface to parser.worker.ts.
 *
 * Usage:
 *   import { parserClient } from './parserClient';
 *
 *   // On app boot — start pre-warming in background order
 *   parserClient.startWarmQueue(['sequence', 'class', 'deployment', 'mermaid']);
 *
 *   // When user selects a type — jump it to the front
 *   parserClient.prioritize('mermaid');
 *
 *   // Parse (waits for bundle if not yet warm)
 *   const ast = await parserClient.parse('mermaid', text);
 */

import type { ParserType } from './parser.worker';

type PendingResolve = { resolve: (ast: any) => void; reject: (e: Error) => void };

class ParserClient {
    private worker: Worker;
    private pending = new Map<string, PendingResolve>();
    private nextId = 0;
    private readyCallbacks: Partial<Record<ParserType, Array<() => void>>> = {};
    /** Set of parser types whose bundles have been fully loaded in the worker. */
    private warmedParsers = new Set<ParserType>();

    constructor() {
        // Vite handles the ?worker suffix and bundles the worker correctly
        this.worker = new Worker(new URL('./parser.worker.ts', import.meta.url), { type: 'module' });
        this.worker.onmessage = (event: MessageEvent) => this.handleMessage(event.data);
        this.worker.onerror = (e) => console.error('[ParserClient] Worker error:', e);
    }

    private handleMessage(msg: any) {
        switch (msg.type) {
            case 'LOG':
                console[msg.level as 'log' | 'warn' | 'error']?.(msg.message);
                break;
            case 'READY': {
                this.warmedParsers.add(msg.parser as ParserType);
                const cbs = this.readyCallbacks[msg.parser as ParserType] ?? [];
                this.readyCallbacks[msg.parser as ParserType] = [];
                cbs.forEach(cb => cb());
                break;
            }
            case 'PARSE_OK': {
                const entry = this.pending.get(msg.id);
                if (entry) { this.pending.delete(msg.id); entry.resolve(msg.ast); }
                break;
            }
            case 'PARSE_ERROR': {
                const entry = this.pending.get(msg.id);
                if (entry) { this.pending.delete(msg.id); entry.reject(new Error(msg.message)); }
                break;
            }
        }
    }

    /** Returns true if the parser bundle for the given type is already loaded in the worker. */
    isWarm(parserType: ParserType): boolean {
        return this.warmedParsers.has(parserType);
    }

    /** Begin background pre-warming in the given order. */
    startWarmQueue(order: ParserType[]) {
        this.worker.postMessage({ type: 'WARM_QUEUE', order });
    }

    /**
     * Move `parserType` to the front of the warm-up queue.
     * Call this when the user explicitly selects a diagram type.
     */
    prioritize(parserType: ParserType) {
        this.worker.postMessage({ type: 'PRIORITIZE', parser: parserType });
    }

    /** Parse `text` with the given parser type. Returns the AST. */
    parse(parserType: ParserType, text: string): Promise<any> {
        const id = String(this.nextId++);
        return new Promise<any>((resolve, reject) => {
            this.pending.set(id, { resolve, reject });
            this.worker.postMessage({ type: 'PARSE', id, parser: parserType, text });
        });
    }

    /** Terminate the worker (call on app teardown if needed). */
    terminate() {
        this.worker.terminate();
    }
}

// Singleton — one worker for the entire app lifetime
export const parserClient = new ParserClient();
