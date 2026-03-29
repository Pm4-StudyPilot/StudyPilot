import { Request, Response } from 'express';
import { UserService } from '../services/user.service';
import { AuthenticatedUser } from '../types';

const userService = new UserService();

export class UserController {
  async me(req: Request, res: Response): Promise<void> {
    try {
      const authUser = req.user as AuthenticatedUser;
      const user = await userService.findById(authUser.id);

      if (!user) {
        res.status(404).json({ message: 'User not found' });
        return;
      }

      res.json(user);
    } catch {
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  }
}
