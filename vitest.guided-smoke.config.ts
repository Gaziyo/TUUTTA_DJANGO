import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['src/services/__tests__/guided.smoke.test.ts'],
    setupFiles: [],
    css: false
  }
});

