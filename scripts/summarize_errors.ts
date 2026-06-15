import fs from "fs";

const html = fs.readFileSync("gallery.html", "utf-8");
const cases = html.split('<div class="case">').slice(1);

cases.forEach(c => {
    const nameMatch = c.match(/<span>(.*?)<\/span>/);
    const errorMatch = c.match(/<div class="error"><strong>Error:<\/strong> ([\s\S]*?)<\/div>/);
    if (errorMatch) {
        console.log(`${nameMatch ? nameMatch[1] : "Unknown"}: ${errorMatch[1]}`);
    }
});
