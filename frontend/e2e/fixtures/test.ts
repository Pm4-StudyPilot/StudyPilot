import { test as base, expect, APIRequestContext } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { E2E, BACKEND_URL } from './env';
import { DataFactory } from './data-factory';
import { LoginPage } from '../pages/login.page';
import { RegisterPage } from '../pages/register.page';
import { AppShell } from '../pages/app-shell.page';
import { CoursesPage } from '../pages/courses.page';
import { CourseDetailPage } from '../pages/course-detail.page';
import { QuizPage } from '../pages/quiz.page';
import { SettingsPage } from '../pages/settings.page';
import { AiChat } from '../pages/ai-chat.page';

/**
 * WCAG 2.2 conformance tags (Level A + AA) that axe-core can check
 * automatically. Excludes axe's `best-practice` rules, which are not part of any
 * WCAG success criterion.
 */
const WCAG_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

interface WorkerFixtures {
  /** A JWT for the shared E2E user, obtained once per worker via the API. */
  authToken: string;
}

interface TestFixtures {
  /** Authenticated API context (Bearer token attached), based at /api. */
  api: APIRequestContext;
  /** Creates and tears down test-owned data via the API. */
  factory: DataFactory;
  loginPage: LoginPage;
  registerPage: RegisterPage;
  app: AppShell;
  coursesPage: CoursesPage;
  courseDetail: CourseDetailPage;
  quizPage: QuizPage;
  settingsPage: SettingsPage;
  aiChat: AiChat;
  /**
   * Builds an `AxeBuilder` pre-scoped to the WCAG 2.2 AA tag set against the
   * current page. A factory (rather than a prebuilt instance) lets a single scan
   * chain `.exclude()` for a specific widget without re-declaring the tags.
   */
  makeAxeBuilder: () => AxeBuilder;
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
  authToken: [
    async ({ playwright }, use) => {
      const ctx = await playwright.request.newContext({ baseURL: BACKEND_URL });
      const res = await ctx.post('/api/auth/login', {
        data: { identifier: E2E.email, password: E2E.password },
      });
      expect(res.ok(), `worker auth failed: ${res.status()} ${await res.text()}`).toBeTruthy();
      const { token } = (await res.json()) as { token: string };
      await ctx.dispose();
      await use(token);
    },
    { scope: 'worker' },
  ],

  api: async ({ playwright, authToken }, use) => {
    const ctx = await playwright.request.newContext({
      baseURL: BACKEND_URL,
      extraHTTPHeaders: { Authorization: `Bearer ${authToken}` },
    });
    await use(ctx);
    await ctx.dispose();
  },

  factory: async ({ api }, use) => {
    const factory = new DataFactory(api);
    await use(factory);
    await factory.cleanup();
  },

  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  registerPage: async ({ page }, use) => use(new RegisterPage(page)),
  app: async ({ page }, use) => use(new AppShell(page)),
  coursesPage: async ({ page }, use) => use(new CoursesPage(page)),
  courseDetail: async ({ page }, use) => use(new CourseDetailPage(page)),
  quizPage: async ({ page }, use) => use(new QuizPage(page)),
  settingsPage: async ({ page }, use) => use(new SettingsPage(page)),
  aiChat: async ({ page }, use) => use(new AiChat(page)),

  makeAxeBuilder: async ({ page }, use) => {
    await use(() => new AxeBuilder({ page }).withTags(WCAG_AA_TAGS));
  },
});

export { expect };
