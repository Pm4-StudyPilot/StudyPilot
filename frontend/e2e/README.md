# StudyPilot E2E (Playwright)

End-to-end tests that boot the **real stack** (Postgres + MinIO + Express/Bun backend + Vite frontend) and drive the app in a real browser.

## Layout

```
e2e/
  setup/auth.setup.ts     # provisions the E2E user + writes storageState (runs once, before specs)
  fixtures/
    env.ts                # E2E creds + URLs (override via env vars)
    test.ts               # extended `test` with fixtures: api, factory, + page objects
    api.ts is inlined in test.ts (authed APIRequestContext)
    data-factory.ts       # creates/tears down test-owned data via the API
  pages/*.page.ts         # Page Objects (intent-level methods, stable locators)
  specs/*.spec.ts         # the suite
  fixtures-data/          # committed upload fixtures (e.g. sample.txt)
```

## Running locally

1. Start infra and prepare the DB (from the repo root):
   ```bash
   docker compose up -d postgres minio
   npm run db:migrate --workspace=backend
   npm run db:seed   --workspace=backend   # optional baseline data
   ```
2. Run the suite (from `frontend/`):
   ```bash
   npx playwright test            # headless
   npx playwright test --ui       # interactive
   npx playwright show-report     # open the HTML report
   ```

You do **not** need to start the servers yourself — `playwright.config.ts`'s `webServer`
boots the backend (`bun src/index.ts`) and the Vite **dev** server (port 5173) and reuses
them if already running. The dev server is used (not `vite preview`) because the Vite
proxy that forwards `/api` and `/socket.io` to the backend is dev-only.

## Auth & seeding

- `auth.setup.ts` logs the E2E user in via the API (registering it first if needed — fully
  idempotent, **no backend/DB changes**) and snapshots a `storageState` containing the JWT
  in `localStorage` under `token` (+ the user under `user`), mirroring what `AuthProvider`
  writes on a real login. All browser specs reuse it, so they start authenticated.
- `auth.spec.ts` opts out of the stored state to cover the real UI login/register/logout flow.
- Credentials default to `e2e@studypilot.test` / `E2ePassw0rd!23`; override with
  `E2E_USER`, `E2E_USERNAME`, `E2E_PASS`. The password must satisfy the backend policy
  (≥12 chars, upper/lower/number/special).
- Each mutating spec creates **uniquely-named** courses/tasks/quizzes through the
  `factory` fixture and deletes them on teardown (deleting a course cascades), so specs are
  isolated and safe to run in parallel even though they share one E2E user.

## Adding a test

1. Add data through the `factory` fixture (fast, deterministic) rather than the UI, unless
   the UI creation itself is what you're testing.
2. Prefer role/label/test-id locators via the relevant Page Object; add a Page Object method
   instead of inlining brittle selectors. If a control lacks a stable hook, add a minimal
   `data-testid` to the component (these are the only app-source changes the suite makes).
3. Use web-first assertions (`await expect(locator)...`) — never `waitForTimeout`.
4. Scope assertions to your unique names; never assert on global counts.

## How the AI flow is tested

- `ai-chat.spec.ts` **mocks** `POST /api/chat` with `page.route` and asserts the UI contract:
  the markdown reply renders, the collapsible "tools used" list reflects the returned
  `tools[]`, the `threadId` is reused across turns, and `pageContext` is attached only on the
  first message. It also checks `AiInputGuard` hides the assistant on non-allowed routes.
- `ai-live.smoke.spec.ts` hits the **real** TARS agent end-to-end but is gated with
  `test.skip(!process.env.GOOGLE_API_KEY)`, so CI without a key stays green. When a key is
  present it asserts only on structure (a reply, a create-course tool, and that the course
  actually exists), never on exact LLM text.

## CI

`.github/workflows/e2e.yml` stands up Postgres + MinIO, migrates + seeds, installs the
Chromium browser, and runs the suite **sharded** (4 shards). Each shard uploads a `blob`
report; the `merge-report` job merges them into a single downloadable HTML report
(`playwright-report` artifact). Traces/screenshots/videos for failures ride along in the report.
