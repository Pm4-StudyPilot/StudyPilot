import { Page, Locator, expect } from '@playwright/test';

export class CourseDetailPage {
  readonly addTaskButton: Locator;
  readonly addQuizButton: Locator;
  readonly uploadInput: Locator;

  constructor(private readonly page: Page) {
    this.addTaskButton = page.getByRole('button', { name: 'Add task' });
    this.addQuizButton = page.getByRole('button', { name: 'Add quiz' });
    this.uploadInput = page.getByTestId('document-upload-input');
  }

  async goto(courseId: string) {
    await this.page.goto(`/courses/${courseId}`);
    await expect(this.addTaskButton).toBeVisible();
    // Wait for the tasks fetch to settle (empty-state text or at least one card)
    // so optimistic creates aren't clobbered by the in-flight load.
    await expect(
      this.page
        .getByText('No tasks yet. Add one to get started.')
        .or(this.page.getByTestId('task-card').first())
    ).toBeVisible();
  }

  private modal(): Locator {
    return this.page.getByTestId('modal-backdrop');
  }

  async createTask(opts: {
    title: string;
    description?: string;
    dueDate?: string;
    priority?: string;
  }) {
    await this.addTaskButton.click();
    const modal = this.modal();
    await modal.getByLabel('Title').fill(opts.title);
    if (opts.description) await modal.getByLabel('Description').fill(opts.description);
    if (opts.dueDate) await modal.getByLabel('Due Date').fill(opts.dueDate);
    if (opts.priority) await modal.getByLabel('Priority').selectOption(opts.priority);
    await modal.getByRole('button', { name: 'Create Task' }).click();
    await expect(this.taskCard(opts.title)).toBeVisible();
  }

  taskCard(title: string): Locator {
    return this.page.getByTestId('task-card').filter({ hasText: title });
  }

  async editTaskStatus(title: string, status: 'Open' | 'In Progress' | 'Done') {
    await this.taskCard(title).getByTestId('task-edit-button').click();
    const modal = this.modal();
    await modal.getByLabel('Status').selectOption({ label: status });
    await modal.getByRole('button', { name: 'Save Changes' }).click();
  }

  async deleteTask(title: string) {
    await this.taskCard(title).getByTestId('task-delete-button').click();
    await this.page.getByRole('button', { name: 'Delete', exact: true }).click();
  }

  async createQuiz(opts: { title: string; randomOrder?: boolean }) {
    await this.addQuizButton.click();
    const modal = this.modal();
    await modal.getByLabel('Title').fill(opts.title);
    if (opts.randomOrder) await modal.getByLabel('Random question order').check();
    await modal.getByRole('button', { name: 'Create Quiz' }).click();
  }

  /**
   * Reorders a task (by title) to the bottom of the list using dnd-kit's
   * keyboard sensor: focus the drag handle, Space to pick up, Arrow Down for
   * each remaining position, Space to drop. Keyboard drag is deterministic
   * across environments, unlike synthetic pointer drag which dnd-kit's
   * PointerSensor does not reliably activate under headless CI.
   */
  async dragTaskToLast(title: string) {
    const count = await this.page.getByTestId('task-card').count();
    const card = this.taskCard(title);
    const handle = card.getByTestId('task-drag-handle');

    // press() focuses the handle then sends the key; Space picks the item up.
    await handle.press('Space');
    await expect(card).toHaveClass(/opacity-50/); // confirm it was picked up
    // dnd-kit attaches its keyboard move/end listener a tick after activation
    // (no observable DOM signal for it), so pace the keys with a short settle.
    for (let i = 0; i < count - 1; i += 1) {
      await this.page.waitForTimeout(150);
      await this.page.keyboard.press('ArrowDown');
    }
    await this.page.waitForTimeout(150);
    await this.page.keyboard.press('Space'); // drop
    await expect(card).not.toHaveClass(/opacity-50/); // confirm it was dropped
  }

  /** Drag-handle ordering: list of task titles in current DOM order. */
  async taskTitlesInOrder(): Promise<string[]> {
    const handles = this.page.getByTestId('task-card');
    const count = await handles.count();
    const titles: string[] = [];
    for (let i = 0; i < count; i += 1) {
      // The toggle button holds the title text.
      titles.push((await handles.nth(i).locator('.fw-semibold').first().innerText()).trim());
    }
    return titles;
  }

  // ---- Documents ----
  documentItem(filename: string): Locator {
    return this.page.getByTestId('document-item').filter({ has: this.page.getByText(filename) });
  }

  async uploadDocument(filePayload: { name: string; mimeType: string; buffer: Buffer }) {
    await this.uploadInput.setInputFiles(filePayload);
  }

  async sortDocumentsBy(label: 'Newest' | 'Name' | 'Type' | 'Size') {
    await this.page.getByRole('button', { name: label, exact: true }).click();
  }

  async deleteDocument(filename: string) {
    await this.documentItem(filename).getByTestId('document-delete-button').click();
    await this.page.getByRole('button', { name: 'Delete', exact: true }).click();
  }

  // ---- Sharing ----
  async openShareModal() {
    // Look for Share button in the course header
    await this.page
      .getByRole('button', { name: /share|Share/i })
      .first()
      .click();
    await expect(this.page.getByTestId('share-course-modal')).toBeVisible();
  }

  async shareWithUser(username: string) {
    await this.page.getByLabel(/username|email/i).fill(username);
    await this.page.getByRole('button', { name: /share|Submit/i }).click();
  }

  async getShareSuccessMessage(): Promise<string> {
    const message = this.page
      .getByRole('alert')
      .or(this.page.getByText(/shared successfully|success/i));
    await expect(message).toBeVisible();
    return await message.innerText();
  }

  async getShareErrorMessage(): Promise<string> {
    const error = this.page.getByRole('alert').or(this.page.locator('[role="status"]'));
    await expect(error).toBeVisible();
    return await error.innerText();
  }

  async shareFormInput(): Locator {
    return this.page.getByLabel(/username|email/i);
  }

  async shareSubmitButton(): Locator {
    return this.page.getByRole('button', { name: /share|submit/i });
  }
}
