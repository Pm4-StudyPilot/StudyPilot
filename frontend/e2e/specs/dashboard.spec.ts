import { test, expect } from '../fixtures/test';

function dateInDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

function dateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function displayDate(key: string): string {
  const [year, month, day] = key.split('-');

  return `${day}.${month}.${year}`;
}

function adjacentDateInCurrentMonth(): Date {
  const date = new Date();
  date.setHours(12, 0, 0, 0);

  if (date.getDate() > 1) {
    date.setDate(date.getDate() - 1);
  } else {
    date.setDate(date.getDate() + 1);
  }

  return date;
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

  test('deadline calendar mutes today when another date is selected', async ({ factory, page }) => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const todayKey = dateKey(today);
    const selectedKey = dateKey(adjacentDateInCurrentMonth());

    const course = await factory.createCourse();
    await factory.createTask(course.id, {
      title: factory.unique('Today Highlight'),
      dueDate: todayKey,
    });
    await factory.createTask(course.id, {
      title: factory.unique('Selected Highlight'),
      dueDate: selectedKey,
    });

    await page.goto('/');
    await page.getByRole('button', { name: /All courses/ }).click();
    await page.getByPlaceholder('Search courses').fill(course.name);
    await page.getByRole('option', { name: course.name }).click();

    const todayButton = page.getByRole('button', {
      name: `${displayDate(todayKey)}, today, 1 deadline`,
    });
    const selectedButton = page.getByRole('button', {
      name: `${displayDate(selectedKey)}, 1 deadline`,
    });

    await expect(todayButton).toHaveClass(/deadline-calendar__day--today/);
    await expect(todayButton).not.toHaveClass(/deadline-calendar__day--today-muted/);

    await selectedButton.click();

    await expect(selectedButton).toHaveClass(/deadline-calendar__day--selected/);
    await expect(todayButton).toHaveClass(/deadline-calendar__day--today-muted/);
    await expect(todayButton).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  });
});
