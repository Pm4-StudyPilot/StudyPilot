import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    // Only run unit/component tests under src/. The Playwright E2E specs in
    // e2e/ use the Playwright runner and must not be picked up by Vitest's
    // default *.spec.ts glob.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    // Keep the per-test timeout comfortably above the 5s async query timeout
    // configured in setup.ts so a slow CI render cannot trip the test timeout.
    testTimeout: 15000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'json-summary'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/test/**', 'src/main.tsx'],
      enabled: process.env.COVERAGE === 'true',
    },
  },
});
