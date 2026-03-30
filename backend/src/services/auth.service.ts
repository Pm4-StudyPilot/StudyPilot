import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { JwtPayload, AuthResponse } from "../types";
import { prisma } from "../config/database";

// Ensure JWT secret is provided via environment variables.
// The application will not start without it to avoid insecure defaults.
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("Missing required environment variable: JWT_SECRET");
  }

  return secret;
}

const JWT_SECRET = getJwtSecret();

/**
 * AuthService
 * 
 * Contains all business logic related to authentication.
 * 
 * Responsibilities:
 * - User registration (hash password + store user)
 * - User authentication (validate credentials)
 * - JWT token generation
 * 
 * This service is used by the AuthController and interacts with the database via Prisma
 */
export class AuthService {
  /**
   * Registers a new user.
   * 
   * Workflow:
   * 1. Hash the user's password using bcrypt
   * 2. Store the user in the database
   * 3. Generate a JWT token
   * 4. Return user data and token
   * 
   * @param email User's email address
   * @param username User's username
   * @param password Plain-text password (will be hashed)
   * 
   * @returns Returns an object containing the created user and JWT token
   * 
   * @throws Prisma error (e.g. P2002) if email or username already exists
   */
  async register(email: string, username: string, password: string): Promise<AuthResponse> {
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user in database
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashedPassword,
      },
    });

    // Generate JWT token
    const token = this.generateToken(user);

    // Return safe user data (without password) and token
    return { 
      user: { 
        id: user.id, 
        email: user.email, 
        username: user.username, 
        role: user.role 
      }, 
      token 
    };
  }

  /**
   * Authenticates a user.
   * 
   * Workflow:
   * 1. Find user by identifier (email or username)
   * 2. Compare provided password with stored hash
   * 3. Generate a JWT token if valid
   * 4. Return user data and token
   * 
   * @param identifier User's email address or username
   * @param password Plain-text password
   * 
   * @returns Returns an object containing the authenticated user and a JWT token
   * 
   * @throws Error if credentials are invalid
   */
  async login(identifier: string, password: string): Promise<AuthResponse> {
    // Normalize input
    const normalizedIdentifier = identifier.trim();

    // Find user by email or username
    const user = await prisma.user.findFirst({ 
      where: { 
        OR: [
          { email: normalizedIdentifier.toLowerCase() },
          { username: normalizedIdentifier }
        ] 
    }
  });

    if (!user) {
      throw new Error("Invalid credentials");
    }

    // Compare password with hashed password
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      throw new Error("Invalid credentials");
    }

    // Generate JWT token
    const token = this.generateToken(user);

    // Return safe user data and token
    return { 
      user: { 
        id: user.id, 
        email: user.email, 
        username: user.username, 
        role: user.role 
      }, 
      token 
    };
  }

  /**
   * Checks whether an email and/or username is already taken.
   *
   * Workflow:
   * 1. Check if an email value is provided and query the database
   * 2. Check if a username value is provided and query the database
   * 3. Return availability result
   *
   * Response:
   * - emailExists?: boolean (true if email already exists)
   * - usernameExists?: boolean (true if username already exists)
   *
   * @param email Optional email address to check
   * @param username Optional username to check
   *
   * @returns Object containing availability information
   */
  async checkAvailability(email?: string, username?: string): Promise<{
    emailExists?: boolean;
    usernameExists?: boolean;
  }> {
    const result: { emailExists?: boolean; usernameExists?: boolean } = {};

    if (email) {
      const existingEmail = await prisma.user.findUnique({ where: { email } });
      result.emailExists = !!existingEmail;
    }

    if (username) {
      const existingUsername = await prisma.user.findUnique({ where: { username } });
      result.usernameExists = !!existingUsername;
    }

    return result;
  }

  /**
   * Generates a JWT token for a user.
   * 
   * The token contains:
   * - userId
   * - email
   * - role
   * 
   * @param user Object containing user id, email and role
   * 
   * @returns Signed JWT token valid for 7 days
   */
  private generateToken(user: { id: string; email: string; role: string }): string {
    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as JwtPayload["role"],
    };
    
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
  }
}
