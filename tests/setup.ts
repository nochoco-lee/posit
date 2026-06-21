/**
 * Global test setup: pre-warms all parser bundles before any test runs.
 *
 * Chevrotain's performSelfAnalysis() is expensive on first instantiation.
 * By importing all parser modules here (in the global setup), each module is
 * cached by Node's module system, so individual tests don't pay the cold-start
 * cost on their first parsePlantUml() / parseMermaid() call.
 */

// Pre-import all bundles in parallel — module caching means performSelfAnalysis()
// runs only once per worker process regardless of how many tests use it.
await Promise.all([
    import('../src/parser/sequence/lexer'),
    import('../src/parser/sequence/parser'),
    import('../src/parser/sequence/visitor'),
    import('../src/parser/class/lexer'),
    import('../src/parser/class/parser'),
    import('../src/parser/class/visitor'),
    import('../src/parser/deployment/lexer'),
    import('../src/parser/deployment/parser'),
    import('../src/parser/deployment/visitor'),
    import('../src/mermaid/lexer'),
    import('../src/mermaid/parser'),
    import('../src/mermaid/visitor'),
]);
