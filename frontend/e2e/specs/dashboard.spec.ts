import { test, expect } from '../fixtures/test';

function dateInDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

test.describe('Dashboard', () => {
  test('search surfaces a task by title', async ({ factory, app, page }) => {
    const course = await factory.createCourse();
    const taskTitle = factory.unique('Dash Task');
    await factory.createTask(course.id, { title: taskTitle, dueDate: dateInDays(3) });

    await page.goto('/');
    await app.search(taskTitle);
    // The title can render in multiple dashboard widgets — asserting at least one
    // is visible is enough to prove the task data surfaced.
    await expect(page.getByText(taskTitle).first()).toBeVisible();
  });

  test("deadline calendar shows a course's task when filtered to that course", async ({
    factory,
    page,
  }) => {
    const course = await factory.createCourse();
    const taskTitle = factory.unique('Cal Task');
    await factory.createTask(course.id, { title: taskTitle, dueDate: dateInDays(2) });

    await page.goto('/');
    // Filter the calendar to this course so the assertion is deterministic
    // regardless of other seeded/parallel data.
    await page.getByRole('button', { name: /All courses/ }).click();
    await page.getByPlaceholder('Search courses').fill(course.name);
    await page.getByRole('option', { name: course.name }).click();

    // The deadline list renders the task as a link (distinct from the "Next task"
    // meta text elsewhere on the page).
    await expect(page.getByRole('link', { name: taskTitle })).toBeVisible();
  });
});
