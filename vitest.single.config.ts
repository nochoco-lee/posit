import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: [
      'tests/mermaid-parser.test.ts',
      'tests/deployment-layout.test.ts',
    ],
    testTimeout: 120000,
    hookTimeout: 120000,
  },
})
