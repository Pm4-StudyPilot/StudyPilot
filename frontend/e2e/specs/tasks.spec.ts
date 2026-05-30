import { test, expect } from '../fixtures/test';

test.describe('Tasks', () => {
  test('create a task with priority and due date', async ({ factory, courseDetail }) => {
    const course = await factory.createCourse();
    const title = factory.unique('Task Create');

    await courseDetail.goto(course.id);
    await courseDetail.createTask({ title, priority: 'HIGH', dueDate: '2026-09-01' });

    const card = courseDetail.taskCard(title);
    await expect(card).toBeVisible();
    await expect(card).toContainText('High');
  });

  test("edit a task's status", async ({ factory, courseDetail }) => {
    const course = await factory.createCourse();
    const task = await factory.createTask(course.id, { title: factory.unique('Task Status') });

    await courseDetail.goto(course.id);
    const card = courseDetail.taskCard(task.title);
    await expect(card).toContainText('Open');

    await courseDetail.editTaskStatus(task.title, 'Done');
    await expect(courseDetail.taskCard(task.title)).toContainText('Done');
  });

  test('delete a task', async ({ factory, courseDetail }) => {
    const course = await factory.createCourse();
    const task = await factory.createTask(course.id, { title: factory.unique('Task Delete') });

    await courseDetail.goto(course.id);
    await expect(courseDetail.taskCard(task.title)).toBeVisible();

    await courseDetail.deleteTask(task.title);
    await expect(courseDetail.taskCard(task.title)).toHaveCount(0);
  });
});
