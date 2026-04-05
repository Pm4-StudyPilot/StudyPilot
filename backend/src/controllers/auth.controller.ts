import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import {
  RegisterRequest,
  LoginRequest,
  RequestPasswordResetRequest,
  ResetPasswordRequest,
} from '../types';
import validator from 'validator';
import { logger } from '../lib/logger';

/**
 * Controller responsible for handling authentication-related requests.
 *
 * This includes:
 * - User registration
 * - User login
 * - Password reset (request + confirm)
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
   * 4. Normalize email (trim + lowercase)
   * 5. Call AuthService to create a new user
   * 6. Return the created user and JWT token
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
        res.status(400).json({ message: 'Email, username, and password are required' });
        return;
      }

      // Normalize email
      const normalizedEmail = email.trim().toLowerCase();

      // Validate email format
      if (!validator.isEmail(normalizedEmail)) {
        res.status(400).json({ message: 'Invalid email format' });
        return;
      }

      // Validate password requirements
      const hasMinLength = password.length >= 12;
      const hasUppercase = /[A-Z]/.test(password);
      const hasLowercase = /[a-z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      const hasSpecialChar = /[^A-Za-z0-9]/.test(password);

      if (!hasMinLength || !hasUppercase || !hasLowercase || !hasNumber || !hasSpecialChar) {
        res.status(400).json({ message: 'Password does not meet security requirements' });
        return;
      }

      // Call service layer to register user
      const result = await this.authService.register(normalizedEmail, username.trim(), password);

      // Return success response with created user and token
      res.status(201).json(result);
    } catch (error: unknown) {
      logger.error({ error }, '[AuthController#register]');

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
   * - identifier: string -> email or username
   * - password: string
   *
   * Workflow:
   * 1. Validate required fields
   * 2. Normalize identifier (trim)
   * 3. Call AuthService to verify credentials
   * 4. Return authenticated user and JWT token
   *
   * Error handling:
   * - 400: Missing required fields
   * - 401: Invalid credentials (wrong email/username or password)
   * - 500: General registration failure
   *
   * @param req Express request object containing login credentials
   * @param res Express response object used to send the result
   *
   * @returns Sends a JSON response containing the authenticated user and JWT token
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { identifier, password } = req.body as LoginRequest;

      // Validate required fields
      if (!identifier?.trim() || !password?.trim()) {
        res.status(400).json({ message: 'Email or username and password are required' });
        return;
      }

      // Normalize input
      const normalizedIdentifier = identifier.trim();

      // Call service layer to authenticate user
      const result = await this.authService.login(normalizedIdentifier, password);

      // Return authenticated user and token
      res.json(result);
    } catch (error: unknown) {
      logger.error({ error }, '[AuthController#login]');
      if (error instanceof Error && error.message === 'Invalid credentials') {
        res.status(401).json({ message: 'Invalid credentials' });
        return;
      }

      res.status(500).json({ message: 'Login failed' });
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
    } catch (error: unknown) {
      logger.error({ error }, '[AuthController#checkAvailability]');
      res.status(500).json({ message: 'Availability check failed' });
    }
  }

  /**
   * Handles a password reset request.
   *
   * Expected request body:
   * - email: string
   *
   * Workflow:
   * 1. Validate email is provided and has valid format
   * 2. Call AuthService to generate a token and send the reset email
   * 3. Always return a generic success message (prevents email enumeration)
   *
   * Error handling:
   * - 400: Missing or invalid email
   * - 500: Unexpected failure
   *
   * @param req Express request object
   * @param res Express response object
   */
  async requestPasswordReset(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body as RequestPasswordResetRequest;

      if (!email?.trim()) {
        res.status(400).json({ message: 'Email is required' });
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();

      if (!validator.isEmail(normalizedEmail)) {
        res.status(400).json({ message: 'Invalid email format' });
        return;
      }

      await this.authService.requestPasswordReset(normalizedEmail);

      // Always return a generic message to prevent email enumeration
      res.json({ message: 'If this email is registered, you will receive a password reset link.' });
    } catch (error: unknown) {
      logger.error({ error }, '[AuthController#requestPasswordReset]');
      res.status(500).json({ message: 'Failed to process password reset request' });
    }
  }

  /**
   * Handles setting a new password via a reset token.
   *
   * Expected request body:
   * - token: string
   * - newPassword: string
   *
   * Workflow:
   * 1. Validate token and new password are provided
   * 2. Validate new password meets security requirements
   * 3. Call AuthService to verify token and update password
   *
   * Error handling:
   * - 400: Missing fields, invalid password, or invalid/expired token
   * - 500: Unexpected failure
   *
   * @param req Express request object
   * @param res Express response object
   */
  async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, newPassword } = req.body as ResetPasswordRequest;

      if (!token?.trim() || !newPassword?.trim()) {
        res.status(400).json({ message: 'Token and new password are required' });
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

      await this.authService.resetPassword(token.trim(), newPassword);

      res.json({ message: 'Password has been reset successfully. You can now log in.' });
    } catch (error: unknown) {
      logger.error({ error }, '[AuthController#resetPassword]');
      if (error instanceof Error && error.message === 'Invalid or expired password reset token') {
        res.status(400).json({ message: 'Invalid or expired password reset token' });
        return;
      }

      res.status(500).json({ message: 'Failed to reset password' });
    }
  }
}
