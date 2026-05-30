import { test, expect } from '../fixtures/test';
import type { Result } from 'axe-core';

/**
 * Automated WCAG 2.2 A/AA accessibility coverage for every page of the app.
 *
 * Each test scans a settled page with axe-core (tags configured in the
 * `makeAxeBuilder` fixture) and asserts zero violations — any violation fails
 * the build. Every page is scanned in both light and dark mode, since colour
 * contrast differs per theme. The logged-out pages run in their own blocks that
 * opt out of the stored auth state.
 */

const THEMES = ['light', 'dark'] as const;

/** Renders axe violations into a readable, actionable assertion message. */
function formatViolations(violations: Result[]): string {
  if (violations.length === 0) return 'no accessibility violations';
  return violations
    .map((v) => {
      const targets = v.nodes.map((n) => `      - ${n.target.join(' ')}`).join('\n');
      return `  [${v.impact ?? 'n/a'}] ${v.id}: ${v.help}\n    ${v.helpUrl}\n${targets}`;
    })
    .join('\n\n');
}

/** Registers the authenticated-page scans (collected once per theme). */
function authenticatedScans() {
  test('dashboard', async ({ page, app, makeAxeBuilder }) => {
    await page.goto('/');
    await expect(app.coursesLink).toBeVisible();
    // The deadline calendar paints after its fetch settles; wait for the grid's
    // "today" cell so axe scans the rendered calendar, not a spinner.
    await expect(page.locator('.deadline-calendar__day--today')).toBeVisible();

    const results = await makeAxeBuilder().analyze();
    expect(results.violations, formatViolations(results.violations)).toEqual([]);
  });

  test('courses list', async ({ coursesPage, makeAxeBuilder }) => {
    await coursesPage.goto();

    const results = await makeAxeBuilder().analyze();
    expect(results.violations, formatViolations(results.violations)).toEqual([]);
  });

  test('course detail', async ({ factory, courseDetail, makeAxeBuilder }) => {
    const course = await factory.createCourse();
    await factory.createTask(course.id);
    await courseDetail.goto(course.id);

    const results = await makeAxeBuilder().analyze();
    expect(results.violations, formatViolations(results.violations)).toEqual([]);
  });

  test('quiz detail', async ({ factory, quizPage, makeAxeBuilder }) => {
    const course = await factory.createCourse();
    const { quiz } = await factory.createQuizWithQuestions(course.id, [
      {
        title: 'Single choice question',
        type: 'SINGLE_CHOICE',
        answers: [
          { content: 'Correct', isCorrect: true },
          { content: 'Wrong', isCorrect: false },
        ],
      },
    ]);
    await quizPage.gotoDetail(course.id, quiz.id);
    await expect(quizPage.playLink).toBeVisible();

    const results = await makeAxeBuilder().analyze();
    expect(results.violations, formatViolations(results.violations)).toEqual([]);
  });

  test('quiz play', async ({ factory, quizPage, makeAxeBuilder }) => {
    const course = await factory.createCourse();
    const { quiz } = await factory.createQuizWithQuestions(
      course.id,
      [
        {
          title: 'Single choice question',
          type: 'SINGLE_CHOICE',
          answers: [
            { content: 'Correct', isCorrect: true },
            { content: 'Wrong', isCorrect: false },
          ],
        },
      ],
      { isOrderRandom: false }
    );
    await quizPage.gotoPlay(course.id, quiz.id);
    await expect(quizPage.progress).toBeVisible();

    const results = await makeAxeBuilder().analyze();
    expect(results.violations, formatViolations(results.violations)).toEqual([]);
  });

  test('settings', async ({ settingsPage, makeAxeBuilder }) => {
    await settingsPage.goto();

    const results = await makeAxeBuilder().analyze();
    expect(results.violations, formatViolations(results.violations)).toEqual([]);
  });

  test('change password', async ({ page, makeAxeBuilder }) => {
    await page.goto('/settings/password');
    await expect(page.getByRole('button', { name: 'Change Password' })).toBeVisible();

    const results = await makeAxeBuilder().analyze();
    expect(results.violations, formatViolations(results.violations)).toEqual([]);
  });
}

/** Registers the logged-out page scans (collected once per theme). */
function loggedOutScans() {
  // The auth pages are unreachable while authenticated; drop the stored session.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('login', async ({ loginPage, makeAxeBuilder }) => {
    await loginPage.goto();

    const results = await makeAxeBuilder().analyze();
    expect(results.violations, formatViolations(results.violations)).toEqual([]);
  });

  test('register', async ({ registerPage, makeAxeBuilder }) => {
    await registerPage.goto();

    const results = await makeAxeBuilder().analyze();
    expect(results.violations, formatViolations(results.violations)).toEqual([]);
  });

  test('forgot password', async ({ page, makeAxeBuilder }) => {
    await page.goto('/forgot-password');
    await expect(page.locator('.auth-card')).toBeVisible();

    const results = await makeAxeBuilder().analyze();
    expect(results.violations, formatViolations(results.violations)).toEqual([]);
  });

  test('reset password', async ({ page, makeAxeBuilder }) => {
    // A dummy token makes the page render the actual reset form (rather than the
    // "invalid link" fallback), so axe scans the inputs.
    await page.goto('/reset-password?token=e2e-axe-scan');
    await expect(page.locator('.auth-card')).toBeVisible();

    const results = await makeAxeBuilder().analyze();
    expect(results.violations, formatViolations(results.violations)).toEqual([]);
  });
}

for (const theme of THEMES) {
  test.describe(`Accessibility (WCAG 2.2 AA) — ${theme} mode`, () => {
    // Seed the theme before the app boots so it renders in `theme` from the
    // first paint; ThemeProvider reads localStorage['theme'] on mount.
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((t) => window.localStorage.setItem('theme', t), theme);
    });
    authenticatedScans();
  });

  test.describe(`Accessibility (WCAG 2.2 AA) — logged out — ${theme} mode`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((t) => window.localStorage.setItem('theme', t), theme);
    });
    loggedOutScans();
  });
}
