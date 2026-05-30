import { test, expect } from '../fixtures/test';

test.describe('Courses', () => {
  test('create, rename, and delete a course', async ({ coursesPage, factory }) => {
    const name = factory.unique('Course Create');
    // A distinct name (not containing `name`) so substring matching is unambiguous.
    const renamed = factory.unique('Course Renamed');

    await coursesPage.goto();
    await coursesPage.createCourse(name);
    await expect(coursesPage.card(name)).toBeVisible();

    await coursesPage.rename(name, renamed);
    await expect(coursesPage.card(renamed)).toBeVisible();
    await expect(coursesPage.card(name)).toHaveCount(0);

    await coursesPage.deleteCourse(renamed);
    await expect(coursesPage.card(renamed)).toHaveCount(0);
  });

  test('search filters courses by name', async ({ coursesPage, factory, app }) => {
    // Two seeded-by-API courses with distinct, unique names.
    const a = await factory.createCourse({ name: factory.unique('Search Alpha') });
    const b = await factory.createCourse({ name: factory.unique('Search Bravo') });

    await coursesPage.goto();
    await expect(coursesPage.card(a.name)).toBeVisible();
    await expect(coursesPage.card(b.name)).toBeVisible();

    await app.search(a.name);
    await expect(coursesPage.card(a.name)).toBeVisible();
    await expect(coursesPage.card(b.name)).toHaveCount(0);
  });
});
