import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test_scripts/class-syntax-coverage.test.ts'],
  },
})
