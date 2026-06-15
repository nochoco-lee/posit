import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { parsePlantUml } from "./src/parser/index";
import { LayoutManager } from "./src/layout/engine";
import { LayoutPumlSvgRenderer } from "./src/renderer/svg_renderer";

const testDirs = [
    { name: "Sequence Diagrams", path: "test_scripts/plantuml_sequence" },
    { name: "Class Diagrams", path: "test_scripts/plantuml_class" }
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

const testCases: any[] = [];
const svgRenderer = new LayoutPumlSvgRenderer();

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
        
        const baseName = `${dirInfo.name.replace(/\s+/g, '_')}_${file.replace(".puml", "")}`;
        const officialPngName = `${baseName}_official.png`;
        const ourSvgName = `${baseName}_our.svg`;
        
        const localOfficialPath = path.join(localRenderDir, officialPngName);
        const localOurPath = path.join(ourRenderDir, ourSvgName);

        // 1. Official Render
        if (hasLocalPlantUml) {
            try {
                execSync(`${plantumlCmd} "${filePath}" -o "${path.resolve(localRenderDir)}"`, { stdio: 'ignore' });
                const defaultPngPath = path.join(localRenderDir, file.replace(".puml", ".png"));
                if (fs.existsSync(defaultPngPath)) {
                    fs.renameSync(defaultPngPath, localOfficialPath);
                }
            } catch (e) {
                // console.error(`Failed to render ${file} locally.`);
            }
        }

        // 2. Our Render (SVG)
        let ourRenderUrl = "";
        let error = "";
        try {
            const ast = parsePlantUml(content);
            const layoutManager = new LayoutManager();
            const map = layoutManager.process(ast);
            const svg = svgRenderer.render(map);
            fs.writeFileSync(localOurPath, svg);
            ourRenderUrl = `./${localRenderDir}/our_renders/${ourSvgName}`;
        } catch (e: any) {
            error = e.message;
        }

        testCases.push({
            category: dirInfo.name,
            name: file,
            source: content,
            officialUrl: hasLocalPlantUml && fs.existsSync(localOfficialPath) ? `./${localRenderDir}/${officialPngName}` : "",
            ourUrl: ourRenderUrl,
            error: error
        });
    });
});

let casesHtml = "";
let currentCategory = "";

testCases.forEach(testCase => {
    if (testCase.category !== currentCategory) {
        currentCategory = testCase.category;
        casesHtml += `<div class="category-header">${currentCategory}</div>`;
    }

    casesHtml += `
        <div class="case">
            <div class="case-header">
                <span>${testCase.name}</span>
            </div>
            <div class="comparison-grid">
                <div class="col">
                    <div class="col-header">1. PlantUML Source</div>
                    <div class="puml-source">${testCase.source.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
                </div>
                <div class="col">
                    <div class="col-header">2. Official PlantUML</div>
                    <div class="img-container">
                        ${testCase.officialUrl ? `<img src="${testCase.officialUrl}" alt="Official Render">` : '<span class="missing-info">No official render</span>'}
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

let galleryHtml = `<!DOCTYPE html>
<html>
<head>
    <title>PlantUML Evaluation Gallery</title>
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
        .error { color: #d9534f; font-size: 14px; padding: 10px; background: #f2dede; border-radius: 4px; }
        .missing-info { color: #999; font-style: italic; }
    </style>
</head>
<body>
    <h1>PlantUML Evaluation Gallery</h1>
    <div id="gallery">
        ${casesHtml}
    </div>
</body>
</html>
`;

fs.writeFileSync("gallery.html", galleryHtml);
console.log("gallery.html generated with " + testCases.length + " test cases across " + testDirs.length + " categories.");
