import { describe, it, expect, mock } from 'bun:test';
import { NotificationService, NotificationType } from '../services/notification.service';

const createdAt = new Date('2026-06-06T10:00:00.000Z');

function mockNotification(overrides = {}) {
  return {
    id: 'notification-1',
    userId: 'user-1',
    type: NotificationType.CourseShared,
    title: 'Course shared',
    message: 'owner shared "Biology" with you.',
    data: {
      courseName: 'Biology',
      sharedByUsername: 'owner',
    },
    courseId: 'course-1',
    readAt: null,
    createdAt,
    ...overrides,
  };
}

describe('NotificationService', () => {
  it('lists notifications for a user newest first', async () => {
    const findMany = mock(async () => [mockNotification()]);
    const db = {
      notification: {
        findMany,
      },
    };

    const service = new NotificationService(
      db as unknown as ConstructorParameters<typeof NotificationService>[0]
    );
    const result = await service.listForUser('user-1');

    expect(findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { createdAt: 'desc' },
      select: expect.any(Object),
    });
    expect(result).toEqual([mockNotification()]);
  });

  it('creates a course shared notification', async () => {
    const create = mock(async () => mockNotification());
    const db = {
      notification: {
        create,
      },
    };

    const service = new NotificationService(
      db as unknown as ConstructorParameters<typeof NotificationService>[0]
    );
    const result = await service.createCourseSharedNotification({
      recipientId: 'user-1',
      courseId: 'course-1',
      courseName: 'Biology',
      sharedByUsername: 'owner',
    });

    expect(create).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        type: NotificationType.CourseShared,
        title: 'Course shared',
        message: 'owner shared "Biology" with you.',
        data: {
          courseName: 'Biology',
          sharedByUsername: 'owner',
        },
        courseId: 'course-1',
      },
      select: expect.any(Object),
    });
    expect(result.courseId).toBe('course-1');
  });

  it('marks an unread notification as read only for the owner', async () => {
    const findFirst = mock(async () => ({ id: 'notification-1', readAt: null }));
    const update = mock(async () =>
      mockNotification({ readAt: new Date('2026-06-06T10:01:00.000Z') })
    );
    const db = {
      notification: {
        findFirst,
        update,
      },
    };

    const service = new NotificationService(
      db as unknown as ConstructorParameters<typeof NotificationService>[0]
    );
    const result = await service.markAsRead('notification-1', 'user-1');

    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'notification-1', userId: 'user-1' },
      select: { id: true, readAt: true },
    });
    expect(update).toHaveBeenCalledWith({
      where: { id: 'notification-1' },
      data: { readAt: expect.any(Date) },
      select: expect.any(Object),
    });
    expect(result?.readAt).toBeInstanceOf(Date);
  });

  it('returns null when marking another user notification as read', async () => {
    const findFirst = mock(async () => null);
    const update = mock(async () => mockNotification());
    const db = {
      notification: {
        findFirst,
        update,
      },
    };

    const service = new NotificationService(
      db as unknown as ConstructorParameters<typeof NotificationService>[0]
    );
    const result = await service.markAsRead('notification-1', 'other-user');

    expect(result).toBeNull();
    expect(update).not.toHaveBeenCalled();
  });
});
