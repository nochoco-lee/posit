import { describe, it, expect } from 'vitest';
import { parsePlantUml } from '../src/parser';
import { Emitter } from '../src/layout/emitter';
import { SequenceLayoutManager } from '../src/layout/sequence';
import { ClassLayoutManager } from '../src/layout/class';
import { DeploymentLayoutManager } from '../src/layout/deployment';

describe('Harden @pos injection', async () => {
    it('should NOT split words when injecting @pos', async () => {
        const puml = `@startuml
Alice -> Bob : Hello
@enduml`;
        const ast = await parsePlantUml(puml);
        const layoutManager = new SequenceLayoutManager();
        const map = layoutManager.process(ast);
        
        // Move the connection
        map.connections[0].position = { x: 100, y: 100 };
        
        const emitter = new Emitter();
        const updatedPuml = emitter.emitPlantUml(puml, ast, map);
        
        console.log('Updated PUML (Sequence):\n', updatedPuml);
        
        expect(updatedPuml).toContain(": Hello /' @pos");
        expect(updatedPuml).not.toContain("Hell /' @pos");
        expect(updatedPuml).toContain("Hello");
    });

    it('should NOT split words in class declarations', async () => {
        const puml = `@startuml
class User {
  String name
  void login()
}
@enduml`;
        const ast = await parsePlantUml(puml);
        const layoutManager = new ClassLayoutManager();
        const map = layoutManager.process(ast);
        
        map.nodes['User'].position = { x: 50, y: 50 };
        
        const emitter = new Emitter();
        const updatedPuml = emitter.emitPlantUml(puml, ast, map);
        
        console.log('Updated PUML (Class):\n', updatedPuml);
        
        // Emitter might append at the end of the statement before the closing brace if the brace is on the same line,
        // but here it's multiline.
        expect(updatedPuml).toContain("class User");
        expect(updatedPuml).toContain("/' @pos(50, 50) '/");
        expect(updatedPuml).not.toContain("Us /' @pos");
    });

    it('should NOT split words in deployment nodes', async () => {
        const puml = `@startuml
node "Application Server" as App
@enduml`;
        const ast = await parsePlantUml(puml);
        const layoutManager = new DeploymentLayoutManager();
        const map = layoutManager.process(ast);
        
        map.nodes['App'].position = { x: 200, y: 200 };
        
        const emitter = new Emitter();
        const updatedPuml = emitter.emitPlantUml(puml, ast, map);
        
        console.log('Updated PUML (Deployment):\n', updatedPuml);
        
        expect(updatedPuml).toContain('node "Application Server" as App /\' @pos(200, 200) \'/');
        expect(updatedPuml).not.toContain("Ap /' @pos");
    });
});



