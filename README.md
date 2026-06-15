# Posit

I use PlantUML and Mermaid.js a lot because writing diagrams as code is incredibly convenient. It’s easy to version control, edit on the fly, and maintain. 

However, I constantly ran into the same frustrating issue: as soon as a diagram grows past a few nodes, the automatic layout engines (like Graphviz) tend to make a total mess. Lines overlap awkwardly, components get pushed to random corners, and the diagram becomes hard to read. When I wanted to share a diagram with my team, post it to Confluence, or add it to a GitHub README, I found myself spending way too much time wrestling with syntax hacks just to make it look decent.

I built **Posit** to solve my own frustration. It’s a lightweight, local web tool that lets you paste your diagram code, **manually drag elements on a canvas to fix the layout**, and automatically save those new positions back into the source text as non-destructive comments. 

Your layout adjustments are preserved, but the file remains 100% valid text code that you can keep editing later.

---

## How It Works

Posit uses a two-way sync loop to keep your visual canvas and your raw code in perfect harmony:

1. **The Parser**: Built with TypeScript and Chevrotain.js, it reads your `.puml` or `.mermaid` code. It treats specific comment tags—like `/' @pos(x, y) '/` or `%% @pos(x, y)`—as first-class coordinate data.
2. **The Canvas**: Powered by Konva.js. If an element has coordinate comments, it snaps to that exact spot. If not, it uses a basic auto-layout pass. You can freely drag any element to rearrange it.
3. **The Emitter**: When you move a box, the engine calculates the new coordinates and surgically patches *only* the corresponding comment lines in your source text, leaving your actual logic, formatting, and other notes completely untouched.

---

## What It Currently Supports

I am focusing strictly on the core diagrams I use most for software and systems architecture:

* **PlantUML**: 
  * **Sequence Diagrams**: Full syntax coverage and interactive layout sync.
  * **Class Diagrams**: Full support for members, fields, methods, and generic types like `List~T~`.
  * **Deployment Diagrams**: Ongoing work supporting nested container layout math.
* **Mermaid.js**: 
  * **Sequence Diagrams**: Basic parsing and drag-based synchronization.

*Note: Posit is not trying to be a 100% feature-complete replacement for the official Java PlantUML engine or the full Mermaid library. It's a personal utility meant to handle core layout polishing for daily development documentation.*

---

## Getting Started

To run this project locally on your machine, follow these steps:

### 1. Install dependencies
Run this command in your project root to install the required packages:
```bash
npm install
```

### 2. Start the local development server
This will host the application locally with hot-reloading enabled:
```bash
npm run dev
```
Open `http://localhost:5173` in your browser. Paste your code in the left panel, tweak the layout on the right canvas, and copy the updated text back out.

### 3. Running tests & tools
You can verify the engine implementation and behavior using these commands:
```bash
# Run the unit test suite via Vitest
npm test  

# Generate a local static comparison gallery to check rendering accuracy
npx vite-node generate_gallery.ts  
```

