import { Page, Locator } from '@playwright/test';

/** The TARS AI assistant input (bottom bar) and its chat panel. */
export class AiChat {
  readonly input: Locator;
  readonly sendButton: Locator;
  readonly panel: Locator;
  readonly toolsDetails: Locator;
  readonly toolsList: Locator;

  constructor(private readonly page: Page) {
    this.input = page.getByTestId('ai-input-field');
    this.sendButton = page.getByTestId('ai-send-button');
    this.panel = page.getByRole('log', { name: 'Chat with TARS' });
    this.toolsDetails = page.getByTestId('ai-tools');
    this.toolsList = page.getByTestId('ai-tools-list');
  }

  async send(message: string) {
    await this.input.fill(message);
    await this.sendButton.click();
  }

  messages(role?: 'user' | 'assistant'): Locator {
    const all = this.page.getByTestId('ai-message');
    return role ? all.filter({ has: this.page.locator(`[data-role="${role}"]`) }) : all;
  }

  /** Messages by role using the data-role attribute on the message container. */
  messagesByRole(role: 'user' | 'assistant'): Locator {
    return this.page.locator(`[data-testid="ai-message"][data-role="${role}"]`);
  }
}
