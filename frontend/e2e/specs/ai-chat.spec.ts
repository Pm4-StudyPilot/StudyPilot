import { test, expect } from '../fixtures/test';

interface ChatBody {
  message?: string;
  threadId?: string;
  pageContext?: string;
}

test.describe('TARS AI assistant (mocked)', () => {
  test('renders a reply, tool list, and keeps thread + pageContext correct', async ({
    aiChat,
    page,
  }) => {
    const bodies: ChatBody[] = [];
    await page.route('**/api/chat', async (route) => {
      bodies.push(JSON.parse(route.request().postData() || '{}'));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reply: '**Bold** answer',
          tools: ['create_course', 'list_courses'],
        }),
      });
    });

    await page.goto('/');
    await aiChat.send('first message');

    // Reply rendered as markdown.
    await expect(aiChat.messagesByRole('assistant')).toHaveCount(1);
    await expect(aiChat.panel.locator('.ai-input__markdown strong')).toHaveText('Bold');

    // Collapsible "tools used" reflects the returned tools[]. It is collapsed by
    // default, so the <li>s are hidden until we expand it.
    await expect(aiChat.toolsDetails).toContainText('2 tools used');
    await aiChat.toolsDetails.locator('summary').click();
    await expect(aiChat.toolsList.getByRole('listitem')).toHaveText([
      'create_course',
      'list_courses',
    ]);

    // Second turn: same threadId, and pageContext only attached on the first message.
    await aiChat.send('second message');
    await expect(aiChat.messagesByRole('assistant')).toHaveCount(2);

    expect(bodies).toHaveLength(2);
    expect(bodies[0].threadId).toBeTruthy();
    expect(bodies[1].threadId).toBe(bodies[0].threadId);
    expect(bodies[0].pageContext).toBeTruthy();
    expect(bodies[1].pageContext).toBeUndefined();
  });

  test('AiInputGuard hides the assistant on non-allowed routes', async ({ aiChat, page }) => {
    await page.goto('/');
    await expect(aiChat.input).toBeVisible();

    await page.goto('/settings');
    await expect(aiChat.input).toHaveCount(0);
  });
});
