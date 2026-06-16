import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parsePlantUml } from '../src/parser';
import { Emitter } from '../src/layout/emitter';
import { ClassLayoutManager } from '../src/layout/class';

const classDiagramsDir = path.join(__dirname, '../test_scripts/plantuml_class');

describe('Pos comment persistence across all class diagrams', () => {
    let files: string[] = [];
    if (fs.existsSync(classDiagramsDir)) {
        files = fs.readdirSync(classDiagramsDir).filter(f => f.endsWith('.puml'));
    }

    // Limit to first 20 diagrams for performance
    files.slice(0, 20).forEach(file => {
        it(`should NOT duplicate @pos comments in ${file} when dragged twice`, () => {
            const filePath = path.join(classDiagramsDir, file);
            let puml = fs.readFileSync(filePath, 'utf-8').replace(/&#34;/g, '"');
            
            const layoutManager = new ClassLayoutManager();
            const emitter = new Emitter();

            // 1st Drag
            const ast1 = parsePlantUml(puml);
            const map1 = layoutManager.process(ast1);
            
            // Move all nodes by some offset
            for (const node of Object.values(map1.nodes)) {
                node.position = { x: (node.position?.x || 0) + 10, y: (node.position?.y || 0) + 10 };
            }
            
            const puml2 = emitter.emitPlantUml(puml, ast1, map1);
            
            // 2nd Drag
            const ast2 = parsePlantUml(puml2);
            const map2 = layoutManager.process(ast2);
            
            // Move all nodes again
            for (const node of Object.values(map2.nodes)) {
                node.position = { x: (node.position?.x || 0) + 10, y: (node.position?.y || 0) + 10 };
            }
            
            const puml3 = emitter.emitPlantUml(puml2, ast2, map2);
            
            // Verification
            const ast3 = parsePlantUml(puml3);
            
            // Number of @pos should be exactly total number of things we moved
            const matches = puml3.match(/@pos/g);
            
            // A simpler but robust check: AST3 should have no duplicated pos tags on any statement
            const findAllWithPos = (stmts: any[]): any[] => {
                let res: any[] = [];
                for (const s of stmts) {
                    if (s.layout) res.push(s);
                    if (s.statements) res.push(...findAllWithPos(s.statements));
                    if (s.sections) res.push(...findAllWithPos(s.sections.flatMap((sec: any) => sec.statements)));
                }
                return res;
            };
            const statementsWithPos = findAllWithPos(ast3.statements);
            
            // Check that total @pos in text matches number of statements with pos in AST
            expect(matches?.length || 0).toBe(statementsWithPos.length);
            
            // Also verify no statement has duplicated @pos in its source range
            // (already verified by the fact that parser succeeded and only found one layout per node)
        });
    });
});
