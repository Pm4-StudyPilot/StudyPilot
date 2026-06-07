import { describe, it, expect, beforeEach, mock } from 'bun:test';

type MockUserRecord = {
  id: string;
  email: string;
  username: string;
  password: string;
  role: string;
};

type MockProfileConflict = Pick<MockUserRecord, 'email' | 'username'>;

/**
 * Mock functions for external dependencies.
 *
 * These mocks replace:
 * - bcrypt password hashing/comparison
 * - Prisma database calls
 */
const mockHash = mock(async () => 'hashed-new-password');
const mockCompare = mock(async () => true);

const mockFindById = mock(
  async (): Promise<Omit<MockUserRecord, 'password'> | null> => ({
    id: 'user-1',
    email: 'test@students.zhaw.ch',
    username: 'testuser',
    role: 'USER',
  })
);

const mockFindUniqueWithPassword = mock(
  async (): Promise<Pick<MockUserRecord, 'password'> | null> => ({
    password: 'hashed-current-password',
  })
);

const mockFindFirst = mock(async (): Promise<MockProfileConflict | null> => null);
const mockUpdate = mock(async () => ({}));

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
 * Mock Prisma database module.
 *
 * findUnique is used both for findById (select without password)
 * and for changePassword (select with password).
 * We wire these via mockFindUniqueWithPassword and mockFindById
 * per test via mockResolvedValueOnce.
 */
mock.module('../config/database', () => ({
  prisma: {
    user: {
      findUnique: mockFindUniqueWithPassword,
      findFirst: mockFindFirst,
      update: mockUpdate,
    },
  },
}));

// Import service after mocks are defined
const { UserService } = await import('../services/user.service');

/**
 * Unit tests for UserService.
 *
 * Covered scenarios:
 * - findById returns user DTO
 * - findById returns null for unknown user
 * - changePassword hashes new password and updates user
 * - changePassword throws when user is not found
 * - changePassword throws when current password is incorrect
 */
describe('UserService', () => {
  beforeEach(() => {
    mockHash.mockClear();
    mockCompare.mockClear();
    mockFindById.mockClear();
    mockFindUniqueWithPassword.mockClear();
    mockFindFirst.mockClear();
    mockUpdate.mockClear();

    mockCompare.mockResolvedValue(true);
    mockFindFirst.mockResolvedValue(null);
  });

  describe('findById', () => {
    /**
     * Test case: User exists
     *
     * Scenario:
     * A valid user ID is provided.
     *
     * Expected behavior:
     * - Database is queried with the given ID
     * - User DTO is returned
     */
    it('should return the user DTO when user exists', async () => {
      mockFindUniqueWithPassword.mockResolvedValueOnce({
        id: 'user-1',
        email: 'test@students.zhaw.ch',
        username: 'testuser',
        role: 'USER',
      } as unknown as Pick<MockUserRecord, 'password'>);

      const service = new UserService();
      const result = await service.findById('user-1');

      expect(mockFindUniqueWithPassword).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
        },
      });

      expect(result).toEqual({
        id: 'user-1',
        email: 'test@students.zhaw.ch',
        username: 'testuser',
        role: 'USER',
      });
    });

    /**
     * Test case: User not found
     *
     * Scenario:
     * No user matches the given ID.
     *
     * Expected behavior:
     * - null is returned
     */
    it('should return null when user does not exist', async () => {
      mockFindUniqueWithPassword.mockResolvedValueOnce(null);

      const service = new UserService();
      const result = await service.findById('non-existent-id');

      expect(result).toBeNull();
    });
  });

  describe('changePassword', () => {
    /**
     * Test case: Successful password change
     *
     * Scenario:
     * User provides correct current password and a valid new password.
     *
     * Expected behavior:
     * - Current password is fetched from the database
     * - bcrypt.compare verifies the current password
     * - New password is hashed with bcrypt
     * - User record is updated with the new hashed password
     */
    it('should verify, hash, and update password on success', async () => {
      mockFindUniqueWithPassword.mockResolvedValueOnce({
        password: 'hashed-current-password',
      });

      const service = new UserService();

      await service.changePassword('user-1', 'CurrentPass@123!', 'NewPass@123456!');

      expect(mockFindUniqueWithPassword).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: { password: true },
      });

      expect(mockCompare).toHaveBeenCalledWith('CurrentPass@123!', 'hashed-current-password');
      expect(mockHash).toHaveBeenCalledWith('NewPass@123456!', 10);

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { password: 'hashed-new-password' },
      });
    });

    /**
     * Test case: User not found
     *
     * Scenario:
     * No user matches the provided ID.
     *
     * Expected behavior:
     * - Error "User not found" is thrown
     * - bcrypt and update are never called
     */
    it('should throw if user is not found', async () => {
      mockFindUniqueWithPassword.mockResolvedValueOnce(null);

      const service = new UserService();

      await expect(
        service.changePassword('non-existent-id', 'CurrentPass@123!', 'NewPass@123456!')
      ).rejects.toThrow('User not found');

      expect(mockCompare).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    /**
     * Test case: Incorrect current password
     *
     * Scenario:
     * User exists but the provided current password does not match.
     *
     * Expected behavior:
     * - Error "Current password is incorrect" is thrown
     * - Password update is never called
     */
    it('should throw if current password is incorrect', async () => {
      mockFindUniqueWithPassword.mockResolvedValueOnce({
        password: 'hashed-current-password',
      });

      mockCompare.mockResolvedValueOnce(false);

      const service = new UserService();

      await expect(
        service.changePassword('user-1', 'WrongPass@123!', 'NewPass@123456!')
      ).rejects.toThrow('Current password is incorrect');

      expect(mockHash).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  describe('updateProfile', () => {
    it('should update and return the safe user DTO', async () => {
      mockUpdate.mockResolvedValueOnce({
        id: 'user-1',
        email: 'new@students.zhaw.ch',
        username: 'newuser',
        role: 'USER',
      });

      const service = new UserService();
      const result = await service.updateProfile('user-1', {
        email: 'new@students.zhaw.ch',
        username: 'newuser',
      });

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ email: 'new@students.zhaw.ch' }, { username: 'newuser' }],
          NOT: { id: 'user-1' },
        },
        select: {
          email: true,
          username: true,
        },
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          email: 'new@students.zhaw.ch',
          username: 'newuser',
        },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
        },
      });

      expect(result).toEqual({
        id: 'user-1',
        email: 'new@students.zhaw.ch',
        username: 'newuser',
        role: 'USER',
      });
    });

    it('should throw when the email is already in use', async () => {
      mockFindFirst.mockResolvedValueOnce({
        email: 'taken@students.zhaw.ch',
        username: 'someoneelse',
      });

      const service = new UserService();

      await expect(
        service.updateProfile('user-1', {
          email: 'taken@students.zhaw.ch',
          username: 'newuser',
        })
      ).rejects.toThrow('Email is already in use');

      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });
});
