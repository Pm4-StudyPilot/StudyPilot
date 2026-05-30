import { test, expect } from '../fixtures/test';

/**
 * Live end-to-end smoke against the real TARS agent. Skipped unless
 * GOOGLE_API_KEY is present so CI without a key stays green. Asserts only on
 * structure (a reply, a create-course tool, and the resulting course), never on
 * exact LLM text.
 */
test.skip(!process.env.GOOGLE_API_KEY, 'requires GOOGLE_API_KEY for the live agent');

test('TARS creates a course end-to-end via the live agent', async ({ aiChat, factory, page }) => {
  const courseName = factory.unique('TARS Course');

  await page.goto('/');
  await aiChat.send(`Create a course called "${courseName}"`);

  // A non-empty assistant reply arrives (agent + MCP round-trip can be slow).
  await expect(aiChat.messagesByRole('assistant').last()).toBeVisible({ timeout: 90_000 });
  await expect(aiChat.toolsList).toContainText(/course/i, { timeout: 90_000 });

  // The course actually exists afterwards.
  let createdId: string | undefined;
  await expect
    .poll(
      async () => {
        const course = (await factory.listCourses()).find((c) => c.name === courseName);
        createdId = course?.id;
        return Boolean(course);
      },
      { timeout: 30_000 }
    )
    .toBe(true);

  if (createdId) await factory.deleteCourse(createdId);
});
