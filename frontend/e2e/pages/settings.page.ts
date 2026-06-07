import { Page, Locator, expect } from '@playwright/test';

export class SettingsPage {
  readonly username: Locator;
  readonly email: Locator;
  readonly saveProfile: Locator;
  readonly successAlert: Locator;
  readonly changePasswordButton: Locator;

  constructor(private readonly page: Page) {
    this.username = page.getByLabel('Username');
    this.email = page.getByLabel('Email', { exact: true });
    this.saveProfile = page.getByRole('button', { name: 'Save Profile' });
    this.successAlert = page.getByRole('alert');
    this.changePasswordButton = page.getByRole('button', { name: 'Change Password' });
  }

  async goto() {
    await this.page.goto('/settings');
    await expect(this.saveProfile).toBeVisible();
  }

  async updateUsername(newName: string) {
    await this.username.fill(newName);
    await this.saveProfile.click();
  }
}
