import { describe, it, expect, beforeEach, mock } from 'bun:test';

// Ensure required environment variables exist before importing modules
process.env.JWT_SECRET = 'test-secret';
process.env.RESEND_API_KEY = 'test-resend-key';

type MockUserRecord = {
  id: string;
  email: string;
  username: string;
  password: string;
  role: string;
};

type MockAvailabilityRecord = {
  id: string;
};

type MockResetRecord = {
  id: string;
  email: string;
  password: string;
  passwordResetToken: string | null;
  passwordResetExpires: Date | null;
};

/**
 * Mock functions for external dependencies.
 *
 * These mocks replace:
 * - bcrypt password hashing/comparison
 * - JWT token signing/verification
 * - Prisma database calls
 */
const mockHash = mock(async () => 'hashed-password');
const mockCompare = mock(async () => true);
const mockSign = mock(() => 'fake-jwt-token');

const mockCreate = mock(
  async (): Promise<MockUserRecord> => ({
    id: '1',
    email: 'test@students.zhaw.ch',
    username: 'testuser',
    password: 'hashed-password',
    role: 'student',
  })
);

const mockVerify = mock((token: string, secret: string) => {
  if (secret !== 'test-secret') {
    throw new Error('invalid signature');
  }
  return { userId: 1, email: 'test@students.zhaw.ch', role: 'student' };
});

const mockFindFirst = mock(async (): Promise<MockUserRecord | null> => null);
const mockFindUnique = mock(async (): Promise<MockAvailabilityRecord | null> => null);
const mockUpdate = mock(async () => ({}));

const mockSendPasswordResetEmail = mock(async () => undefined);

/**
 * Mock bcrypt module.
 */
mock.module('bcrypt', () => ({
  default: {
    hash: mockHash,
    compare: mockCompare,
  },
}));

/**
 * Mock jsonwebtoken module.
 */
mock.module('jsonwebtoken', () => ({
  default: {
    sign: mockSign,
    verify: mockVerify,
  },
}));

/**
 * Mock Prisma database module.
 */
mock.module('../config/database', () => ({
  prisma: {
    user: {
      create: mockCreate,
      findFirst: mockFindFirst,
      findUnique: mockFindUnique,
      update: mockUpdate,
    },
  },
}));

/**
 * Mock EmailService to prevent real HTTP calls to Resend.
 */
mock.module('../services/email.service', () => ({
  EmailService: class {
    sendPasswordResetEmail = mockSendPasswordResetEmail;
  },
}));

// Import service after mocks are defined
const { AuthService } = await import('../services/auth.service');

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
describe('AuthService', () => {
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
    mockUpdate.mockClear();
    mockSendPasswordResetEmail.mockClear();

    // reset default behavior where useful
    mockCompare.mockResolvedValue(true);
  });

  /**
   * Test cases for register()
   */
  describe('register', () => {
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
    it('should hash password, create user, and return token', async () => {
      const service = new AuthService();

      const result = await service.register(
        'test@students.zhaw.ch',
        'testuser',
        'Strong@Password123!'
      );

      expect(mockHash).toHaveBeenCalledWith('Strong@Password123!', 10);
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          email: 'test@students.zhaw.ch',
          username: 'testuser',
          password: 'hashed-password',
        },
      });
      expect(mockSign).toHaveBeenCalled();
      expect(result).toEqual({
        user: {
          id: '1',
          email: 'test@students.zhaw.ch',
          username: 'testuser',
          role: 'student',
        },
        token: 'fake-jwt-token',
      });
    });
  });

  /**
   * Test cases for login()
   */
  describe('login', () => {
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
    it('should authenticate user by email', async () => {
      mockFindFirst.mockResolvedValueOnce({
        id: '1',
        email: 'test@students.zhaw.ch',
        username: 'testuser',
        password: 'hashed-password',
        role: 'student',
      });

      const service = new AuthService();

      const result = await service.login('  TEST@students.zhaw.ch  ', 'Strong@Password123!');

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ email: 'test@students.zhaw.ch' }, { username: 'TEST@students.zhaw.ch' }],
        },
      });
      expect(mockCompare).toHaveBeenCalledWith('Strong@Password123!', 'hashed-password');
      expect(mockSign).toHaveBeenCalled();
      expect(result).toEqual({
        user: {
          id: '1',
          email: 'test@students.zhaw.ch',
          username: 'testuser',
          role: 'student',
        },
        token: 'fake-jwt-token',
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
    it('should authenticate user by username', async () => {
      mockFindFirst.mockResolvedValueOnce({
        id: '1',
        email: 'test@students.zhaw.ch',
        username: 'testuser',
        password: 'hashed-password',
        role: 'student',
      });

      const service = new AuthService();

      const result = await service.login('testuser', 'Strong@Password123!');

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ email: 'testuser' }, { username: 'testuser' }],
        },
      });
      expect(mockCompare).toHaveBeenCalledWith('Strong@Password123!', 'hashed-password');
      expect(result.user.username).toBe('testuser');
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
    it('should throw if user is not found', async () => {
      mockFindFirst.mockResolvedValueOnce(null);

      const service = new AuthService();

      await expect(service.login('unknown-user', 'Strong@Password123!')).rejects.toThrow(
        'Invalid credentials'
      );
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
    it('should throw if password is invalid', async () => {
      mockFindFirst.mockResolvedValueOnce({
        id: '1',
        email: 'test@students.zhaw.ch',
        username: 'testuser',
        password: 'hashed-password',
        role: 'student',
      });

      mockCompare.mockResolvedValueOnce(false);

      const service = new AuthService();

      await expect(service.login('testuser', 'WrongPassword123!')).rejects.toThrow(
        'Invalid credentials'
      );
    });
  });

  /**
   * Test cases for checkAvailability()
   */
  describe('checkAvailability', () => {
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
    it('should return emailExists and usernameExists', async () => {
      mockFindUnique
        .mockResolvedValueOnce({ id: '1' }) // email exists
        .mockResolvedValueOnce(null); // username does not exist

      const service = new AuthService();

      const result = await service.checkAvailability('test@students.zhaw.ch', 'newuser');

      expect(mockFindUnique).toHaveBeenNthCalledWith(1, {
        where: { email: 'test@students.zhaw.ch' },
      });
      expect(mockFindUnique).toHaveBeenNthCalledWith(2, {
        where: { username: 'newuser' },
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
    it('should check only email if username is not provided', async () => {
      mockFindUnique.mockResolvedValueOnce(null);

      const service = new AuthService();

      const result = await service.checkAvailability('free@students.zhaw.ch');

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { email: 'free@students.zhaw.ch' },
      });
      expect(result).toEqual({
        emailExists: false,
      });
    });
  });

  /**
   * Test cases for requestPasswordReset()
   */
  describe('requestPasswordReset', () => {
    /**
     * Test case: User exists
     *
     * Scenario:
     * A reset is requested for a registered email address.
     *
     * Expected behavior:
     * - User is looked up by email
     * - A reset token and expiry are stored on the user
     * - The same token is passed to the email service
     */
    it('should update user with reset token and send email when user exists', async () => {
      mockFindUnique.mockResolvedValueOnce({
        id: '1',
        email: 'test@students.zhaw.ch',
        password: 'hashed-password',
        passwordResetToken: null,
        passwordResetExpires: null,
      } as MockResetRecord);
      mockUpdate.mockResolvedValueOnce({});

      const service = new AuthService();
      await service.requestPasswordReset('test@students.zhaw.ch');

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { email: 'test@students.zhaw.ch' },
      });

      // Verify the token saved to DB matches the one sent via email
      const savedToken = (
        mockUpdate.mock.calls[0] as unknown as [{ data: { passwordResetToken: string } }]
      )[0].data.passwordResetToken;
      expect(typeof savedToken).toBe('string');
      expect(savedToken.length).toBe(64); // 32 bytes as hex

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: '1' },
          data: expect.objectContaining({
            passwordResetToken: savedToken,
            passwordResetExpires: expect.any(Date),
          }),
        })
      );

      expect(mockSendPasswordResetEmail).toHaveBeenCalledWith('test@students.zhaw.ch', savedToken);
    });

    /**
     * Test case: User does not exist
     *
     * Scenario:
     * A reset is requested for an email address that is not registered.
     *
     * Expected behavior:
     * - Returns without error (prevents email enumeration)
     * - No database update is performed
     * - No email is sent
     */
    it('should return silently without updating DB or sending email when user is not found', async () => {
      mockFindUnique.mockResolvedValueOnce(null);

      const service = new AuthService();
      await service.requestPasswordReset('unknown@students.zhaw.ch');

      expect(mockUpdate).not.toHaveBeenCalled();
      expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  /**
   * Test cases for resetPassword()
   */
  describe('resetPassword', () => {
    /**
     * Test case: Valid token
     *
     * Scenario:
     * A valid, non-expired reset token and a new password are provided.
     *
     * Expected behavior:
     * - User is found by reset token
     * - New password is hashed
     * - Password is updated and reset token fields are cleared
     */
    it('should hash new password and clear reset token on valid token', async () => {
      mockFindUnique.mockResolvedValueOnce({
        id: '1',
        email: 'test@students.zhaw.ch',
        password: 'hashed-password',
        passwordResetToken: 'valid-token',
        passwordResetExpires: new Date(Date.now() + 60 * 60 * 1000),
      } as MockResetRecord);
      mockUpdate.mockResolvedValueOnce({});

      const service = new AuthService();
      await service.resetPassword('valid-token', 'NewStrong@Password123!');

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { passwordResetToken: 'valid-token' },
      });
      expect(mockHash).toHaveBeenCalledWith('NewStrong@Password123!', 10);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          password: 'hashed-password', // returned by mockHash
          passwordResetToken: null,
          passwordResetExpires: null,
        },
      });
    });

    /**
     * Test case: Token not found
     *
     * Scenario:
     * The provided token does not match any user.
     *
     * Expected behavior:
     * - Throws "Invalid or expired password reset token"
     * - No database update is performed
     */
    it('should throw if token is not found', async () => {
      mockFindUnique.mockResolvedValueOnce(null);

      const service = new AuthService();

      await expect(
        service.resetPassword('invalid-token', 'NewStrong@Password123!')
      ).rejects.toThrow('Invalid or expired password reset token');

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    /**
     * Test case: Token expired
     *
     * Scenario:
     * The token exists in the database but its expiry date has passed.
     *
     * Expected behavior:
     * - Throws "Invalid or expired password reset token"
     * - No database update is performed
     */
    it('should throw if token is expired', async () => {
      mockFindUnique.mockResolvedValueOnce({
        id: '1',
        email: 'test@students.zhaw.ch',
        password: 'hashed-password',
        passwordResetToken: 'expired-token',
        passwordResetExpires: new Date(Date.now() - 1000), // 1 second in the past
      } as MockResetRecord);

      const service = new AuthService();

      await expect(
        service.resetPassword('expired-token', 'NewStrong@Password123!')
      ).rejects.toThrow('Invalid or expired password reset token');

      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });
});
