# Posit

**Write in code, polish for publishing.**

Posit is a specialized layout and publication engine for diagrams-as-code. It solves a specific pain point: while tools like **PlantUML** and **Mermaid.js** are excellent for version control and LLM generation, their default automatic layouts often yield suboptimal results for high-stakes documentation. Diagrams can become excessively wide, lines may overlap in confusing ways, and elements can shrink to illegibility when embedded in Confluence, GitHub Pages, or technical blogs.

Posit isn't a "drag-as-you-edit" tool. It's a "finish writing, then polish" tool—the "Print Preview" for your code-generated diagrams.

## Why Posit?

- **Format Agnostic**: Support for multiple diagramming languages including PlantUML and Mermaid.js.
- **Clean Source, Polished Output**: Maintain all the benefits of plain-text diagrams while gaining total control over the final visual arrangement.
- **Embedded Metadata**: Layout coordinates are stored directly in your source files using non-destructive comments (e.g., `/' @pos(x, y) '/`). Your layout is versioned alongside your logic.
- **Publication Ready**: Fine-tune your diagrams specifically for their destination, ensuring they look perfect on any documentation site.

## Core Concepts

### I. Multi-Format Parsers
- High-performance, JS-native parsers for various diagramming formats.
- Treats layout metadata as first-class citizens while preserving the original source intent.

### II. The Interactive Canvas
- Powered by **Konva.js** for a reactive, high-performance HTML5 Canvas.
- Implements a hybrid layout engine: automatic placement by default, strictly following `@pos` overrides where they exist.

### III. The Emitter (Two-Way Sync)
- As you polish the layout on the canvas, the engine recalculates coordinates.
- The **Emitter** layer surgicaly patches your original source file with updated coordinate comments, preserving all other formatting, logic, and user comments.

## Current Support

- **PlantUML**: Full syntax coverage for Sequence and Class diagrams. Deployment diagrams supported with recursive container layout.
- **Mermaid.js**: Support for Sequence Diagrams with interactive layout sync.
- **Extensible Architecture**: Designed to easily add support for new diagramming formats and shapes.

## Getting Started

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:5173` in your browser.

3. **Verify Implementation**:
   ```bash
   npm run test -- --run  # Run Vitest suite
   npx tsx generate_gallery.ts  # Generate a side-by-side comparison gallery
   ```

## Workflow

1. **Write**: Author your diagram in your preferred code-based format (PlantUML, Mermaid, etc.).
2. **Polish**: Open it in Posit and drag elements to their optimal positions.
3. **Save**: Your source file is automatically updated with coordinate metadata in comments.
4. **Publish**: Commit your polished source and export for documentation.

---

*Note: Posit is not intended to be a full replacement for official rendering engines. It focuses on the core syntax and layout needs of enterprise architects and system designers.*
