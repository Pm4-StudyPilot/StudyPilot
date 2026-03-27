import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";

const authRouter = Router();
const authController = new AuthController();

/**
 * Auth Routes
 * 
 * Defines all authentication-related API endpoints.
 * 
 * Base path within auth router: /auth
 * Full API path: /api/auth
 * 
 * Endpoints:
 * - POST /api/auth/register -> Register a new user
 * - POST /api/auth/login -> Authenticate an existing user
 * - POST /api/auth/check-availability -> Check email and username availability
 */

/**
 * @route POST /api/auth/register
 * @description Registers a new user account
 * @body { email: string, username: string, password: string}
 * 
 * @returns { user: object, token: string} 
 */
authRouter.post("/register", (req, res) => authController.register(req, res));

/**
 * @route POST /api/auth/login
 * @description Authenticates a user and returns a JWT token
 * @body { email: string, password: string}
 * 
 * @returns { user: object, token: string} 
 */
authRouter.post("/login", (req, res) => authController.login(req, res));

/**
 * @route POST /api/auth/check-availability
 * @description Checks whether e-mail and/or username are already taken
 * @body { email?: string, username?: string }
 *
 * @returns { emailExists?: boolean, usernameExists?: boolean }
 */
authRouter.post("/check-availability", (req, res) => authController.checkAvailability(req, res));

export { authRouter };
