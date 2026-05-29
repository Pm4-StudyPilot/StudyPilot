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
}
