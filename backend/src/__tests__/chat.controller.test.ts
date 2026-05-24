import { describe, it, expect, mock } from 'bun:test';
import type { Request, Response } from 'express';
import { ChatController } from '../controllers/chat.controller';
import type { ChatService } from '../services/chat.service';
import type { AuthenticatedUser } from '../types';

function createMockResponse() {
  const res: Partial<Response> = {};
  res.status = mock(() => res as Response);
  res.json = mock(() => res as Response);
  return res as Response & {
    status: ReturnType<typeof mock>;
    json: ReturnType<typeof mock>;
  };
}

const authUser: AuthenticatedUser = {
  id: 'user-1',
  email: 'student@students.zhaw.ch',
  username: 'student',
  role: 'student' as AuthenticatedUser['role'],
};

describe('ChatController.send', () => {
  it('passes the message, user id, and thread id to the service and returns the reply', async () => {
    const serviceResult = { reply: 'You have 3 courses.', tools: ['list_courses'] };
    const mockChatService = {
      send: mock(async () => serviceResult),
    };
    const controller = new ChatController(mockChatService as unknown as ChatService);

    const req = {
      user: authUser,
      body: { message: 'What courses do I have?', threadId: 'thread-9' },
    } as unknown as Request;
    const res = createMockResponse();

    await controller.send(req, res);

    expect(mockChatService.send).toHaveBeenCalledWith(
      'What courses do I have?',
      'user-1',
      'thread-9'
    );
    // The controller forwards the agent reply verbatim, including used tools.
    expect(res.json).toHaveBeenCalledWith(serviceResult);
  });

  it('trims the message and falls back to a generated thread id when none is given', async () => {
    const mockChatService = {
      send: mock(async () => ({ reply: 'ok' })),
    };
    const controller = new ChatController(mockChatService as unknown as ChatService);

    const req = { user: authUser, body: { message: '  hi  ' } } as unknown as Request;
    const res = createMockResponse();

    await controller.send(req, res);

    expect(mockChatService.send).toHaveBeenCalledWith('hi', 'user-1', expect.any(String));
  });

  it('returns 400 when the message is missing or blank', async () => {
    const mockChatService = { send: mock(async () => ({ reply: 'ok' })) };
    const controller = new ChatController(mockChatService as unknown as ChatService);

    const req = { user: authUser, body: { message: '   ' } } as unknown as Request;
    const res = createMockResponse();

    await controller.send(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Message is required' });
    expect(mockChatService.send).not.toHaveBeenCalled();
  });

  it('returns 500 when the agent throws', async () => {
    const mockChatService = {
      send: mock(async () => {
        throw new Error('agent boom');
      }),
    };
    const controller = new ChatController(mockChatService as unknown as ChatService);

    const req = { user: authUser, body: { message: 'hello' } } as unknown as Request;
    const res = createMockResponse();

    await controller.send(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Failed to process chat message' });
  });
});
