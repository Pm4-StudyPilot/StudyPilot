import { Router } from 'express';
import { NotificationController } from '../controllers/notification.controller';
import { authenticate } from '../middleware/auth';
import { generalLimiter } from '../middleware/rateLimiter';

const notificationRouter = Router();
const notificationController = new NotificationController();

/**
 * @openapi
 * /notifications:
 *   get:
 *     tags:
 *       - Notifications
 *     summary: List notifications for the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of notifications.
 *       401:
 *         description: Unauthorized.
 */
notificationRouter.get('/', authenticate, generalLimiter, (req, res) =>
  notificationController.list(req, res)
);

/**
 * @openapi
 * /notifications/{id}/read:
 *   patch:
 *     tags:
 *       - Notifications
 *     summary: Mark a notification as read
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Notification marked as read.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Notification not found.
 */
notificationRouter.patch('/:id/read', authenticate, generalLimiter, (req, res) =>
  notificationController.markAsRead(req, res)
);

export { notificationRouter };
