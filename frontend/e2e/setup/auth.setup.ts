import { test as setup, expect, request as playwrightRequest } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { E2E, BACKEND_URL, FRONTEND_URL, AUTH_FILE } from '../fixtures/env';

/**
 * Provisions the shared E2E user (idempotently) and snapshots a storageState
 * containing the JWT + user object in localStorage for the frontend origin —
 * mirroring exactly what AuthProvider writes on a real login. Browser specs
 * reuse this state so they start authenticated; the logged-out auth spec opts
 * out via an empty storageState.
 *
 * We seed via the API (no DB/backend changes) and write the storageState file
 * directly rather than driving a browser, which is faster and dependency-free.
 */
setup('authenticate e2e user', async () => {
  const ctx = await playwrightRequest.newContext({ baseURL: BACKEND_URL });
  const credentials = { identifier: E2E.email, password: E2E.password };

  let res = await ctx.post('/api/auth/login', { data: credentials });

  if (!res.ok()) {
    // User does not exist yet — register, then log in.
    const reg = await ctx.post('/api/auth/register', {
      data: { email: E2E.email, username: E2E.username, password: E2E.password },
    });
    expect(
      reg.ok() || reg.status() === 409,
      `register failed: ${reg.status()} ${await reg.text()}`
    ).toBeTruthy();
    res = await ctx.post('/api/auth/login', { data: credentials });
  }

  expect(res.ok(), `login failed: ${res.status()} ${await res.text()}`).toBeTruthy();
  const { token, user } = (await res.json()) as { token: string; user: unknown };
  await ctx.dispose();

  const storageState = {
    cookies: [],
    origins: [
      {
        origin: FRONTEND_URL,
        localStorage: [
          { name: 'token', value: token },
          { name: 'user', value: JSON.stringify(user) },
        ],
      },
    ],
  };

  mkdirSync(dirname(AUTH_FILE), { recursive: true });
  writeFileSync(AUTH_FILE, JSON.stringify(storageState, null, 2));
});
