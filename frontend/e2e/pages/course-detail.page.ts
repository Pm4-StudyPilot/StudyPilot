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
   * Drags a task (by title) to the bottom of the list via its drag handle.
   * dnd-kit's PointerSensor is RAF-based and finicky in headless browsers, so
   * we: press on the handle, nudge to activate the sensor, assert the card
   * entered the dragging state (a real wait + diagnostic), then move down past
   * the last card in many small steps before releasing.
   */
  async dragTaskToLast(title: string) {
    const dragged = this.taskCard(title);
    const handle = dragged.getByTestId('task-drag-handle');
    const cards = this.page.getByTestId('task-card');

    const hb = await handle.boundingBox();
    const lastBox = await cards.last().boundingBox();
    if (!hb || !lastBox) throw new Error('drag boxes not found');

    const x = hb.x + hb.width / 2;
    const startY = hb.y + hb.height / 2;
    const endY = lastBox.y + lastBox.height + 24;

    await this.page.mouse.move(x, startY);
    await this.page.mouse.down();
    // Nudge past dnd-kit's activation threshold, then confirm the drag started.
    await this.page.mouse.move(x, startY + 8, { steps: 6 });
    await expect(dragged).toHaveClass(/opacity-50/);
    // Move down through the list in many small increments, then settle below.
    await this.page.mouse.move(x, endY, { steps: 25 });
    await this.page.mouse.move(x, endY + 4, { steps: 4 });
    await this.page.mouse.up();
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
