import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test_scripts/syntax-coverage.test.ts'],
  },
})
