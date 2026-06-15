import * as fs from 'fs';
import * as path from 'path';
import { parsePlantUml } from '../src/parser/index';

const diagrams = [
    'diagram_23.puml', 'diagram_24.puml', 'diagram_25.puml',
    'diagram_30.puml', 'diagram_31.puml', 'diagram_32.puml', 'diagram_33.puml', 'diagram_34.puml',
    'diagram_36.puml', 'diagram_37.puml', 'diagram_39.puml',
    'diagram_4.puml', 'diagram_5.puml', 'diagram_51.puml', 'diagram_53.puml', 'diagram_55.puml',
    'diagram_58.puml', 'diagram_8.puml', 'diagram_84.puml', 'diagram_85.puml', 'diagram_86.puml', 'diagram_87.puml'
];

const dirs = ['test_scripts/plantuml_sequence', 'test_scripts/plantuml_class'];

console.log('Verifying issues from issues_list.md...\n');

diagrams.forEach(diag => {
    let content = '';
    let found = false;
    for (const dir of dirs) {
        const filePath = path.join(dir, diag);
        if (fs.existsSync(filePath)) {
            content = fs.readFileSync(filePath, 'utf-8');
            found = true;
            break;
        }
    }

    if (!found) {
        console.log(`[ ] ${diag}: NOT FOUND`);
        return;
    }

    try {
        parsePlantUml(content);
        console.log(`[X] ${diag}: PASSED`);
    } catch (e: any) {
        console.log(`[ ] ${diag}: FAILED - ${e.message.split('\n')[0]}`);
    }
});
