import { defineConfig, devices } from '@playwright/test';

/**
 * E2E config for StudyPilot.
 *
 * The suite boots the real stack via `webServer` (the Express/Bun backend on
 * :3000 and the Vite dev server on :5173) in both local and CI runs, so the
 * boot path is identical everywhere. The Vite proxy (dev-only) forwards
 * `/api` and `/socket.io` to the backend, which is why we run the dev server
 * rather than `vite preview` (preview does not proxy).
 *
 * Auth: the `setup` project logs the E2E user in via the API and snapshots a
 * storageState containing the JWT in localStorage. Browser specs reuse it; the
 * logged-out auth spec opts out explicitly.
 */
const FRONTEND_URL = process.env.BASE_URL ?? 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['blob'], ['github']] : [['html'], ['list']],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: FRONTEND_URL,
    locale: 'en',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: 'chromium',
      testMatch: /specs\/.*\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
    },
  ],
  webServer: [
    {
      command: 'bun src/index.ts',
      cwd: '../backend',
      url: `${BACKEND_URL}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'npm run dev',
      url: FRONTEND_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
