import { prisma } from '../config/database';
import type { PrismaClient } from '../generated/prisma/client';
import type { Prisma } from '../generated/prisma/client';

export const NotificationType = {
  CourseShared: 'COURSE_SHARED',
} as const;

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export interface NotificationDto {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Prisma.JsonValue | null;
  courseId: string | null;
  readAt: Date | null;
  createdAt: Date;
}

type NotificationRecord = {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data: Prisma.JsonValue | null;
  courseId: string | null;
  readAt: Date | null;
  createdAt: Date;
};

function toDto(notification: NotificationRecord): NotificationDto {
  return {
    ...notification,
    type:
      notification.type === NotificationType.CourseShared
        ? NotificationType.CourseShared
        : (notification.type as NotificationType),
  };
}

export class NotificationService {
  constructor(private readonly db: PrismaClient = prisma) {}

  async listForUser(userId: string): Promise<NotificationDto[]> {
    const notifications = await this.db.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        userId: true,
        type: true,
        title: true,
        message: true,
        data: true,
        courseId: true,
        readAt: true,
        createdAt: true,
      },
    });

    return notifications.map(toDto);
  }

  async markAsRead(id: string, userId: string): Promise<NotificationDto | null> {
    const existing = await this.db.notification.findFirst({
      where: { id, userId },
      select: { id: true, readAt: true },
    });

    if (!existing) {
      return null;
    }

    if (existing.readAt) {
      const notification = await this.db.notification.findUnique({
        where: { id },
        select: {
          id: true,
          userId: true,
          type: true,
          title: true,
          message: true,
          data: true,
          courseId: true,
          readAt: true,
          createdAt: true,
        },
      });

      return notification ? toDto(notification) : null;
    }

    const notification = await this.db.notification.update({
      where: { id },
      data: { readAt: new Date() },
      select: {
        id: true,
        userId: true,
        type: true,
        title: true,
        message: true,
        data: true,
        courseId: true,
        readAt: true,
        createdAt: true,
      },
    });

    return toDto(notification);
  }

  async createCourseSharedNotification({
    recipientId,
    courseId,
    courseName,
    sharedByUsername,
  }: {
    recipientId: string;
    courseId: string;
    courseName: string;
    sharedByUsername: string;
  }): Promise<NotificationDto> {
    const notification = await this.db.notification.create({
      data: {
        userId: recipientId,
        type: NotificationType.CourseShared,
        title: 'Course shared',
        message: `${sharedByUsername} shared "${courseName}" with you.`,
        data: {
          courseName,
          sharedByUsername,
        },
        courseId,
      },
      select: {
        id: true,
        userId: true,
        type: true,
        title: true,
        message: true,
        data: true,
        courseId: true,
        readAt: true,
        createdAt: true,
      },
    });

    return toDto(notification);
  }
}
