import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { parsePlantUml } from "./src/parser/index";
import { parseMermaid } from "./src/mermaid/index";
import { LayoutManager } from "./src/layout/engine";
import { LayoutPumlSvgRenderer } from "./src/renderer/svg_renderer";

const testDirs = [
    { name: "Sequence Diagrams", path: "test_scripts/plantuml_sequence", mpath: "test_scripts/mermaid_sequence", file: "gallery_sequence.html" },
    { name: "Class Diagrams", path: "test_scripts/plantuml_class", mpath: "test_scripts/mermaid_class", file: "gallery_class.html" },
    { name: "Deployment Diagrams", path: "test_scripts/plantuml_deployment", mpath: "test_scripts/mermaid_flowchart", file: "gallery_deployment.html" }
];
const localRenderDir = "local_renders";
const ourRenderDir = path.join(localRenderDir, "our_renders");

// Ensure render directories exist
if (!fs.existsSync(localRenderDir)) {
    fs.mkdirSync(localRenderDir);
}
if (!fs.existsSync(ourRenderDir)) {
    fs.mkdirSync(ourRenderDir);
}

// Check if plantuml command or jar is available
let plantumlCmd = "";
try {
    execSync("plantuml -version", { stdio: 'ignore' });
    plantumlCmd = "plantuml";
} catch (e) {
    if (fs.existsSync("plantuml.jar")) {
        plantumlCmd = "java -jar plantuml.jar";
    }
}

let hasLocalPlantUml = plantumlCmd !== "";
if (hasLocalPlantUml) {
    console.log(`Local PlantUML found (${plantumlCmd}). Generating official renders...`);
} else {
    console.warn("Local PlantUML not found. 'Official' column will be empty.");
}

const svgRenderer = new LayoutPumlSvgRenderer();

testDirs.forEach(dirInfo => {
    const testCases: any[] = [];
    console.log(`Processing ${dirInfo.name}...`);

    // 1. Process PlantUML files
    if (fs.existsSync(dirInfo.path)) {
        const files = fs.readdirSync(dirInfo.path)
            .filter(f => f.endsWith(".puml"))
            .sort((a, b) => {
                const numA = parseInt(a.match(/\d+/)?.at(0) || "0");
                const numB = parseInt(b.match(/\d+/)?.at(0) || "0");
                return numA - numB;
            });

        files.forEach(file => {
            const filePath = path.join(dirInfo.path, file);
            const content = fs.readFileSync(filePath, "utf-8");
            
            const baseName = `puml_${dirInfo.name.replace(/\s+/g, '_')}_${file.replace(".puml", "")}`;
            const officialPngName = `${baseName}_official.png`;
            const ourSvgName = `${baseName}_our.svg`;
            
            const localOfficialPath = path.join(localRenderDir, officialPngName);
            const localOurPath = path.join(ourRenderDir, ourSvgName);

            // Official Render
            if (hasLocalPlantUml && !fs.existsSync(localOfficialPath)) {
                try {
                    execSync(`${plantumlCmd} "${filePath}" -o "${path.resolve(localRenderDir)}"`, { stdio: 'ignore' });
                    const defaultPngPath = path.join(localRenderDir, file.replace(".puml", ".png"));
                    if (fs.existsSync(defaultPngPath)) {
                        fs.renameSync(defaultPngPath, localOfficialPath);
                    }
                } catch (e) {}
            }

            // Our Render (SVG)
            let ourRenderUrl = "";
            let error = "";
            let inferredType = "unknown";
            try {
                const ast = parsePlantUml(content);
                inferredType = ast.diagramType;
                const layoutManager = new LayoutManager();
                const map = layoutManager.process(ast);
                const svg = svgRenderer.render(map);
                fs.writeFileSync(localOurPath, svg);
                ourRenderUrl = `./${localRenderDir}/our_renders/${ourSvgName}`;
            } catch (e: any) {
                error = e.message;
            }

            testCases.push({
                name: file,
                source: content,
                officialUrl: hasLocalPlantUml && fs.existsSync(localOfficialPath) ? `./${localRenderDir}/${officialPngName}` : "",
                ourUrl: ourRenderUrl,
                error: error,
                inferredType: inferredType,
                syntax: 'PlantUML'
            });
        });
    }

    // 2. Process Mermaid files
    if (fs.existsSync(dirInfo.mpath)) {
        const mfiles = fs.readdirSync(dirInfo.mpath)
            .filter(f => f.endsWith(".mmd"))
            .sort((a, b) => {
                const numA = parseInt(a.match(/\d+/)?.at(0) || "0");
                const numB = parseInt(b.match(/\d+/)?.at(0) || "0");
                return numA - numB;
            });

        mfiles.forEach(file => {
            const filePath = path.join(dirInfo.mpath, file);
            const content = fs.readFileSync(filePath, "utf-8");
            
            const baseName = `mermaid_${dirInfo.name.replace(/\s+/g, '_')}_${file.replace(".mmd", "")}`;
            const ourSvgName = `${baseName}_our.svg`;
            const localOurPath = path.join(ourRenderDir, ourSvgName);

            let ourRenderUrl = "";
            let error = "";
            let inferredType = "unknown";
            try {
                const ast = parseMermaid(content);
                inferredType = ast.diagramType;
                const layoutManager = new LayoutManager();
                const map = layoutManager.process(ast);
                const svg = svgRenderer.render(map);
                fs.writeFileSync(localOurPath, svg);
                ourRenderUrl = `./${localRenderDir}/our_renders/${ourSvgName}`;
            } catch (e: any) {
                error = e.message;
            }

            testCases.push({
                name: file,
                source: content,
                officialUrl: "", // No local mermaid renderer for now
                ourUrl: ourRenderUrl,
                error: error,
                inferredType: inferredType,
                syntax: 'Mermaid'
            });
        });
    }

    // Generate HTML for this category
    let casesHtml = "";
    testCases.forEach(testCase => {
        casesHtml += `
            <div class="case">
                <div class="case-header">
                    <span>[${testCase.syntax}] ${testCase.name}</span>
                    <span style="float:right; font-weight: normal; font-size: 0.8em; color: #666;">Inferred: ${testCase.inferredType}</span>
                </div>
                <div class="comparison-grid">
                    <div class="col">
                        <div class="col-header">1. Source (${testCase.syntax})</div>
                        <div class="puml-source">${testCase.source.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
                    </div>
                    <div class="col">
                        <div class="col-header">${testCase.syntax === 'Mermaid' ? '2. Official (Mermaid)' : '2. Official (Puml only)'}</div>
                        <div class="img-container">
                            ${testCase.syntax === 'Mermaid'
                                ? `<pre class="mermaid" style="background: transparent; border: none; padding: 0; margin: 0; display: block; font-family: inherit; font-size: inherit; text-align: center; width: 100%;">${testCase.source}</pre>`
                                : (testCase.officialUrl ? `<img src="${testCase.officialUrl}" alt="Official Render">` : '<span class="missing-info">No official render</span>')
                            }
                        </div>
                    </div>
                    <div class="col">
                        <div class="col-header">3. Our Renderer (SVG)</div>
                        <div class="img-container">
                            ${testCase.error ? `<div class="error"><strong>Error:</strong> ${testCase.error}</div>` : `<img src="${testCase.ourUrl}" alt="Our Render">`}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    const galleryHtml = `<!DOCTYPE html>
<html>
<head>
    <title>${dirInfo.name} Evaluation Gallery</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        h1 { text-align: center; color: #333; }
        .nav { text-align: center; margin-bottom: 20px; }
        .nav a { margin: 0 10px; color: #0066cc; text-decoration: none; font-weight: bold; }
        .case { background: white; margin-bottom: 40px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden; display: flex; flex-direction: column; }
        .case-header { background: #eee; padding: 10px 20px; font-weight: bold; border-bottom: 1px solid #ddd; }
        .comparison-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1px; background: #ddd; }
        .col { background: white; padding: 15px; display: flex; flex-direction: column; min-width: 0; }
        .col-header { font-size: 0.9em; color: #666; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
        .puml-source { background: #272822; color: #f8f8f2; padding: 10px; border-radius: 4px; font-family: 'Consolas', 'Monaco', monospace; font-size: 12px; white-space: pre-wrap; flex-grow: 1; overflow: auto; max-height: 500px; }
        .img-container { text-align: center; flex-grow: 1; display: flex; align-items: center; justify-content: center; overflow: auto; min-height: 200px; border: 1px dashed #ccc; }
        .img-container img { max-width: 100%; height: auto; border: 1px solid #eee; }
        .error { color: #d9534f; font-size: 14px; padding: 10px; background: #f2dede; border-radius: 4px; }
        .missing-info { color: #999; font-style: italic; }
    </style>
    <script type="module">
        import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
        mermaid.initialize({ startOnLoad: true });
    </script>
</head>
<body>
    <div class="nav">
        <a href="gallery_sequence.html">Sequence</a> | 
        <a href="gallery_class.html">Class</a> | 
        <a href="gallery_deployment.html">Deployment</a>
    </div>
    <h1>${dirInfo.name} Evaluation Gallery</h1>
    <div id="gallery">
        ${casesHtml}
    </div>
</body>
</html>`;

    fs.writeFileSync(dirInfo.file, galleryHtml);
    console.log(`${dirInfo.file} generated with ${testCases.length} cases.`);
});

// Also generate a simple index gallery.html
const indexHtml = `<!DOCTYPE html>
<html>
<head>
    <title>Diagram Evaluation Gallery</title>
    <style>
        body { font-family: sans-serif; text-align: center; padding: 50px; }
        a { display: block; margin: 20px; font-size: 1.5em; color: #0066cc; text-decoration: none; }
    </style>
</head>
<body>
    <h1>Diagram Evaluation Gallery</h1>
    <a href="gallery_sequence.html">Sequence Diagrams</a>
    <a href="gallery_class.html">Class Diagrams</a>
    <a href="gallery_deployment.html">Deployment Diagrams</a>
</body>
</html>`;
fs.writeFileSync("gallery.html", indexHtml);
console.log("All galleries generated.");
