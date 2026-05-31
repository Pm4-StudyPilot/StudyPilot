import { Page, Locator } from '@playwright/test';

/**
 * The authenticated dashboard shell: sidebar nav, topbar search, theme toggle,
 * language switcher, and logout. Shared across every authenticated page.
 */
export class AppShell {
  readonly dashboardLink: Locator;
  readonly coursesLink: Locator;
  readonly settingsLink: Locator;
  readonly logoutButton: Locator;
  readonly themeToggle: Locator;
  readonly languageTrigger: Locator;
  readonly searchInput: Locator;

  constructor(private readonly page: Page) {
    this.dashboardLink = page.getByRole('link', { name: 'Dashboard' });
    this.coursesLink = page.getByRole('link', { name: 'Courses' });
    this.settingsLink = page.getByRole('link', { name: 'Settings' }).first();
    this.logoutButton = page.getByRole('button', { name: 'Logout' });
    this.themeToggle = page.getByRole('button', { name: /Switch to (light|dark) mode/ });
    this.languageTrigger = page.getByRole('button', { name: 'Change language' });
    this.searchInput = page.locator('#dashboard-search');
  }

  async logout() {
    await this.logoutButton.click();
  }

  async toggleTheme() {
    await this.themeToggle.click();
  }

  /** Reads the current theme from the <html data-theme> attribute. */
  async currentTheme(): Promise<string | null> {
    return this.page.locator('html').getAttribute('data-theme');
  }

  async switchLanguage(label: 'English' | 'Deutsch') {
    await this.languageTrigger.click();
    await this.page.getByRole('option', { name: new RegExp(label) }).click();
  }

  async search(term: string) {
    await this.searchInput.fill(term);
  }
}
