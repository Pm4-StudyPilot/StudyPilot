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
 * /users/me:
 *   patch:
 *     tags:
 *       - Users
 *     summary: Update the currently authenticated user's profile
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, username]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               username:
 *                 type: string
 *                 minLength: 3
 *     responses:
 *       200:
 *         description: Updated authenticated user.
 *       400:
 *         description: Invalid input.
 *       401:
 *         description: Unauthorized.
 *       409:
 *         description: Email or username already in use.
 */
userRouter.patch('/me', generalLimiter, authenticate, (req, res) =>
  userController.updateProfile(req, res)
);

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
