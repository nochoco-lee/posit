import fs from "fs";
import path from "path";

const galleryFiles = ["gallery_sequence.html", "gallery_class.html", "gallery_deployment.html"];

galleryFiles.forEach(file => {
    if (!fs.existsSync(file)) {
        console.warn(`File not found: ${file}`);
        return;
    }
    console.log(`\n--- Errors in ${file} ---`);
    const html = fs.readFileSync(file, "utf-8");
    const cases = html.split('<div class="case">').slice(1);

    cases.forEach(c => {
        const nameMatch = c.match(/<span>(.*?)<\/span>/);
        const errorMatch = c.match(/<div class="error"><strong>Error:<\/strong> ([\s\S]*?)<\/div>/);
        if (errorMatch) {
            console.log(`${nameMatch ? nameMatch[1] : "Unknown"}: ${errorMatch[1].trim()}`);
        }
    });
});
