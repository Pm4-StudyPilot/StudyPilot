import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";

const authRouter = Router();
const authController = new AuthController();

/**
 * Auth Routes
 * 
 * Defines all authentication-related API endpoints.
 * 
 * Base path: /auth
 * 
 * Endpoints:
 * - POST /auth/register -> Register a new user
 * - POST /auth/login -> Authenticate an existing user
 */

/**
 * @route POST /auth/register
 * @description Registers a new user account
 * @body { email: string, username: string, password: string}
 * 
 * @returns { user: object, token: string} 
 */
authRouter.post("/register", (req, res) => authController.register(req, res));

/**
 * @route POST /auth/login
 * @description Authenticates a user and returns a JWT token
 * @body { email: string, password: string}
 * 
 * @returns { user: object, token: string} 
 */
authRouter.post("/login", (req, res) => authController.login(req, res));

export { authRouter };
