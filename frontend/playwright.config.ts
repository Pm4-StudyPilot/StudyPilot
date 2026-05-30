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

// When set, an external stack is already serving the app (e.g. the prod Docker
// image in the lighthouse-perf workflow), so we don't boot the dev servers and
// instead audit BASE_URL/BACKEND_URL directly.
const EXTERNAL_SERVER = !!process.env.PW_EXTERNAL_SERVER;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['github']]
    : [['html', { open: 'never' }], ['list']],
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
    {
      // Lighthouse audits with category thresholds (see e2e/lighthouse/audit.ts).
      // playwright-lighthouse attaches to Chromium over CDP, so this project must
      // launch with a fixed remote-debugging port. The flag is scoped here, so the
      // functional `chromium` project is unaffected.
      name: 'lighthouse',
      testMatch: /lighthouse\/.*\.lh\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
        launchOptions: { args: ['--remote-debugging-port=9222'] },
      },
      dependencies: ['setup'],
    },
  ],
  webServer: EXTERNAL_SERVER
    ? undefined
    : [
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
