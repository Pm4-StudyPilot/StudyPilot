/**
 * Shared E2E configuration. The credentials default to a dedicated test user
 * that `auth.setup.ts` provisions via the API (idempotent). Override via env
 * vars in CI. The password satisfies the backend policy (>=12 chars, upper,
 * lower, number, special).
 */
export const E2E = {
  email: process.env.E2E_USER ?? 'e2e@studypilot.test',
  username: process.env.E2E_USERNAME ?? 'e2e_user',
  password: process.env.E2E_PASS ?? 'E2ePassw0rd!23',
};

export const FRONTEND_URL = process.env.BASE_URL ?? 'http://localhost:5173';
export const BACKEND_URL = process.env.BACKEND_URL ?? 'http://localhost:3000';
export const API_URL = `${BACKEND_URL}/api`;

/** Storage state file holding the authenticated E2E user's JWT in localStorage. */
export const AUTH_FILE = 'playwright/.auth/user.json';
