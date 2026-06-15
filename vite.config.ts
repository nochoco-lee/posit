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
});
