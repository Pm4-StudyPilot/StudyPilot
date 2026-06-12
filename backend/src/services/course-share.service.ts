import { prisma } from '../config/database';
import { logger } from '../lib/logger';
import type { PrismaClient } from '../generated/prisma/client';
import { NotificationService } from './notification.service';

export class ShareError extends Error {
  public type: 'CourseNotFound' | 'UserNotFound' | 'SelfShare' | 'AlreadyShared';

  constructor(
    type: 'CourseNotFound' | 'UserNotFound' | 'SelfShare' | 'AlreadyShared',
    message: string
  ) {
    super(message);
    this.type = type;
  }
}

export interface CourseShareDto {
  id: string;
  courseId: string;
  sharedWithUserId: string;
  sharedByUserId: string;
  createdAt: Date;
}

export class CourseShareService {
  constructor(
    private readonly db: PrismaClient = prisma,
    private readonly notificationService: Pick<
      NotificationService,
      'createCourseSharedNotification'
    > = new NotificationService(db)
  ) {}

  /**
   * Share a course with another user
   * Prevents duplicate shares and validates both users exist
   */
  async shareWith(
    courseId: string,
    sharedByUserId: string,
    sharedWithUsername: string
  ): Promise<CourseShareDto> {
    // Verify the user is the course owner
    const course = await this.db.course.findFirst({
      where: { id: courseId, ownerId: sharedByUserId },
      select: { id: true, name: true },
    });
    if (!course) throw new ShareError('CourseNotFound', 'Course not found');

    const sharingUser = await this.db.user.findUnique({
      where: { id: sharedByUserId },
      select: { username: true },
    });

    // Find the user to share with by username or email
    const userToShareWith = await this.db.user.findFirst({
      where: {
        OR: [{ username: sharedWithUsername }, { email: sharedWithUsername }],
      },
    });
    if (!userToShareWith) throw new ShareError('UserNotFound', 'User not found');

    // Prevent self-sharing
    if (userToShareWith.id === sharedByUserId)
      throw new ShareError('SelfShare', 'Cannot share course with yourself');

    // Check if already shared
    const existingShare = await this.db.courseShare.findFirst({
      where: {
        courseId,
        sharedWithUserId: userToShareWith.id,
      },
    });
    if (existingShare)
      throw new ShareError('AlreadyShared', 'Course already shared with this user');

    try {
      const share = await this.db.courseShare.create({
        data: {
          courseId,
          sharedWithUserId: userToShareWith.id,
          sharedByUserId,
        },
      });

      await this.notificationService.createCourseSharedNotification({
        recipientId: userToShareWith.id,
        courseId,
        courseName: course.name,
        sharedByUsername: sharingUser?.username ?? 'A StudyPilot user',
      });

      return share;
    } catch (error: unknown) {
      logger.error({ error }, '[CourseShareService] Failed to share course');
      throw error;
    }
  }

  /**
   * Remove course share with a user
   */
  async unshareWith(
    courseId: string,
    sharedByUserId: string,
    sharedWithUserId: string
  ): Promise<boolean> {
    // Verify the user is the course owner
    const course = await this.db.course.findFirst({
      where: { id: courseId, ownerId: sharedByUserId },
    });
    if (!course) return false;

    const result = await this.db.courseShare.deleteMany({
      where: {
        courseId,
        sharedWithUserId,
        sharedByUserId,
      },
    });

    return result.count > 0;
  }

  /**
   * Get all users a course is shared with
   */
  async getUsersWithAccess(
    courseId: string,
    requestingUserId: string
  ): Promise<
    Array<{
      id: string;
      username: string;
      email: string;
      sharedAt: Date;
    }>
  > {
    // Verify the user is the course owner
    const course = await this.db.course.findFirst({
      where: { id: courseId, ownerId: requestingUserId },
    });
    if (!course) return [];

    const shares = await this.db.courseShare.findMany({
      where: { courseId },
      include: {
        sharedWithUser: {
          select: { id: true, username: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return shares.map((share) => ({
      id: share.sharedWithUser.id,
      username: share.sharedWithUser.username,
      email: share.sharedWithUser.email,
      sharedAt: share.createdAt,
    }));
  }

  /**
   * Check if a user has access to a course
   * Returns true if user is the owner OR course is shared with them
   */
  async checkAccess(courseId: string, userId: string): Promise<boolean> {
    const course = await this.db.course.findFirst({
      where: { id: courseId },
    });
    if (!course) return false;

    // User is the owner
    if (course.ownerId === userId) return true;

    // Check if course is shared with user
    const share = await this.db.courseShare.findFirst({
      where: {
        courseId,
        sharedWithUserId: userId,
      },
    });

    return !!share;
  }

  /**
   * Get all courses shared with a user
   */
  async getSharedCourses(userId: string): Promise<
    Array<{
      id: string;
      name: string;
      ownerId: string;
      ownerUsername: string;
      sharedAt: Date;
    }>
  > {
    const shares = await this.db.courseShare.findMany({
      where: { sharedWithUserId: userId },
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

    return shares.map((share) => ({
      id: share.course.id,
      name: share.course.name,
      ownerId: share.course.ownerId,
      ownerUsername: share.sharedByUser.username,
      sharedAt: share.createdAt,
    }));
  }
}
