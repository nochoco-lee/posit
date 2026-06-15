import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test_scripts/deployment-syntax-coverage.test.ts'],
  },
})
