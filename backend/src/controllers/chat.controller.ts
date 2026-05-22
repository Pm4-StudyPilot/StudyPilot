import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { ChatService } from '../services/chat.service';
import { AuthenticatedUser } from '../types';
import { logger } from '../lib/logger';

/**
 * Handles chat requests to the TARS AI agent.
 *
 * The agent is run on behalf of the authenticated user; `threadId` scopes the
 * conversation so multi-turn memory works within a chat session.
 */
export class ChatController {
  constructor(private chatService: ChatService = new ChatService()) {}

  async send(req: Request, res: Response): Promise<void> {
    try {
      const authUser = req.user as AuthenticatedUser;
      const { message, threadId } = req.body as { message?: string; threadId?: string };

      if (!message?.trim()) {
        res.status(400).json({ message: 'Message is required' });
        return;
      }

      const result = await this.chatService.send(
        message.trim(),
        authUser.id,
        threadId?.trim() || randomUUID()
      );

      res.json(result);
    } catch (error: unknown) {
      logger.error({ error }, '[ChatController#send]');
      res.status(500).json({ message: 'Failed to process chat message' });
    }
  }
}
