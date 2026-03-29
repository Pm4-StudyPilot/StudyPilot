import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { RegisterRequest, LoginRequest } from "../types";
import validator from "validator";

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
    constructor(private authService: AuthService = new AuthService()) {}
  /**
   * Handles user registration.
   * 
   * Expected request body:
   * - email: string
   * - username: string
   * - password: string
   * 
   * Workflow:
   * 1. Validate required fields (non-empty values)
   * 2. Validate email format
   * 3. Validate password security requirements
   * 4. Call AuthService to create a new user
   * 5. Return the created user and JWT token
   * 
   * Password requirements:
   * - Minimum length of 12 characters
   * - At least one uppercase letter
   * - At least one lowercase letter
   * - At least one number
   * - At least one special character
   * 
   * Error handling: 
   * - 400: Missing required fields or invalid input
   * - 409: Email or username already exists
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
      if (!email?.trim() || !username?.trim() || !password?.trim()) {
        res.status(400).json({ message: "Email, username, and password are required" });
        return;
      }

      // Validate email format
      if (!validator.isEmail(email)) {
        res.status(400).json({ message: "Invalid email format"});
        return;
      }

      // Validate password requirements
      const hasMinLength = password.length >= 12;
      const hasUppercase = /[A-Z]/.test(password);
      const hasLowercase = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

      if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber || !hasSpecialChar) {
        res.status(400).json({ message: "Password does not meet security requirements" });
        return;
      }

      // Call service layer to register user
      const result = await this.authService.register(email, username, password);

      // Return success response with created user and token
      res.status(201).json(result);

    } catch (error: unknown) {

      // Handle unique constraint violation (duplicate email or username)
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        const message = 'message' in error ? String(error.message).toLowerCase() : '';

        if (message.includes('email')) {
          res.status(409).json({ message: 'Email already exists' });
          return;
        }

        if (message.includes('username')) {
          res.status(409).json({ message: 'Username already exists' });
          return;
        }

        res.status(409).json({ message: 'Duplicate entry' });
        return;
      }

      // Handle unexpected errors
      res.status(500).json({ message: 'Registration failed' });
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
        res.status(400).json({ message: 'Email and password are required' });
        return;
      }

      // Call service layer to authenticate user
      const result = await this.authService.login(email, password);

      // Return authenticated user and token
      res.json(result);

    } catch {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  }

  /**
   * Checks whether an email address and/or username is already taken.
   *
   * Expected request body:
   * - email?: string
   * - username?: string
   *
   * Workflow:
   * 1. Read optional email and username values from the request body
   * 2. Call AuthService to check whether the values already exist
   * 3. Return availability result as JSON
   *
   * Response:
   * - emailExists?: boolean
   * - usernameExists?: boolean
   *
   * Error handling:
   * - 500: General availability check failure
   *
   * @param req Express request object containing email and/or username
   * @param res Express response object used to send the result
   *
   * @returns Sends a JSON response containing availability information
   */
  async checkAvailability(req: Request, res: Response): Promise<void> {
  try {
    const { email, username } = req.body as { email?: string; username?: string };

    const result = await this.authService.checkAvailability(email, username);
    res.json(result);
  } catch {
    res.status(500).json({ message: "Availability check failed" });
  }
  }
}
