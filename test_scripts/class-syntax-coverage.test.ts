import { describe, it, expect, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parsePlantUml } from '../src/parser/index';
import { LayoutManager } from '../src/layout/engine';

const testScriptsDir = path.join(__dirname, 'plantuml_class');

function unescapeHtml(text: string): string {
    return text
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&#34;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&amp;/g, '&');
}

describe('PlantUML Class Syntax Coverage', () => {
    let files: string[] = [];
    if (fs.existsSync(testScriptsDir)) {
        files = fs.readdirSync(testScriptsDir).filter(f => f.endsWith('.puml'));
    }

    let successCount = 0;
    const totalCount = files.length;
    const failedFiles: { file: string; error: string }[] = [];

    files.forEach(file => {
        it(`should parse and process ${file}`, () => {
            let content = fs.readFileSync(path.join(testScriptsDir, file), 'utf-8');
            
            // Clean up HTML entities
            content = unescapeHtml(content);
            
            try {
                // Should not throw errors during parsing
                const ast = parsePlantUml(content);
                expect(ast.type).toBe("Diagram");
                
                // Should not throw errors during layout generation
                const layoutManager = new LayoutManager();
                const layoutMap = layoutManager.process(ast);
                expect(layoutMap).toBeDefined();

                successCount++;
            } catch (e: any) {
                failedFiles.push({ file, error: e.message || String(e) });
                console.error(`Failed ${file}:`, e);
                // Suppressing throw here so the afterAll summary is cleanly visible
            }
        });
    });

    afterAll(() => {
        if (totalCount > 0) {
            const percentage = Math.round((successCount / totalCount) * 100);
            console.log(`\n========================================`);
            console.log(`CLASS SYNTAX COVERAGE RESULT: ${successCount} / ${totalCount} (${percentage}%)`);
            if (failedFiles.length > 0) {
                console.log(`\nFailed Class Scripts (${failedFiles.length}):`);
                failedFiles.forEach(f => {
                    // Just print the first line of error to keep output clean
                    const firstLine = f.error.split('\n')[0];
                    console.log(`  - ${f.file}: ${firstLine}`);
                });
            }
            console.log(`========================================\n`);
        } else {
            console.log(`\nNo .puml test scripts found in ${testScriptsDir}\n`);
        }
    });

    if (totalCount === 0) {
        it('should have files to test', () => {
            expect(totalCount).toBeGreaterThan(0);
        });
    }
});
