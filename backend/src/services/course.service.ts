import { prisma } from '../config/database';
import { storage } from '../config/minio';
import { CourseDto, CourseTaskProgressDto } from '../types';
import type { PrismaClient } from '../generated/prisma/client';
import { resolveCourseColor } from '../utils/courseColor';
import { logger } from '../lib/logger';

const COURSE_OVERVIEW_SELECT = {
  id: true,
  name: true,
  color: true,
  ownerId: true,
  createdAt: true,
  updatedAt: true,
  tasks: {
    select: {
      status: true,
    },
  },
} as const;

type CourseOverviewRecord = {
  id: string;
  name: string;
  color: string | null;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  tasks: Array<{ status: string }>;
};

export class CourseService {
  constructor(
    private readonly db: PrismaClient = prisma,
    private readonly objectStorage: Pick<typeof storage, 'delete'> = storage
  ) {}

  private buildTaskProgress(tasks: Array<{ status: string }>): CourseTaskProgressDto {
    const totalTasks = tasks.length;
    const openTasks = tasks.filter((task) => task.status === 'OPEN').length;
    const inProgressTasks = tasks.filter((task) => task.status === 'IN_PROGRESS').length;
    const completedTasks = tasks.filter((task) => task.status === 'DONE').length;
    const completionPercentage =
      totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    return {
      totalTasks,
      openTasks,
      inProgressTasks,
      completedTasks,
      completionPercentage,
    };
  }

  private toCourseDto(course: CourseOverviewRecord): CourseDto {
    const { tasks, ...courseFields } = course;

    return {
      ...courseFields,
      color: resolveCourseColor(course.color, `${course.id}:${course.name}`),
      taskProgress: this.buildTaskProgress(tasks),
    };
  }

  /**
   * Check if user has access to a course
   * Access granted if: user is owner OR course is shared with user
   */
  private async hasAccess(courseId: string, userId: string): Promise<boolean> {
    const course = await this.db.course.findUnique({
      where: { id: courseId },
      select: { ownerId: true },
    });

    if (!course) return false;
    if (course.ownerId === userId) return true;

    const share = await this.db.courseShare.findFirst({
      where: { courseId, sharedWithUserId: userId },
    });

    return !!share;
  }

  async create(name: string, ownerId: string, color?: string | null): Promise<CourseDto> {
    const course = await this.db.course.create({
      data: {
        name,
        color: resolveCourseColor(color, `${ownerId}:${name}`),
        ownerId,
      },
      select: COURSE_OVERVIEW_SELECT,
    });

    return this.toCourseDto(course);
  }

  async listByUser(userId: string): Promise<CourseDto[]> {
    // Get courses owned by user
    const ownedCourses = await this.db.course.findMany({
      where: { ownerId: userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        color: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
        tasks: {
          select: { status: true },
          where: { userId },
        },
      },
    });

    // Get courses shared with user
    const sharedCourses = await this.db.course.findMany({
      where: {
        courseShares: {
          some: {
            sharedWithUserId: userId,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        color: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
        tasks: {
          select: { status: true },
          where: { userId },
        },
      },
    });

    // Combine and sort by createdAt
    const allCourses = [...ownedCourses, ...sharedCourses];
    allCourses.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return allCourses.map((course) => this.toCourseDto(course));
  }

  async findByIdForUser(id: string, userId: string): Promise<CourseDto | null> {
    // Check if user has access
    if (!(await this.hasAccess(id, userId))) {
      return null;
    }

    const course = await this.db.course.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        color: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
        tasks: {
          select: { status: true },
          where: { userId },
        },
      },
    });

    return course ? this.toCourseDto(course) : null;
  }

  async updateForOwner(
    id: string,
    ownerId: string,
    name: string,
    color?: string | null
  ): Promise<CourseDto | null> {
    // Only owner can update
    const existing = await this.db.course.findFirst({
      where: { id, ownerId },
    });

    if (!existing) {
      return null;
    }

    const course = await this.db.course.update({
      where: { id },
      data: {
        name,
        ...(color !== undefined ? { color: resolveCourseColor(color, `${id}:${name}`) } : {}),
      },
      select: COURSE_OVERVIEW_SELECT,
    });

    return this.toCourseDto(course);
  }

  async deleteForOwner(id: string, ownerId: string): Promise<boolean> {
    // Only owner can delete
    const result = await this.db.course.deleteMany({
      where: {
        id,
        ownerId,
      },
    });

    return result.count > 0;
  }

  async removeForUser(id: string, userId: string): Promise<'deleted' | 'left' | null> {
    const course = await this.db.course.findUnique({
      where: { id },
      select: {
        ownerId: true,
        documents: {
          select: {
            id: true,
            bucket: true,
            objectKey: true,
          },
        },
      },
    });

    if (!course) {
      return null;
    }

    if (course.ownerId === userId) {
      await this.db.course.delete({
        where: { id },
      });

      await Promise.all(
        course.documents.map(async (document) => {
          try {
            await this.objectStorage.delete(document.bucket, document.objectKey);
          } catch (storageError) {
            logger.error(
              {
                err: storageError,
                documentId: document.id,
                courseId: id,
                bucket: document.bucket,
                objectKey: document.objectKey,
              },
              'Failed to delete course document object from storage'
            );
          }
        })
      );

      return 'deleted';
    }

    const leaveResult = await this.db.$transaction(async (tx) => {
      const shareDelete = await tx.courseShare.deleteMany({
        where: {
          courseId: id,
          sharedWithUserId: userId,
        },
      });

      if (shareDelete.count === 0) {
        return null;
      }

      await tx.task.deleteMany({
        where: {
          courseId: id,
          userId,
        },
      });

      return 'left' as const;
    });

    return leaveResult;
  }

  // Backward compatibility aliases
  async listByOwner(userId: string): Promise<CourseDto[]> {
    return this.listByUser(userId);
  }

  async findByIdForOwner(id: string, userId: string): Promise<CourseDto | null> {
    return this.findByIdForUser(id, userId);
  }
}
