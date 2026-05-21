import { describe, it, expect, mock } from 'bun:test';

// Mock the heavy `agent` workspace before importing the service under test.
const runAgent = mock(async () => ({ reply: 'You have 2 courses.', tools: ['list_courses'] }));
mock.module('agent', () => ({ runAgent }));

const { ChatService } = await import('../services/chat.service');

describe('ChatService.send', () => {
  it('delegates to runAgent with the message, userId, and threadId', async () => {
    const service = new ChatService();
    const result = await service.send('What courses?', 'user-1', 'thread-1');

    expect(runAgent).toHaveBeenCalledWith({
      message: 'What courses?',
      userId: 'user-1',
      threadId: 'thread-1',
    });
    expect(result).toEqual({ reply: 'You have 2 courses.', tools: ['list_courses'] });
  });
});
