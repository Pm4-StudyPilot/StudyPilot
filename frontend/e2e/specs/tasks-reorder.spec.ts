import { test, expect } from '../fixtures/test';

/**
 * Drag-and-drop reordering uses @dnd-kit with a PointerSensor, which needs
 * realistic stepped pointer movement (a single dragTo does not activate it).
 * We verify the new order *persisted* — via the API (source of truth) and after
 * a reload — rather than just the transient visual reorder.
 */
test('reordering tasks by drag-and-drop persists the new order', async ({
  factory,
  courseDetail,
  page,
}) => {
  const course = await factory.createCourse();
  const titles = [
    factory.unique('Reorder A'),
    factory.unique('Reorder B'),
    factory.unique('Reorder C'),
  ];
  for (const title of titles) {
    await factory.createTask(course.id, { title });
  }

  await courseDetail.goto(course.id);
  await expect(courseDetail.taskCard(titles[0])).toBeVisible();
  expect(await courseDetail.taskTitlesInOrder()).toEqual(titles);

  // Drag the first task to the bottom of the list.
  await courseDetail.dragTaskToLast(titles[0]);

  const expectedOrder = [titles[1], titles[2], titles[0]];

  // The reorder PATCH must persist the new positions (API is the source of truth).
  await expect
    .poll(async () => (await factory.listTasks(course.id)).map((t) => t.title))
    .toEqual(expectedOrder);

  // And it must survive a reload.
  await page.reload();
  await expect(courseDetail.taskCard(titles[0])).toBeVisible();
  expect(await courseDetail.taskTitlesInOrder()).toEqual(expectedOrder);
});
