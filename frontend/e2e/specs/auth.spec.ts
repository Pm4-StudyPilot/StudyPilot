import { test, expect } from '../fixtures/test';
import { E2E } from '../fixtures/env';

// These tests exercise the real, unauthenticated auth flow, so they opt out of
// the stored login state.
test.use({ storageState: { cookies: [], origins: [] } });

test('unauthenticated users are redirected to login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('button', { name: 'Login', exact: true })).toBeVisible();
});

test('a new user can register and lands on the dashboard', async ({ registerPage, page }) => {
  const unique = `${Date.now().toString(36)}`;
  await registerPage.goto();
  await registerPage.register({
    username: `e2e_reg_${unique}`,
    email: `e2e_reg_${unique}@studypilot.test`,
    password: E2E.password,
  });
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
});

test('an existing user can log in through the UI', async ({ loginPage, page }) => {
  await loginPage.goto();
  await loginPage.login(E2E.email, E2E.password);
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('link', { name: 'Courses' })).toBeVisible();
});

test('login with invalid credentials shows an error', async ({ loginPage, page }) => {
  await loginPage.goto();
  await loginPage.login(E2E.email, 'wrong-password-123');
  await expect(page.getByText(/Invalid credentials/i)).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test('a user can log out', async ({ loginPage, app, page }) => {
  await loginPage.goto();
  await loginPage.login(E2E.email, E2E.password);
  await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();

  await app.logout();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByRole('alert')).toContainText(/logged out/i);
});

test('forgot-password shows a confirmation message', async ({ page }) => {
  // Use an unregistered address: the backend returns the same generic message
  // either way (enumeration protection) but skips the email-send path, keeping
  // the test independent of the email provider.
  await page.goto('/forgot-password');
  await page.getByLabel('Email Address').fill(`nobody_${Date.now().toString(36)}@studypilot.test`);
  await page.getByRole('button', { name: 'Send Reset Link' }).click();
  await expect(page.getByRole('alert')).toContainText(/password reset link/i);
});
