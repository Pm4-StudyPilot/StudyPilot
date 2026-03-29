import { describe, it, expect, beforeEach, mock } from "bun:test";

// Ensure JWT secret exists before importing AuthService
process.env.JWT_SECRET = "test-secret";

/**
 * Mock functions for external dependencies.
 *
 * These mocks replace:
 * - bcrypt password hashing/comparison
 * - JWT token signing/verification
 * - Prisma database calls
 */
const mockHash = mock(async () => "hashed-password");
const mockCompare = mock(async () => true);
const mockSign = mock(() => "fake-jwt-token");

const mockCreate = mock(async () => ({
  id: "1",
  email: "test@students.zhaw.ch",
  username: "testuser",
  password: "hashed-password",
  role: "student",
} as any));

const mockVerify = mock((token: string, secret: string) => {
  if (secret !== "test-secret") {
    throw new Error("invalid signature");
  }
  return { userId: 1, email: "test@students.zhaw.ch", role: "student" };
});

const mockFindFirst = mock(async () => null as any);
const mockFindUnique = mock(async () => null as any);

/**
 * Mock bcrypt module.
 */
mock.module("bcrypt", () => ({
  default: {
    hash: mockHash,
    compare: mockCompare,
  },
}));

/**
 * Mock jsonwebtoken module.
 */
mock.module("jsonwebtoken", () => ({
  default: {
    sign: mockSign,
    verify: mockVerify,
  },
}));

/**
 * Mock Prisma database module.
 */
mock.module("../config/database", () => ({
  prisma: {
    user: {
      create: mockCreate,
      findFirst: mockFindFirst,
      findUnique: mockFindUnique,
    },
  },
}));

// Import service after mocks are defined
const { AuthService } = await import("../services/auth.service");

/**
 * Unit tests for AuthService.
 *
 * Covered scenarios:
 * - successful registration
 * - successful login with email
 * - successful login with username
 * - login failure for unknown user
 * - login failure for wrong password
 * - availability checks
 */
describe("AuthService", () => {
  /**
   * Reset all mocks before each test to avoid leaking state
   * between test cases.
   */
  beforeEach(() => {
    mockHash.mockClear();
    mockCompare.mockClear();
    mockSign.mockClear();
    mockVerify.mockClear();
    mockCreate.mockClear();
    mockFindFirst.mockClear();
    mockFindUnique.mockClear();

    // reset default behavior where useful
    mockCompare.mockResolvedValue(true);
  });

  /**
   * Test cases for register()
   */
  describe("register", () => {
    /**
     * Test case: Successful registration
     *
     * Scenario:
     * A new user registers with valid email, username, and password.
     *
     * Expected behavior:
     * - Password is hashed with bcrypt
     * - User is created in the database
     * - JWT token is generated
     * - Safe user data and token are returned
     */
    it("should hash password, create user, and return token", async () => {
      const service = new AuthService();

      const result = await service.register(
        "test@students.zhaw.ch",
        "testuser",
        "Strong@Password123!"
      );

      expect(mockHash).toHaveBeenCalledWith("Strong@Password123!", 10);
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          email: "test@students.zhaw.ch",
          username: "testuser",
          password: "hashed-password",
        },
      });
      expect(mockSign).toHaveBeenCalled();
      expect(result).toEqual({
        user: {
          id: "1",
          email: "test@students.zhaw.ch",
          username: "testuser",
          role: "student",
        },
        token: "fake-jwt-token",
      });
    });
  });

  /**
   * Test cases for login()
   */
  describe("login", () => {
    /**
     * Test case: Successful login with email
     *
     * Scenario:
     * A valid email and password are provided.
     *
     * Expected behavior:
     * - User is searched by identifier (email or username)
     * - Password is verified
     * - JWT token is generated
     * - Safe user data and token are returned
     */
    it("should authenticate user by email", async () => {
      mockFindFirst.mockResolvedValueOnce({
        id: "1",
        email: "test@students.zhaw.ch",
        username: "testuser",
        password: "hashed-password",
        role: "student",
      } as any);

      const service = new AuthService();

      const result = await service.login("  TEST@students.zhaw.ch  ", "Strong@Password123!");

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { email: "test@students.zhaw.ch" },
            { username: "TEST@students.zhaw.ch" },
          ],
        },
      });
      expect(mockCompare).toHaveBeenCalledWith("Strong@Password123!", "hashed-password");
      expect(mockSign).toHaveBeenCalled();
      expect(result).toEqual({
        user: {
          id: "1",
          email: "test@students.zhaw.ch",
          username: "testuser",
          role: "student",
        },
        token: "fake-jwt-token",
      });
    });

    /**
     * Test case: Successful login with username
     *
     * Scenario:
     * A valid username and password are provided.
     *
     * Expected behavior:
     * - User is searched by identifier (email or username)
     * - Password is verified
     * - JWT token is generated
     * - Safe user data and token are returned
     */
    it("should authenticate user by username", async () => {
      mockFindFirst.mockResolvedValueOnce({
        id: "1",
        email: "test@students.zhaw.ch",
        username: "testuser",
        password: "hashed-password",
        role: "student",
      } as any);

      const service = new AuthService();

      const result = await service.login("testuser", "Strong@Password123!");

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { email: "testuser" },
            { username: "testuser" },
          ],
        },
      });
      expect(mockCompare).toHaveBeenCalledWith("Strong@Password123!", "hashed-password");
      expect(result.user.username).toBe("testuser");
    });

    /**
     * Test case: Unknown user
     *
     * Scenario:
     * No user matches the provided identifier.
     *
     * Expected behavior:
     * - Login is rejected
     * - Error "Invalid credentials" is thrown
     */
    it("should throw if user is not found", async () => {
      mockFindFirst.mockResolvedValueOnce(null as any);

      const service = new AuthService();

      await expect(
        service.login("unknown-user", "Strong@Password123!")
      ).rejects.toThrow("Invalid credentials");
    });

    /**
     * Test case: Wrong password
     *
     * Scenario:
     * A user exists, but bcrypt password comparison fails.
     *
     * Expected behavior:
     * - Login is rejected
     * - Error "Invalid credentials" is thrown
     */
    it("should throw if password is invalid", async () => {
      mockFindFirst.mockResolvedValueOnce({
        id: "1",
        email: "test@students.zhaw.ch",
        username: "testuser",
        password: "hashed-password",
        role: "student",
      } as any);

      mockCompare.mockResolvedValueOnce(false);

      const service = new AuthService();

      await expect(
        service.login("testuser", "WrongPassword123!")
      ).rejects.toThrow("Invalid credentials");
    });
  });

  /**
   * Test cases for checkAvailability()
   */
  describe("checkAvailability", () => {
    /**
     * Test case: Email and username availability
     *
     * Scenario:
     * Both email and username are checked.
     *
     * Expected behavior:
     * - Database is queried for both values
     * - Availability result is returned correctly
     */
    it("should return emailExists and usernameExists", async () => {
      mockFindUnique
        .mockResolvedValueOnce({ id: "1" } as any) // email exists
        .mockResolvedValueOnce(null as any); // username does not exist

      const service = new AuthService();

      const result = await service.checkAvailability(
        "test@students.zhaw.ch",
        "newuser"
      );

      expect(mockFindUnique).toHaveBeenNthCalledWith(1, {
        where: { email: "test@students.zhaw.ch" },
      });
      expect(mockFindUnique).toHaveBeenNthCalledWith(2, {
        where: { username: "newuser" },
      });
      expect(result).toEqual({
        emailExists: true,
        usernameExists: false,
      });
    });

    /**
     * Test case: Only email provided
     *
     * Scenario:
     * Only an email is checked for availability.
     *
     * Expected behavior:
     * - Only email query is executed
     * - Result contains only emailExists
     */
    it("should check only email if username is not provided", async () => {
      mockFindUnique.mockResolvedValueOnce(null as any);

      const service = new AuthService();

      const result = await service.checkAvailability("free@students.zhaw.ch");

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { email: "free@students.zhaw.ch" },
      });
      expect(result).toEqual({
        emailExists: false,
      });
    });
  });
});