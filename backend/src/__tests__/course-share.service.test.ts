import { describe, it, expect, beforeAll, afterEach } from 'bun:test';
import { CourseShareService, ShareError } from '../services/course-share.service';
import { prisma } from '../config/database';
import { cleanup, createUser, createCourse, createCourseShare } from './helpers';

describe('CourseShareService', () => {
  let service: CourseShareService;

  beforeAll(() => {
    service = new CourseShareService(prisma);
  });

  afterEach(async () => {
    await cleanup();
  });

  describe('shareWith', () => {
    it('should share a course with a user by username', async () => {
      const owner = await createUser({ username: 'owner', email: 'owner@test.com' });
      const userToShareWith = await createUser({
        username: 'shared',
        email: 'shared@test.com',
      });
      const course = await createCourse({ ownerId: owner.id });

      const share = await service.shareWith(course.id, owner.id, userToShareWith.username);

      expect(share).toBeDefined();
      expect(share.courseId).toBe(course.id);
      expect(share.sharedWithUserId).toBe(userToShareWith.id);
    });

    it('should share a course with a user by email', async () => {
      const owner = await createUser({ username: 'owner', email: 'owner@test.com' });
      const userToShareWith = await createUser({
        username: 'shared',
        email: 'shared@test.com',
      });
      const course = await createCourse({ ownerId: owner.id });

      const share = await service.shareWith(course.id, owner.id, userToShareWith.email);

      expect(share).toBeDefined();
      expect(share.courseId).toBe(course.id);
      expect(share.sharedWithUserId).toBe(userToShareWith.id);
    });

    it('should throw ShareError.CourseNotFound if course does not exist', async () => {
      const owner = await createUser({ username: 'owner', email: 'owner@test.com' });
      await expect(service.shareWith('non-existent-id', owner.id, 'anyone')).rejects.toThrow(
        new ShareError('CourseNotFound', 'Course not found')
      );
    });

    it('should throw ShareError.CourseNotFound if user is not the owner', async () => {
      const owner = await createUser({ username: 'owner', email: 'owner@test.com' });
      const notOwner = await createUser({
        username: 'not-owner',
        email: 'not-owner@test.com',
      });
      const course = await createCourse({ ownerId: owner.id });

      await expect(service.shareWith(course.id, notOwner.id, 'anyone')).rejects.toThrow(
        new ShareError('CourseNotFound', 'Course not found')
      );
    });

    it('should throw ShareError.UserNotFound if user to share with does not exist', async () => {
      const owner = await createUser({ username: 'owner', email: 'owner@test.com' });
      const course = await createCourse({ ownerId: owner.id });

      await expect(service.shareWith(course.id, owner.id, 'non-existent-user')).rejects.toThrow(
        new ShareError('UserNotFound', 'User not found')
      );
    });

    it('should throw ShareError.SelfShare when sharing with oneself', async () => {
      const owner = await createUser({ username: 'owner', email: 'owner@test.com' });
      const course = await createCourse({ ownerId: owner.id });

      await expect(service.shareWith(course.id, owner.id, owner.username)).rejects.toThrow(
        new ShareError('SelfShare', 'Cannot share course with yourself')
      );
    });

    it('should throw ShareError.AlreadyShared if course is already shared with the user', async () => {
      const owner = await createUser({ username: 'owner', email: 'owner@test.com' });
      const userToShareWith = await createUser({
        username: 'shared',
        email: 'shared@test.com',
      });
      const course = await createCourse({ ownerId: owner.id });
      await createCourseShare({
        courseId: course.id,
        sharedByUserId: owner.id,
        sharedWithUserId: userToShareWith.id,
      });

      await expect(
        service.shareWith(course.id, owner.id, userToShareWith.username)
      ).rejects.toThrow(new ShareError('AlreadyShared', 'Course already shared with this user'));
    });
  });
});
