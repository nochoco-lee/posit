import { parsePlantUml } from "./src/parser/index";
import { LayoutManager } from "./src/layout/engine";

const input = `
@startuml
Alice -> Bob: Authentication Request
Bob --> Alice: Authentication Response

Alice -> Bob: Another authentication Request
Alice <-- Bob: Another authentication Response
@enduml
`;

const ast = parsePlantUml(input);
const layoutManager = new LayoutManager();
const map = layoutManager.process(ast);

console.log("Connections:");
map.connections.forEach((conn, i) => {
    console.log(`${i}: ${conn.from} --(${conn.type})--> ${conn.to} at Y=${conn.calculatedY}`);
});

const nodeAlice = map.nodes["Alice"];
const nodeBob = map.nodes["Bob"];
console.log("\nNodes:");
console.log(`Alice: x=${nodeAlice.position.x}`);
console.log(`Bob: x=${nodeBob.position.x}`);
