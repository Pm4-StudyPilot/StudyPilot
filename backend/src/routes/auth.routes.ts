import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authLimiter, sensitiveLimiter } from '../middleware/rateLimiter';

const authRouter = Router();
const authController = new AuthController();

/**
 * @openapi
 * /auth/register:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201:
 *         description: User created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Invalid input.
 *       409:
 *         description: Email or username already exists.
 */
authRouter.post('/register', authLimiter, (req, res) => authController.register(req, res));

/**
 * @openapi
 * /auth/login:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Login with email or username
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Login successful.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       400:
 *         description: Missing credentials.
 *       401:
 *         description: Invalid credentials.
 */
authRouter.post('/login', authLimiter, (req, res) => authController.login(req, res));

/**
 * @openapi
 * /auth/check-availability:
 *   post:
 *     tags:
 *       - Auth
 *     summary: Check whether email or username is already taken
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CheckAvailabilityRequest'
 *     responses:
 *       200:
 *         description: Availability result.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CheckAvailabilityResponse'
 */
authRouter.post('/check-availability', authLimiter, (req, res) =>
  authController.checkAvailability(req, res)
);

/**
 * @route POST /api/auth/reset-password
 * @description Resets the user's password using a valid reset token
 * @body { token: string, newPassword: string }
 *
 * @returns { message: string }
 */
authRouter.post('/reset-password', sensitiveLimiter, (req, res) =>
  authController.resetPassword(req, res)
);

/**
 * @route POST /api/auth/request-password-reset
 * @description Sends a password reset email to the given address
 * @body { email: string }
 *
 * @returns { message: string }
 */
authRouter.post('/request-password-reset', authLimiter, (req, res) =>
  authController.requestPasswordReset(req, res)
);

export { authRouter };
