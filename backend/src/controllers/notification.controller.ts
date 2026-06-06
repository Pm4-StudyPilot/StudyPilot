import { Request, Response } from 'express';
import { NotificationService } from '../services/notification.service';
import { AuthenticatedUser } from '../types';
import { logger } from '../lib/logger';

const notificationService = new NotificationService();

export class NotificationController {
  async list(req: Request, res: Response): Promise<void> {
    try {
      const authUser = req.user as AuthenticatedUser;
      const notifications = await notificationService.listForUser(authUser.id);
      res.json(notifications);
    } catch (error: unknown) {
      logger.error({ error }, '[NotificationController#list]');
      res.status(500).json({ message: 'Failed to fetch notifications' });
    }
  }

  async markAsRead(req: Request, res: Response): Promise<void> {
    try {
      const authUser = req.user as AuthenticatedUser;
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;

      if (!id) {
        res.status(400).json({ message: 'Notification id is required' });
        return;
      }

      const notification = await notificationService.markAsRead(id, authUser.id);

      if (!notification) {
        res.status(404).json({ message: 'Notification not found' });
        return;
      }

      res.json(notification);
    } catch (error: unknown) {
      logger.error({ error }, '[NotificationController#markAsRead]');
      res.status(500).json({ message: 'Failed to update notification' });
    }
  }
}
