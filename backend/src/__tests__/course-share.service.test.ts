import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { CourseShareService, ShareError } from '../services/course-share.service';

type MockCourseRecord = {
  id: string;
  ownerId: string;
};

type MockUserRecord = {
  id: string;
  username: string;
  email: string;
};

type MockCourseShareRecord = {
  id: string;
  courseId: string;
  sharedWithUserId: string;
  sharedByUserId: string;
  createdAt: Date;
};

type MockCourseShareWithUsersRecord = MockCourseShareRecord & {
  sharedWithUser: {
    id: string;
    username: string;
    email: string;
  };
};

type MockSharedCourseRecord = MockCourseShareRecord & {
  course: {
    id: string;
    name: string;
    ownerId: string;
  };
  sharedByUser: {
    username: string;
  };
};

const mockCourseFindFirst = mock(async (): Promise<MockCourseRecord | null> => null);

const mockUserFindFirst = mock(async (): Promise<MockUserRecord | null> => null);

const mockCourseShareFindFirst = mock(async (): Promise<MockCourseShareRecord | null> => null);

const mockCourseShareCreate = mock(
  async (): Promise<MockCourseShareRecord> => ({
    id: 'share-1',
    courseId: 'course-1',
    sharedWithUserId: 'user-shared',
    sharedByUserId: 'user-owner',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  })
);

const mockCourseShareDeleteMany = mock(async (): Promise<{ count: number }> => ({ count: 0 }));

const mockCourseShareFindMany = mock(
  async (): Promise<Array<MockCourseShareWithUsersRecord | MockSharedCourseRecord>> => []
);

function buildService(): CourseShareService {
  const db = {
    course: {
      findFirst: mockCourseFindFirst,
    },
    user: {
      findFirst: mockUserFindFirst,
    },
    courseShare: {
      findFirst: mockCourseShareFindFirst,
      create: mockCourseShareCreate,
      deleteMany: mockCourseShareDeleteMany,
      findMany: mockCourseShareFindMany,
    },
  };

  return new CourseShareService(
    db as unknown as ConstructorParameters<typeof CourseShareService>[0]
  );
}

describe('CourseShareService', () => {
  let service: CourseShareService;

  beforeEach(() => {
    mockCourseFindFirst.mockClear();
    mockUserFindFirst.mockClear();
    mockCourseShareFindFirst.mockClear();
    mockCourseShareCreate.mockClear();
    mockCourseShareDeleteMany.mockClear();
    mockCourseShareFindMany.mockClear();

    service = buildService();
  });

  describe('shareWith', () => {
    it('should share a course with a user by username', async () => {
      mockCourseFindFirst.mockResolvedValueOnce({
        id: 'course-1',
        ownerId: 'user-owner',
      });

      mockUserFindFirst.mockResolvedValueOnce({
        id: 'user-shared',
        username: 'shared',
        email: 'shared@test.com',
      });

      mockCourseShareFindFirst.mockResolvedValueOnce(null);

      const share = await service.shareWith('course-1', 'user-owner', 'shared');

      expect(mockCourseFindFirst).toHaveBeenCalledWith({
        where: {
          id: 'course-1',
          ownerId: 'user-owner',
        },
      });

      expect(mockUserFindFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ username: 'shared' }, { email: 'shared' }],
        },
      });

      expect(mockCourseShareFindFirst).toHaveBeenCalledWith({
        where: {
          courseId: 'course-1',
          sharedWithUserId: 'user-shared',
        },
      });

      expect(mockCourseShareCreate).toHaveBeenCalledWith({
        data: {
          courseId: 'course-1',
          sharedWithUserId: 'user-shared',
          sharedByUserId: 'user-owner',
        },
      });

      expect(share.courseId).toBe('course-1');
      expect(share.sharedWithUserId).toBe('user-shared');
      expect(share.sharedByUserId).toBe('user-owner');
    });

    it('should share a course with a user by email', async () => {
      mockCourseFindFirst.mockResolvedValueOnce({
        id: 'course-1',
        ownerId: 'user-owner',
      });

      mockUserFindFirst.mockResolvedValueOnce({
        id: 'user-shared',
        username: 'shared',
        email: 'shared@test.com',
      });

      mockCourseShareFindFirst.mockResolvedValueOnce(null);

      const share = await service.shareWith('course-1', 'user-owner', 'shared@test.com');

      expect(mockUserFindFirst).toHaveBeenCalledWith({
        where: {
          OR: [{ username: 'shared@test.com' }, { email: 'shared@test.com' }],
        },
      });

      expect(share.courseId).toBe('course-1');
      expect(share.sharedWithUserId).toBe('user-shared');
    });

    it('should throw ShareError.CourseNotFound if course does not exist', async () => {
      mockCourseFindFirst.mockResolvedValueOnce(null);

      await expect(service.shareWith('non-existent-id', 'user-owner', 'anyone')).rejects.toThrow(
        'Course not found'
      );

      mockCourseFindFirst.mockResolvedValueOnce(null);

      await expect(
        service.shareWith('non-existent-id', 'user-owner', 'anyone')
      ).rejects.toBeInstanceOf(ShareError);

      expect(mockCourseFindFirst).toHaveBeenCalledWith({
        where: {
          id: 'non-existent-id',
          ownerId: 'user-owner',
        },
      });
      expect(mockUserFindFirst).not.toHaveBeenCalled();
      expect(mockCourseShareFindFirst).not.toHaveBeenCalled();
      expect(mockCourseShareCreate).not.toHaveBeenCalled();
    });

    it('should throw ShareError.CourseNotFound if user is not the owner', async () => {
      mockCourseFindFirst.mockResolvedValueOnce(null);

      await expect(service.shareWith('course-1', 'not-owner', 'anyone')).rejects.toThrow(
        'Course not found'
      );

      mockCourseFindFirst.mockResolvedValueOnce(null);

      await expect(service.shareWith('course-1', 'not-owner', 'anyone')).rejects.toBeInstanceOf(
        ShareError
      );

      expect(mockCourseFindFirst).toHaveBeenCalledWith({
        where: {
          id: 'course-1',
          ownerId: 'not-owner',
        },
      });

      expect(mockUserFindFirst).not.toHaveBeenCalled();
      expect(mockCourseShareCreate).not.toHaveBeenCalled();
    });

    it('should throw ShareError.UserNotFound if user to share with does not exist', async () => {
      mockCourseFindFirst.mockResolvedValueOnce({
        id: 'course-1',
        ownerId: 'user-owner',
      });

      mockUserFindFirst.mockResolvedValueOnce(null);

      await expect(service.shareWith('course-1', 'user-owner', 'missing-user')).rejects.toThrow(
        'User not found'
      );

      mockCourseFindFirst.mockResolvedValueOnce({
        id: 'course-1',
        ownerId: 'user-owner',
      });

      mockUserFindFirst.mockResolvedValueOnce(null);

      await expect(
        service.shareWith('course-1', 'user-owner', 'missing-user')
      ).rejects.toBeInstanceOf(ShareError);

      expect(mockCourseShareFindFirst).not.toHaveBeenCalled();
      expect(mockCourseShareCreate).not.toHaveBeenCalled();
    });

    it('should throw ShareError.SelfShare when sharing with oneself', async () => {
      mockCourseFindFirst.mockResolvedValueOnce({
        id: 'course-1',
        ownerId: 'user-owner',
      });

      mockUserFindFirst.mockResolvedValueOnce({
        id: 'user-owner',
        username: 'owner',
        email: 'owner@test.com',
      });

      await expect(service.shareWith('course-1', 'user-owner', 'owner')).rejects.toThrow(
        'Cannot share course with yourself'
      );

      mockCourseFindFirst.mockResolvedValueOnce({
        id: 'course-1',
        ownerId: 'user-owner',
      });

      mockUserFindFirst.mockResolvedValueOnce({
        id: 'user-owner',
        username: 'owner',
        email: 'owner@test.com',
      });

      await expect(service.shareWith('course-1', 'user-owner', 'owner')).rejects.toBeInstanceOf(
        ShareError
      );

      expect(mockCourseShareFindFirst).not.toHaveBeenCalled();
      expect(mockCourseShareCreate).not.toHaveBeenCalled();
    });

    it('should throw ShareError.AlreadyShared if course is already shared with the user', async () => {
      mockCourseFindFirst.mockResolvedValueOnce({
        id: 'course-1',
        ownerId: 'user-owner',
      });

      mockUserFindFirst.mockResolvedValueOnce({
        id: 'user-shared',
        username: 'shared',
        email: 'shared@test.com',
      });

      mockCourseShareFindFirst.mockResolvedValueOnce({
        id: 'share-existing',
        courseId: 'course-1',
        sharedWithUserId: 'user-shared',
        sharedByUserId: 'user-owner',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      });

      await expect(service.shareWith('course-1', 'user-owner', 'shared')).rejects.toThrow(
        'Course already shared with this user'
      );

      mockCourseFindFirst.mockResolvedValueOnce({
        id: 'course-1',
        ownerId: 'user-owner',
      });

      mockUserFindFirst.mockResolvedValueOnce({
        id: 'user-shared',
        username: 'shared',
        email: 'shared@test.com',
      });

      mockCourseShareFindFirst.mockResolvedValueOnce({
        id: 'share-existing',
        courseId: 'course-1',
        sharedWithUserId: 'user-shared',
        sharedByUserId: 'user-owner',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      });

      await expect(service.shareWith('course-1', 'user-owner', 'shared')).rejects.toBeInstanceOf(
        ShareError
      );

      expect(mockCourseShareCreate).not.toHaveBeenCalled();
    });
  });

  describe('unshareWith', () => {
    it('should return false if requester is not the course owner', async () => {
      mockCourseFindFirst.mockResolvedValueOnce(null);

      const result = await service.unshareWith('course-1', 'not-owner', 'user-shared');

      expect(mockCourseFindFirst).toHaveBeenCalledWith({
        where: {
          id: 'course-1',
          ownerId: 'not-owner',
        },
      });
      expect(result).toBe(false);
      expect(mockCourseShareDeleteMany).not.toHaveBeenCalled();
    });

    it('should return false when no share is removed', async () => {
      mockCourseFindFirst.mockResolvedValueOnce({
        id: 'course-1',
        ownerId: 'user-owner',
      });

      mockCourseShareDeleteMany.mockResolvedValueOnce({ count: 0 });

      const result = await service.unshareWith('course-1', 'user-owner', 'user-shared');

      expect(result).toBe(false);
    });

    it('should return true when a share is removed', async () => {
      mockCourseFindFirst.mockResolvedValueOnce({
        id: 'course-1',
        ownerId: 'user-owner',
      });

      mockCourseShareDeleteMany.mockResolvedValueOnce({ count: 1 });

      const result = await service.unshareWith('course-1', 'user-owner', 'user-shared');

      expect(mockCourseShareDeleteMany).toHaveBeenCalledWith({
        where: {
          courseId: 'course-1',
          sharedWithUserId: 'user-shared',
          sharedByUserId: 'user-owner',
        },
      });

      expect(result).toBe(true);
    });
  });

  describe('getUsersWithAccess', () => {
    it('should return an empty array if requester is not the course owner', async () => {
      mockCourseFindFirst.mockResolvedValueOnce(null);

      const result = await service.getUsersWithAccess('course-1', 'not-owner');

      expect(result).toEqual([]);
      expect(mockCourseShareFindMany).not.toHaveBeenCalled();
    });

    it('should return users with access when requester is owner', async () => {
      const sharedAt = new Date('2026-01-01T00:00:00.000Z');

      mockCourseFindFirst.mockResolvedValueOnce({
        id: 'course-1',
        ownerId: 'user-owner',
      });

      mockCourseShareFindMany.mockResolvedValueOnce([
        {
          id: 'share-1',
          courseId: 'course-1',
          sharedWithUserId: 'user-shared',
          sharedByUserId: 'user-owner',
          createdAt: sharedAt,
          sharedWithUser: {
            id: 'user-shared',
            username: 'shared',
            email: 'shared@test.com',
          },
        },
      ]);

      const result = await service.getUsersWithAccess('course-1', 'user-owner');

      expect(mockCourseShareFindMany).toHaveBeenCalledWith({
        where: { courseId: 'course-1' },
        include: {
          sharedWithUser: {
            select: { id: true, username: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toEqual([
        {
          id: 'user-shared',
          username: 'shared',
          email: 'shared@test.com',
          sharedAt,
        },
      ]);
    });
  });

  describe('checkAccess', () => {
    it('should return false if course does not exist', async () => {
      mockCourseFindFirst.mockResolvedValueOnce(null);

      const result = await service.checkAccess('course-1', 'user-1');

      expect(mockCourseFindFirst).toHaveBeenCalledWith({
        where: { id: 'course-1' },
      });
      expect(result).toBe(false);
      expect(mockCourseShareFindFirst).not.toHaveBeenCalled();
    });

    it('should return true if user owns the course', async () => {
      mockCourseFindFirst.mockResolvedValueOnce({
        id: 'course-1',
        ownerId: 'user-1',
      });

      const result = await service.checkAccess('course-1', 'user-1');

      expect(result).toBe(true);
      expect(mockCourseShareFindFirst).not.toHaveBeenCalled();
    });

    it('should return true if course is shared with user', async () => {
      mockCourseFindFirst.mockResolvedValueOnce({
        id: 'course-1',
        ownerId: 'owner',
      });

      mockCourseShareFindFirst.mockResolvedValueOnce({
        id: 'share-1',
        courseId: 'course-1',
        sharedWithUserId: 'shared-user',
        sharedByUserId: 'owner',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      });

      const result = await service.checkAccess('course-1', 'shared-user');

      expect(result).toBe(true);
      expect(mockCourseShareFindFirst).toHaveBeenCalledWith({
        where: {
          courseId: 'course-1',
          sharedWithUserId: 'shared-user',
        },
      });
    });

    it('should return false if user is neither owner nor shared user', async () => {
      mockCourseFindFirst.mockResolvedValueOnce({
        id: 'course-1',
        ownerId: 'owner',
      });

      mockCourseShareFindFirst.mockResolvedValueOnce(null);

      const result = await service.checkAccess('course-1', 'stranger');

      expect(result).toBe(false);
    });
  });

  describe('getSharedCourses', () => {
    it('should return courses shared with a user', async () => {
      const sharedAt = new Date('2026-01-01T00:00:00.000Z');

      mockCourseShareFindMany.mockResolvedValueOnce([
        {
          id: 'share-1',
          courseId: 'course-1',
          sharedWithUserId: 'shared-user',
          sharedByUserId: 'owner',
          createdAt: sharedAt,
          course: {
            id: 'course-1',
            name: 'Biology',
            ownerId: 'owner',
          },
          sharedByUser: {
            username: 'owner-user',
          },
        },
      ]);

      const result = await service.getSharedCourses('shared-user');

      expect(mockCourseShareFindMany).toHaveBeenCalledWith({
        where: { sharedWithUserId: 'shared-user' },
        include: {
          course: {
            select: { id: true, name: true, ownerId: true },
          },
          sharedByUser: {
            select: { username: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toEqual([
        {
          id: 'course-1',
          name: 'Biology',
          ownerId: 'owner',
          ownerUsername: 'owner-user',
          sharedAt,
        },
      ]);
    });
  });
});
