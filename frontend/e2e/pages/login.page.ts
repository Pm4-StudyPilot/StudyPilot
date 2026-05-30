import { Page, Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly identifier: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly registerLink: Locator;
  readonly forgotLink: Locator;

  constructor(private readonly page: Page) {
    this.identifier = page.getByLabel('Email or Username');
    this.password = page.getByLabel('Password', { exact: true });
    this.submit = page.getByRole('button', { name: 'Login', exact: true });
    this.registerLink = page.getByRole('link', { name: /Register/ });
    this.forgotLink = page.getByRole('link', { name: /Forgot your password/ });
  }

  async goto() {
    await this.page.goto('/login');
    await expect(this.submit).toBeVisible();
  }

  async login(identifier: string, password: string) {
    await this.identifier.fill(identifier);
    await this.password.fill(password);
    await this.submit.click();
  }
}
