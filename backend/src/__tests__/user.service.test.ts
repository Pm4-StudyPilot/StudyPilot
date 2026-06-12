import { describe, it, expect, beforeEach, mock } from 'bun:test';

type MockUserRecord = {
  id: string;
  email: string;
  username: string;
  password: string;
  role: string;
};

type MockProfileConflict = Pick<MockUserRecord, 'email' | 'username'>;
type MockFindFirstRecord =
  | Partial<MockUserRecord>
  | MockProfileConflict
  | Pick<MockUserRecord, 'id'>;

/**
 * Mock functions for external dependencies.
 *
 * These mocks replace:
 * - bcrypt password hashing/comparison
 * - Prisma database calls
 */
const mockHash = mock(async () => 'hashed-new-password');
const mockCompare = mock(async () => true);

const mockFindFirst = mock(async (): Promise<MockFindFirstRecord | null> => null);
const mockUpdate = mock(async () => ({}));
const mockCourseShareDeleteMany = mock(async () => ({ count: 0 }));
const mockTransaction = mock(
  async (
    callback: (tx: {
      user: { update: typeof mockUpdate };
      courseShare: { deleteMany: typeof mockCourseShareDeleteMany };
    }) => unknown
  ) =>
    callback({
      user: { update: mockUpdate },
      courseShare: { deleteMany: mockCourseShareDeleteMany },
    })
);

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
 */
mock.module('../config/database', () => ({
  prisma: {
    $transaction: mockTransaction,
    user: {
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
    mockFindFirst.mockClear();
    mockUpdate.mockClear();
    mockCourseShareDeleteMany.mockClear();
    mockTransaction.mockClear();

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
      mockFindFirst.mockResolvedValueOnce({
        id: 'user-1',
        email: 'test@students.zhaw.ch',
        username: 'testuser',
        role: 'USER',
      });

      const service = new UserService();
      const result = await service.findById('user-1');

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { id: 'user-1', deletedAt: null },
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
      mockFindFirst.mockResolvedValueOnce(null);

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
      mockFindFirst.mockResolvedValueOnce({
        password: 'hashed-current-password',
      });

      const service = new UserService();

      await service.changePassword('user-1', 'CurrentPass@123!', 'NewPass@123456!');

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { id: 'user-1', deletedAt: null },
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
      mockFindFirst.mockResolvedValueOnce(null);

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
      mockFindFirst.mockResolvedValueOnce({
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
          deletedAt: null,
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

  describe('deleteAccount', () => {
    it('should soft delete, anonymize, and return the user when the account exists', async () => {
      const softDeletedUser = {
        id: 'user-1',
        email: 'deleted-user-1@deleted.local',
        username: 'deleted-user-1',
        role: 'USER',
      };

      mockFindFirst.mockResolvedValueOnce({ id: 'user-1' });
      mockUpdate.mockResolvedValueOnce(softDeletedUser);

      const service = new UserService();
      const result = await service.deleteAccount('user-1');

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { id: 'user-1', deletedAt: null },
        select: { id: true },
      });

      expect(mockTransaction).toHaveBeenCalled();
      expect(mockCourseShareDeleteMany).toHaveBeenCalledWith({
        where: { sharedWithUserId: 'user-1' },
      });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          email: 'deleted-user-1@deleted.local',
          username: 'deleted-user-1',
          passwordResetToken: null,
          passwordResetExpires: null,
          deletedAt: expect.any(Date),
        },
        select: {
          id: true,
          email: true,
          username: true,
          role: true,
        },
      });

      expect(result).toEqual(softDeletedUser);
    });

    it('should throw when the account does not exist', async () => {
      mockFindFirst.mockResolvedValueOnce(null);

      const service = new UserService();

      await expect(service.deleteAccount('non-existent-id')).rejects.toThrow('User not found');

      expect(mockTransaction).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });
});
