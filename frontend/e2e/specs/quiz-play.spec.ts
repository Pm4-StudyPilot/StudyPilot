import { test, expect } from '../fixtures/test';

test.describe('Quiz play', () => {
  test('playing a quiz scores correct answers across all question types', async ({
    factory,
    quizPage,
    page,
  }) => {
    const course = await factory.createCourse();
    const { quiz } = await factory.createQuizWithQuestions(
      course.id,
      [
        {
          title: 'Single choice question',
          type: 'SINGLE_CHOICE',
          answers: [
            { content: 'S-correct', isCorrect: true },
            { content: 'S-wrong', isCorrect: false },
          ],
        },
        {
          title: 'Multiple choice question',
          type: 'MULTIPLE_CHOICE',
          answers: [
            { content: 'M-correct-1', isCorrect: true },
            { content: 'M-correct-2', isCorrect: true },
            { content: 'M-wrong', isCorrect: false },
          ],
        },
        {
          title: 'Card question',
          type: 'CARD',
          answers: [{ content: 'C-answer', isCorrect: false }],
        },
      ],
      { isOrderRandom: false }
    );

    await quizPage.gotoPlay(course.id, quiz.id);
    await expect(quizPage.progress).toContainText('1 / 3');

    // Q1 SINGLE_CHOICE: selecting an answer auto-reveals. Confirm exactly one
    // answer is selected (guards against a double-toggle) before advancing.
    await quizPage.answer('S-correct').click();
    await expect(page.locator('.answer-card--selected')).toHaveCount(1);
    await expect(quizPage.nextButton).toBeVisible();
    await quizPage.nextButton.click();
    await expect(quizPage.progress).toContainText('2 / 3');

    // Q2 MULTIPLE_CHOICE: select both correct answers (confirm each registers),
    // then reveal and advance.
    const m1 = quizPage.answer('M-correct-1');
    await m1.click();
    await expect(m1).toHaveClass(/answer-card--selected/);
    const m2 = quizPage.answer('M-correct-2');
    await m2.click();
    await expect(m2).toHaveClass(/answer-card--selected/);
    await quizPage.revealButton.click();
    await expect(quizPage.nextButton).toBeVisible();
    await quizPage.nextButton.click();
    await expect(quizPage.progress).toContainText('3 / 3');

    // Q3 CARD (last): reveal, then self-evaluate as correct.
    await quizPage.revealButton.click();
    await quizPage.cardEvalButton(true).click();

    await expect(quizPage.resultSummary).toContainText('3 / 3');
  });

  test('toggling random order persists on the quiz', async ({ factory, quizPage, page }) => {
    const course = await factory.createCourse();
    const quiz = await factory.createQuiz(course.id, { isOrderRandom: false });

    await quizPage.gotoDetail(course.id, quiz.id);
    await quizPage.enterEditMode();
    await page.getByLabel('Randomize question order').check();

    await expect
      .poll(async () => (await factory.getQuiz(course.id, quiz.id)).isOrderRandom)
      .toBe(true);
  });
});
