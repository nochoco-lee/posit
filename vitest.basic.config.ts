import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: [
      'tests/parser.test.ts',
      'tests/detector.test.ts',
      'tests/layout.test.ts',
      'tests/emitter.test.ts',
      'tests/class-parser.test.ts',
      'tests/mermaid-parser.test.ts',
      'tests/deployment-layout.test.ts',
    ],
  },
})
