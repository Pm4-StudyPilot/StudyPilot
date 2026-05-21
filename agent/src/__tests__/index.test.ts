import { describe, it, expect } from 'bun:test';
import type { MessageContent } from '@langchain/core/messages';
import { messageText } from '../index';
import { TARS_SYSTEM_PROMPT } from '../prompt';

describe('messageText', () => {
  it('returns string content as-is', () => {
    expect(messageText('Hello')).toBe('Hello');
  });

  it('concatenates the text of content parts', () => {
    const content = [
      { type: 'text', text: 'Hello ' },
      { type: 'text', text: 'world' },
    ] as unknown as MessageContent;
    expect(messageText(content)).toBe('Hello world');
  });

  it('ignores non-text parts', () => {
    const content = [
      { type: 'text', text: 'see: ' },
      { type: 'image_url', image_url: 'http://x' },
    ] as unknown as MessageContent;
    expect(messageText(content)).toBe('see: ');
  });

  it('returns an empty string for undefined content', () => {
    expect(messageText(undefined)).toBe('');
  });
});

describe('TARS_SYSTEM_PROMPT', () => {
  it('instructs the model to call one tool at a time', () => {
    expect(TARS_SYSTEM_PROMPT).toMatch(/one tool/i);
    expect(TARS_SYSTEM_PROMPT.length).toBeGreaterThan(0);
  });
});
