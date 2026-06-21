import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    reportCompressedSize: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Split heavy vendor libraries into separate cacheable chunks
          if (id.includes('node_modules/konva') || id.includes('node_modules/canvas-2d')) {
            return 'vendor-konva';
          }
          if (id.includes('node_modules/chevrotain')) {
            return 'vendor-chevrotain';
          }
        },
      },
    },
  },
  test: {
    // Chevrotain's performSelfAnalysis() on first dynamic import can take
    // several seconds in a cold Node.js process. 30s gives plenty of headroom.
    testTimeout: 30000,
    hookTimeout: 30000,
    // Pre-warm all parser bundles before any test runs so individual tests
    // don't pay the cold-start cost of performSelfAnalysis().
    globalSetup: ['./tests/setup.ts'],
  },
});
