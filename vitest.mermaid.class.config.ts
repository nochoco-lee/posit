import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test_scripts/mermaid-class-coverage.test.ts'],
  },
})
