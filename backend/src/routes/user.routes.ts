import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';
import { generalLimiter, sensitiveLimiter } from '../middleware/rateLimiter';

const userRouter = Router();
const userController = new UserController();

userRouter.get('/me', generalLimiter, authenticate, (req, res) => userController.me(req, res));
userRouter.patch('/me/password', sensitiveLimiter, authenticate, (req, res) =>
  userController.changePassword(req, res)
);

export { userRouter };
