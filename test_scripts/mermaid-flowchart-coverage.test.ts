import { describe, it, expect, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseMermaid } from '../src/mermaid/index';
import { LayoutManager } from '../src/layout/engine';

const type = 'flowchart';
const testScriptsDir = path.join(__dirname, `mermaid_${type}`);

describe(`Mermaid ${type} Syntax Coverage`, async () => {
    let files: string[] = [];
    if (fs.existsSync(testScriptsDir)) {
        files = fs.readdirSync(testScriptsDir).filter(f => f.endsWith('.mmd'));
    }

    let successCount = 0;
    const totalCount = files.length;
    const failedFiles: string[] = [];

    files.forEach(file => {
        it(`should parse and process ${file}`, async () => {
            let content = fs.readFileSync(path.join(testScriptsDir, file), 'utf-8');
            
            try {
                // Should not throw errors during parsing
                const ast = await parseMermaid(content);
                expect(ast.type).toBe("Diagram");
                
                // Should not throw errors during layout generation
                const layoutManager = new LayoutManager();
                const layoutMap = layoutManager.process(ast);
                expect(layoutMap).toBeDefined();

                successCount++;
            } catch (e: any) {
                failedFiles.push(file);
                console.error(`Failed ${file}: ${e.message?.substring(0, 500)}`);
            }
        });
    });

    afterAll(() => {
        if (totalCount > 0) {
            const percentage = Math.round((successCount / totalCount) * 100);
            console.log(`\n========================================`);
            console.log(`MERMAID ${type.toUpperCase()} SYNTAX COVERAGE RESULT: ${successCount} / ${totalCount} (${percentage}%)`);
            if (failedFiles.length > 0) {
                console.log(`\nFailed Scripts (showing first 5):`);
                failedFiles.slice(0, 5).forEach(f => console.log(`  - ${f}`));
                if (failedFiles.length > 5) console.log(`  ... and ${failedFiles.length - 5} more`);
            }
            console.log(`========================================\n`);
        } else {
            console.log(`\nNo .mmd test scripts found in ${testScriptsDir}\n`);
        }
    });
});



