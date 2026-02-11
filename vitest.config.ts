import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['**/*.d.ts', 'dist/**', 'bin/**', 'src/cli/index.ts', 'src/index.ts', 'src/types/**', 'vitest.config.ts'],
      thresholds: {
        lines: 91,
        statements: 91,
        functions: 92,
        branches: 70
      }
    }
  }
})
