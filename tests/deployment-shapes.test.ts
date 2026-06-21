
import { describe, it, expect } from "vitest";
import { DeploymentLayoutManager } from "../src/layout/deployment";
import { parsePlantUml } from "../src/parser/index";

describe("Deployment Diagram Shapes", async () => {
    it("should support folder, database, usecase, and card shapes", async () => {
        const input = `
@startuml
folder "My Folder" as f1
database "My DB" as d1
usecase "My UC" as u1
card "My Card" as c1
@enduml
`;
        const ir = await parsePlantUml(input);
        const layoutManager = new DeploymentLayoutManager();
        const layout = layoutManager.process(ir);

        expect(layout.nodes["f1"]).toBeDefined();
        expect(layout.nodes["f1"].type).toBe("folder");
        
        expect(layout.nodes["d1"]).toBeDefined();
        expect(layout.nodes["d1"].type).toBe("database");
        
        expect(layout.nodes["u1"]).toBeDefined();
        expect(layout.nodes["u1"].type).toBe("usecase");
        
        expect(layout.nodes["c1"]).toBeDefined();
        expect(layout.nodes["c1"].type).toBe("card");
    });
});



