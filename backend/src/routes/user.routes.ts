import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth';
import { generalLimiter, sensitiveLimiter } from '../middleware/rateLimiter';

const userRouter = Router();
const userController = new UserController();

/**
 * @openapi
 * /users/me:
 *   get:
 *     tags:
 *       - Users
 *     summary: Get the currently authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Authenticated user.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: User not found.
 */
userRouter.get('/me', generalLimiter, authenticate, (req, res) => userController.me(req, res));

/**
 * @openapi
 * /users/me/password:
 *   patch:
 *     tags:
 *       - Users
 *     summary: Change the password of the authenticated user
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ChangePasswordRequest'
 *     responses:
 *       200:
 *         description: Password changed successfully.
 *       400:
 *         description: Invalid input.
 *       401:
 *         description: Unauthorized or current password incorrect.
 */
userRouter.patch('/me/password', sensitiveLimiter, authenticate, (req, res) =>
  userController.changePassword(req, res)
);

export { userRouter };
