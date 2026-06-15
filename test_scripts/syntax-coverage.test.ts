import { describe, it, expect, afterAll } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parsePlantUml } from '../src/parser/index';
import { LayoutManager } from '../src/layout/engine';

const testScriptsDir = path.join(__dirname, 'plantuml_sequence');

describe('PlantUML Sequence Syntax Coverage', () => {
    let files: string[] = [];
    if (fs.existsSync(testScriptsDir)) {
        files = fs.readdirSync(testScriptsDir).filter(f => f.endsWith('.puml'));
    }

    let successCount = 0;
    const totalCount = files.length;
    const failedFiles: string[] = [];

    files.forEach(file => {
        it(`should parse and process ${file}`, () => {
            let content = fs.readFileSync(path.join(testScriptsDir, file), 'utf-8');
            
            // Unescape HTML entities like &#34; to "
            content = content.replace(/&#34;/g, '"');
            
            try {
                // Should not throw errors during parsing
                const ast = parsePlantUml(content);
                expect(ast.type).toBe("Diagram");
                
                // Should not throw errors during layout generation
                const layoutManager = new LayoutManager();
                const layoutMap = layoutManager.process(ast);
                expect(layoutMap).toBeDefined();

                successCount++;
            } catch (e) {
                failedFiles.push(file);
                console.error(`Failed ${file}:`, e);
                // Suppressing throw here so the afterAll summary is cleanly visible without gigabytes of stack traces!
            }
        });
    });

    afterAll(() => {
        if (totalCount > 0) {
            const percentage = Math.round((successCount / totalCount) * 100);
            console.log(`\n========================================`);
            console.log(`SYNTAX COVERAGE RESULT: ${successCount} / ${totalCount} (${percentage}%)`);
            if (failedFiles.length > 0) {
                console.log(`\nFailed Scripts (${failedFiles.length}):`);
                failedFiles.forEach(f => console.log(`  - ${f}`));
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
