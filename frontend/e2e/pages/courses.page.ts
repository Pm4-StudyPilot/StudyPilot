import { Page, Locator, expect } from '@playwright/test';

export class CoursesPage {
  readonly addCourseButton: Locator;

  constructor(private readonly page: Page) {
    this.addCourseButton = page.getByTestId('add-course-button');
  }

  async goto() {
    await this.page.goto('/courses');
    await expect(this.addCourseButton).toBeVisible();
    // Wait for the initial course list fetch to settle before interacting, so an
    // optimistic create isn't clobbered by the in-flight load. The subtitle is a
    // blank space while loading and resolves to "N of M course(s) shown".
    await expect(this.page.getByText(/of \d+ courses? shown/)).toBeVisible();
  }

  /** A course card located by its (unique) name. */
  card(name: string): Locator {
    return this.page.getByTestId('course-card').filter({ hasText: name });
  }

  async createCourse(name: string) {
    await this.addCourseButton.click();
    await this.page.getByLabel('Course Name').fill(name);
    await this.page.getByRole('button', { name: 'Create Course' }).click();
    await expect(this.card(name)).toBeVisible();
  }

  async rename(currentName: string, newName: string) {
    await this.card(currentName).getByTestId('course-edit-button').click();
    const nameField = this.page.getByLabel('Course Name');
    await nameField.fill(newName);
    await this.page.getByRole('button', { name: 'Save Changes' }).click();
  }

  async deleteCourse(name: string) {
    await this.card(name).getByTestId('course-delete-button').click();
    // Confirmation modal — the destructive button is labelled "Delete".
    await this.page.getByRole('button', { name: 'Delete', exact: true }).click();
  }

  async open(name: string) {
    await this.card(name).getByRole('link', { name }).click();
  }
}
