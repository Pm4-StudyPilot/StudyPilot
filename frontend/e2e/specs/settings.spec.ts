import { test, expect } from '../fixtures/test';
import { E2E } from '../fixtures/env';

test.describe('Settings', () => {
  test('update the profile username', async ({ settingsPage }) => {
    const newName = `e2e_${Date.now().toString(36)}`;

    await settingsPage.goto();
    await settingsPage.updateUsername(newName);
    await expect(settingsPage.successAlert).toContainText('Profile updated successfully');

    // Revert so the shared E2E user's username stays stable for other specs.
    await settingsPage.updateUsername(E2E.username);
    await expect(settingsPage.successAlert).toBeVisible();
  });

  test('change-password rejects an incorrect current password', async ({ page }) => {
    await page.goto('/settings/password');
    await page.getByLabel('Current Password').fill('WrongCurrent123!');
    await page.getByLabel('New Password', { exact: true }).fill('NewValidPass123!');
    await page.getByLabel('Confirm New Password').fill('NewValidPass123!');
    await page.getByRole('button', { name: 'Change Password' }).click();

    await expect(page.getByText(/current password is incorrect/i)).toBeVisible();
  });
});
