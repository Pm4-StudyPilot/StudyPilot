import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { AuthenticatedUser, ChangePasswordRequest } from '../types';
import { logger } from '../lib/logger';

export class UserController {
  constructor(private userService: UserService = new UserService()) {}

  async me(req: Request, res: Response): Promise<void> {
    try {
      const authUser = req.user as AuthenticatedUser;
      const user = await this.userService.findById(authUser.id);

      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      res.json(user);
    } catch (error: unknown) {
      logger.error({ error }, '[UserController#me]');
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  }

  async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const authUser = req.user as AuthenticatedUser;
      const { currentPassword, newPassword } = req.body as ChangePasswordRequest;

      if (!currentPassword?.trim() || !newPassword?.trim()) {
        res.status(400).json({ message: 'Current password and new password are required' });
        return;
      }

      const hasMinLength = newPassword.length >= 12;
      const hasUppercase = /[A-Z]/.test(newPassword);
      const hasLowercase = /[a-z]/.test(newPassword);
      const hasNumber = /[0-9]/.test(newPassword);
      const hasSpecialChar = /[^A-Za-z0-9]/.test(newPassword);

      if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber || !hasSpecialChar) {
        res.status(400).json({ message: 'Password does not meet security requirements' });
        return;
      }

      await this.userService.changePassword(authUser.id, currentPassword, newPassword);

      res.json({ message: 'Password changed successfully' });
    } catch (error: unknown) {
      logger.error({ error }, '[UserController#changePassword]');
      if (error instanceof Error && error.message === 'Current password is incorrect') {
        res.status(401).json({ message: 'Current password is incorrect' });
        return;
      }

      res.status(500).json({ message: 'Failed to change password' });
    }
  }
}
