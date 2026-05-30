import { test, expect } from '../fixtures/test';

test.describe('Theme & i18n', () => {
  test('theme toggle persists across reload', async ({ app, page }) => {
    await page.goto('/');
    const before = await app.currentTheme();

    await app.toggleTheme();
    await expect(page.locator('html')).not.toHaveAttribute('data-theme', before ?? '');
    const after = await app.currentTheme();

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', after ?? '');
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe(after);
  });

  test('language switch swaps the UI namespace', async ({ app, page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();

    await app.switchLanguage('Deutsch');

    // German strings from the common namespace.
    await expect(page.getByRole('link', { name: 'Übersicht' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Kurse' })).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('studypilot.lang'))).toBe('de');
  });
});
