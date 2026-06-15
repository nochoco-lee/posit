import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const testDirs = [
    { name: "Sequence Diagrams", path: "test_scripts/plantuml_sequence" },
    { name: "Class Diagrams", path: "test_scripts/plantuml_class" }
];
const localRenderDir = "local_renders";

// Ensure local render directory exists
if (!fs.existsSync(localRenderDir)) {
    fs.mkdirSync(localRenderDir);
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
    console.warn("Local PlantUML not found (tried 'plantuml' command and 'plantuml.jar'). 'Official' column will be empty.");
}

const testCases: any[] = [];

testDirs.forEach(dirInfo => {
    if (!fs.existsSync(dirInfo.path)) {
        console.warn(`Directory ${dirInfo.path} not found, skipping...`);
        return;
    }

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
        
        // Use a unique name for the PNG to avoid collisions between directories
        const pngName = `${dirInfo.name.replace(/\s+/g, '_')}_${file.replace(".puml", ".png")}`;
        const localPngPath = path.join(localRenderDir, pngName);

        if (hasLocalPlantUml) {
            try {
                // Render locally. PlantUML usually outputs to the same name as the file but with .png
                // We use -o to specify output dir, and -filename to control name if needed, 
                // but simpler to just rename after if needed.
                // However, plantuml command doesn't easily allow renaming the output file directly in one go with -o.
                // It will be file.png in localRenderDir.
                execSync(`${plantumlCmd} "${filePath}" -o "${path.resolve(localRenderDir)}"`, { stdio: 'ignore' });
                const defaultPngPath = path.join(localRenderDir, file.replace(".puml", ".png"));
                if (fs.existsSync(defaultPngPath) && defaultPngPath !== localPngPath) {
                    fs.renameSync(defaultPngPath, localPngPath);
                }
            } catch (e) {
                console.error(`Failed to render ${file} locally.`);
            }
        }

        testCases.push({
            category: dirInfo.name,
            name: file,
            source: content,
            localUrl: `./${localRenderDir}/${pngName}`
        });
    });
});

let galleryHtml = `<!DOCTYPE html>
<html>
<head>
    <title>PlantUML Evaluation Gallery (Local Render)</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        h1 { text-align: center; color: #333; }
        .category-header { 
            background: #333; 
            color: white; 
            padding: 10px 20px; 
            margin: 40px 0 20px 0; 
            border-radius: 4px;
            font-size: 1.5em;
        }
        .case { 
            background: white; 
            margin-bottom: 40px; 
            border-radius: 8px; 
            box-shadow: 0 4px 6px rgba(0,0,0,0.1); 
            overflow: hidden;
            display: flex;
            flex-direction: column;
        }
        .case-header { 
            background: #eee; 
            padding: 10px 20px; 
            font-weight: bold; 
            border-bottom: 1px solid #ddd;
            display: flex;
            justify-content: space-between;
        }
        .comparison-grid { 
            display: grid; 
            grid-template-columns: 1fr 1fr 1fr; 
            gap: 1px;
            background: #ddd;
        }
        .col { background: white; padding: 15px; display: flex; flex-direction: column; min-width: 0; }
        .col-header { font-size: 0.9em; color: #666; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
        .puml-source { 
            background: #272822; 
            color: #f8f8f2; 
            padding: 10px; 
            border-radius: 4px; 
            font-family: 'Consolas', 'Monaco', monospace; 
            font-size: 12px; 
            white-space: pre-wrap;
            flex-grow: 1;
            overflow: auto;
            max-height: 500px;
        }
        .img-container { text-align: center; flex-grow: 1; display: flex; align-items: center; justify-content: center; overflow: auto; min-height: 200px; border: 1px dashed #ccc; }
        .img-container img { max-width: 100%; height: auto; border: 1px solid #eee; }
        .canvas-container { 
            width: 100%; 
            height: 500px; 
            border: 1px solid #eee; 
            overflow: auto;
            position: relative;
        }
        .error { color: #d9534f; font-size: 14px; padding: 10px; background: #f2dede; border-radius: 4px; }
        .missing-info { color: #999; font-style: italic; }
    </style>
</head>
<body>
    <h1>PlantUML Evaluation Gallery (Local Render)</h1>
    <div id="gallery"></div>

    <script type="module">
        import { parsePlantUml } from "./src/parser/index.ts";
        import { LayoutManager } from "./src/layout/engine.ts";
        import { LayoutPumlRenderer } from "./src/renderer/renderer.ts";

        const gallery = document.getElementById('gallery');
        const testCases = ${JSON.stringify(testCases)};

        let currentCategory = "";

        async function createTestCase(testCase) {
            if (testCase.category !== currentCategory) {
                currentCategory = testCase.category;
                const catHeader = document.createElement('div');
                catHeader.className = 'category-header';
                catHeader.textContent = currentCategory;
                gallery.appendChild(catHeader);
            }

            const container = document.createElement('div');
            container.className = 'case';
            
            const safeId = 'canvas-' + testCase.category.replace(/\\s+/g, '_') + '-' + testCase.name.replace(/\\./g, '-');
            
            container.innerHTML = \`
                <div class="case-header">
                    <span>\${testCase.name}</span>
                </div>
                <div class="comparison-grid">
                    <div class="col">
                        <div class="col-header">1. PlantUML Source</div>
                        <div class="puml-source">\${testCase.source}</div>
                    </div>
                    <div class="col">
                        <div class="col-header">2. Official PlantUML (Local)</div>
                        <div class="img-container">
                            <img src="\${testCase.localUrl}" alt="No local render found" onerror="this.style.display='none'; this.parentElement.innerHTML='<span class=\\"missing-info\\">Local render missing (Java/PlantUML not found during generation)</span>'">
                        </div>
                    </div>
                    <div class="col">
                        <div class="col-header">3. Our Renderer</div>
                        <div id="\${safeId}" class="canvas-container"></div>
                    </div>
                </div>
            \`;
            
            gallery.appendChild(container);

            try {
                const ast = parsePlantUml(testCase.source);
                const layoutManager = new LayoutManager();
                const map = layoutManager.process(ast);
                
                const renderer = new LayoutPumlRenderer(safeId);
                const stage = renderer.stage;
                if (stage) {
                    stage.width(container.querySelector('.canvas-container').clientWidth);
                    stage.height(500);
                }
                renderer.render(map);
            } catch (e) {
                const canvasDiv = document.getElementById(safeId);
                canvasDiv.innerHTML = \`<div class="error"><strong>Error:</strong> \${e.message}</div>\`;
            }
        }

        for (const testCase of testCases) {
            await createTestCase(testCase);
        }
    </script>
</body>
</html>
`;

fs.writeFileSync("gallery.html", galleryHtml);
console.log("gallery.html generated with " + testCases.length + " test cases across " + testDirs.length + " categories.");
