import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { RegisterRequest, LoginRequest } from "../types";

const authService = new AuthService();

/**
 * Controller responsible for handling authentication-related requests.
 * 
 * This includes:
 * - User registration
 * - User login
 * 
 * The controller acts as an intermediary between incoming HTTP requests 
 * and the business logic implemented in the AuthService.
 */

export class AuthController {
  /**
   * Handles user registration.
   * 
   * Expected request body:
   * - email: string
   * - username: string
   * - password: string
   * 
   * Workflow:
   * 1. Validate required fields
   * 2. Call AuthService to create a new user
   * 3. Return the created user and JWT token
   * 
   * Error handling: 
   * - 400: Missing required fields
   * - 409: Email or username already exists (unique constraint violation)
   * - 500: General registration failure
   * 
   * @param req  Express request object containing registration data
   * @param res  Express response object used to send the result
   * 
   * @returns Sends a JSON response containing the created user and JWT token
   */
  async register(req: Request, res: Response): Promise<void> {
    try {
      const { email, username, password } = req.body as RegisterRequest;

      // Validate required fields
      if (!email || !username || !password) {
        res.status(400).json({ message: "Email, username, and password are required" });
        return;
      }

      // Call service layer to register user
      const result = await authService.register(email, username, password);

      // Return success response with created user and token
      res.status(201).json(result);

    } catch (error: any) {

      // Handle unique constraint violation (duplicate email or username)
      if (error.code === "P2002") {
        const message = String(error.message).toLowerCase();

        if(message.includes("email")){
          res.status(409).json({ message: "Email already exists" });
          return;
        }

        if(message.includes("username")){
          res.status(409).json({ message: "Username already exists" });
          return;
        }

        res.status(409).json({ message: "Duplicate entry" });
        return;
      }

      // Handle unexpected errors
      res.status(500).json({ message: "Registration failed" });
    }
  }

  /**
   * Handles user login.
   * 
   * Expected request body:
   * - email: string
   * - password: string
   * 
   * Workflow:
   * 1. Validate required fields
   * 2. Call AuthService to verify credentials
   * 3. Return authenticated user and JWT token
   * 
   * Error handling:
   * - 400: Missing required fields
   * - 401: Invalid credentials (wrong email or password)
   * 
   * @param req Express request object containing login credentials
   * @param res Express response object used to send the result
   * 
   * @returns Sends a JSON response containing the authenticated user and JWT token
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body as LoginRequest;

      // Validate required fields
      if (!email || !password) {
        res.status(400).json({ message: "Email and password are required" });
        return;
      }

      // Call service layer to authenticate user
      const result = await authService.login(email, password);

      // Return authenticated user and token
      res.json(result);

    } catch (error: any) {
      res.status(401).json({ message: "Invalid credentials" });
    }
  }
}
