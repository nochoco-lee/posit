import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test_scripts/mermaid-flowchart-coverage.test.ts'],
  },
})
