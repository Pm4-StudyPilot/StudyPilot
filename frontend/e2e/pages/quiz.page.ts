import { Page, Locator, expect } from '@playwright/test';
import type { QuestionType } from '../fixtures/data-factory';

/** Quiz authoring (detail page, inline edit mode) + playthrough. */
export class QuizPage {
  constructor(private readonly page: Page) {}

  async gotoDetail(courseId: string, quizId: string) {
    await this.page.goto(`/courses/${courseId}/quizzes/${quizId}`);
  }

  async gotoPlay(courseId: string, quizId: string) {
    await this.page.goto(`/courses/${courseId}/quizzes/${quizId}/play`);
    // The play page fetches questions in a useEffect that React StrictMode runs
    // twice in dev; the second fetch re-initialises the answer history. Wait for
    // the network to settle so a selection click can't be clobbered by the
    // second fetch (a dev-only artifact — production has no StrictMode).
    await this.page.waitForLoadState('networkidle');
  }

  // ---- Authoring ----
  // The button renders an icon + "Edit", so its accessible name has a leading
  // space — match by substring (not exact).
  get editToggle(): Locator {
    return this.page.getByRole('button', { name: 'Edit' });
  }

  get playLink(): Locator {
    return this.page.getByRole('link', { name: 'Play' });
  }

  async enterEditMode() {
    await this.editToggle.click();
    await expect(this.page.getByTestId('new-question-form')).toBeVisible();
  }

  async addQuestion(opts: { title: string; type: QuestionType; description?: string }) {
    const form = this.page.getByTestId('new-question-form');
    await form.getByLabel('Question title').fill(opts.title);
    if (opts.description) await form.getByLabel('Description').fill(opts.description);
    await form.getByLabel('Question type').selectOption(opts.type);
    await form.getByTestId('add-question-button').click();
    await expect(this.questionCard(opts.title)).toBeVisible();
  }

  // In edit mode the title sits in an <input value>, which is not matched by
  // hasText — locate by the data-question-title attribute on the card instead.
  questionCard(title: string): Locator {
    return this.page.locator(
      `[data-testid="question-editor-card"][data-question-title="${title}"]`
    );
  }

  async addAnswer(questionTitle: string, opts: { content: string; correct?: boolean }) {
    const card = this.questionCard(questionTitle);
    const input = card.getByTestId('answer-content-input');
    // The field must start empty (the app clears it after a successful add);
    // wait for that so consecutive adds don't concatenate.
    await expect(input).toHaveValue('');
    // Type via real keystrokes (fill() does not reliably trigger this controlled
    // input's onChange). Retry the clear+type so a mid-type re-render can't leave
    // a partial value.
    await expect(async () => {
      await input.click();
      await input.press('ControlOrMeta+a');
      await input.press('Backspace');
      await input.pressSequentially(opts.content);
      await expect(input).toHaveValue(opts.content);
    }).toPass();
    if (opts.correct) await card.getByLabel('Correct', { exact: true }).check();
    const addButton = card.getByTestId('add-answer-button');
    await expect(addButton).toBeEnabled();
    await addButton.click();
    // Wait for the field to clear, confirming the add committed.
    await expect(input).toHaveValue('');
  }

  // ---- Playthrough ----
  get progress(): Locator {
    return this.page.locator('.play-quiz__progress');
  }

  answer(content: string): Locator {
    return this.page.getByRole('button', { name: content });
  }

  get revealButton(): Locator {
    return this.page.getByRole('button', { name: 'Reveal answer' });
  }

  get nextButton(): Locator {
    return this.page.getByRole('button', { name: 'Next question' });
  }

  get viewStatsButton(): Locator {
    return this.page.getByRole('button', { name: 'View Stats' });
  }

  get finishButton(): Locator {
    return this.page.getByRole('button', { name: 'Finish' });
  }

  cardEvalButton(correct: boolean): Locator {
    return this.page.getByRole('button', { name: correct ? 'Correct' : 'Incorrect', exact: true });
  }

  get resultSummary(): Locator {
    return this.page.getByText(/You got .* Points/);
  }
}
