import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { authenticate } from '../middleware/auth';
import { generalLimiter } from '../middleware/rateLimiter';

const chatRouter = Router();
const chatController = new ChatController();

/**
 * @openapi
 * /chat:
 *   post:
 *     tags:
 *       - Chat
 *     summary: Send a message to the TARS AI agent
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *               threadId:
 *                 type: string
 *                 description: Conversation thread id; reuse it to keep multi-turn memory.
 *     responses:
 *       200:
 *         description: The agent's reply.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reply:
 *                   type: string
 *       400:
 *         description: Invalid input.
 *       401:
 *         description: Unauthorized.
 */
chatRouter.post('/', generalLimiter, authenticate, (req, res) => chatController.send(req, res));

export { chatRouter };
