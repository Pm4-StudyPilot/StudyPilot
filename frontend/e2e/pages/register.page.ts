import { Page, Locator, expect } from '@playwright/test';

export class RegisterPage {
  readonly username: Locator;
  readonly email: Locator;
  readonly password: Locator;
  readonly confirmPassword: Locator;
  readonly submit: Locator;

  constructor(private readonly page: Page) {
    this.username = page.getByLabel('Username');
    this.email = page.getByLabel('Email', { exact: true });
    this.password = page.getByLabel('Password', { exact: true });
    this.confirmPassword = page.getByLabel('Confirm Password');
    this.submit = page.getByRole('button', { name: 'Register', exact: true });
  }

  async goto() {
    await this.page.goto('/register');
    await expect(this.submit).toBeVisible();
  }

  async register(data: { username: string; email: string; password: string }) {
    await this.username.fill(data.username);
    await this.email.fill(data.email);
    await this.password.fill(data.password);
    await this.confirmPassword.fill(data.password);
    await this.submit.click();
  }
}
