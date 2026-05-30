import { test, expect } from '../fixtures/test';
import { auditPage } from './audit';

// All audits share one fixed remote-debugging port (9222), so they must run one
// at a time. Keeping them in a single serial file pins them to one worker
// regardless of the configured worker count.
test.describe.configure({ mode: 'serial' });

test.describe('Lighthouse · authenticated routes', () => {
  test('home dashboard', async ({ page, app }) => {
    await page.goto('/');
    await expect(app.coursesLink).toBeVisible();
    await auditPage(page, 'home');
  });

  test('courses', async ({ page, coursesPage }) => {
    await coursesPage.goto();
    await auditPage(page, 'courses');
  });

  test('settings', async ({ page, settingsPage }) => {
    await settingsPage.goto();
    await auditPage(page, 'settings');
  });
});

test.describe('Lighthouse · public routes', () => {
  // Audit the login page logged out, so the authenticated storageState doesn't
  // redirect /login -> /.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('login', async ({ page, loginPage }) => {
    await loginPage.goto();
    await auditPage(page, 'login');
  });
});
