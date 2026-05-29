import { test, expect } from '../fixtures/test';

test.describe('Quiz authoring', () => {
  test('create a quiz from the course detail page', async ({ factory, courseDetail, page }) => {
    const course = await factory.createCourse();
    const title = factory.unique('Quiz UI');

    await courseDetail.goto(course.id);
    await courseDetail.createQuiz({ title });

    // Verify persistence (reload avoids depending on optimistic feed updates).
    await page.reload();
    await expect(page.getByText(title)).toBeVisible();
  });

  test('author questions of each type and persist answers', async ({ factory, quizPage }) => {
    const course = await factory.createCourse();
    const quiz = await factory.createQuiz(course.id, { title: factory.unique('Quiz Author') });

    const single = factory.unique('Q single');
    const multiple = factory.unique('Q multiple');
    const card = factory.unique('Q card');

    await quizPage.gotoDetail(course.id, quiz.id);
    await quizPage.enterEditMode();

    await quizPage.addQuestion({ title: single, type: 'SINGLE_CHOICE' });
    await quizPage.addQuestion({ title: multiple, type: 'MULTIPLE_CHOICE' });
    await quizPage.addQuestion({ title: card, type: 'CARD' });

    const correct = 'Correct answer';
    await quizPage.addAnswer(single, { content: correct, correct: true });
    await quizPage.addAnswer(single, { content: 'Wrong answer', correct: false });

    // Verify persistence through the API (source of truth): three questions of
    // the authored types, with the single-choice answers stored correctly.
    await expect
      .poll(async () => {
        const questions = await factory.listQuestions(course.id, quiz.id);
        return questions.map((q) => q.type).sort();
      })
      .toEqual(['CARD', 'MULTIPLE_CHOICE', 'SINGLE_CHOICE']);

    const questions = await factory.listQuestions(course.id, quiz.id);
    const singleQ = questions.find((q) => q.title === single);
    expect(singleQ?.answers.find((a) => a.content === correct)?.isCorrect).toBe(true);
    expect(singleQ?.answers.find((a) => a.content === 'Wrong answer')?.isCorrect).toBe(false);
  });
});
