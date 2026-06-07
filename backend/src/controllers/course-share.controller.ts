import { Request, Response } from 'express';
import { CourseShareService, ShareError } from '../services/course-share.service';
import { AuthenticatedUser } from '../types';
import { logger } from '../lib/logger';

const courseShareService = new CourseShareService();

export class CourseShareController {
  async share(req: Request, res: Response): Promise<Response> {
    try {
      const authUser = req.user as AuthenticatedUser;
      const rawCourseId = req.params.courseId;
      const courseId = Array.isArray(rawCourseId) ? rawCourseId[0] : rawCourseId;

      if (!courseId) {
        return res.status(400).json({ message: 'Course id is required' });
      }

      const { username } = req.body as { username?: string };

      if (!username || !username.trim()) {
        return res.status(400).json({ message: 'Username or email is required' });
      }

      const share = await courseShareService.shareWith(courseId, authUser.id, username.trim());
      return res.status(201).json(share);
    } catch (error: unknown) {
      logger.error({ error }, '[CourseShareController#share]');

      if (error instanceof ShareError) {
        if (error.type === 'UserNotFound') {
          return res.status(404).json({ message: 'User not found' });
        }
        if (error.type === 'SelfShare') {
          return res.status(400).json({ message: 'You cannot share a course with yourself' });
        }
        if (error.type === 'AlreadyShared') {
          return res.status(409).json({ message: 'Course already shared with this user' });
        }
      }
      return res.status(500).json({ message: 'Internal server error' });
    }
  }

  async unshare(req: Request, res: Response): Promise<void> {
    try {
      const authUser = req.user as AuthenticatedUser;
      const rawCourseId = req.params.courseId;
      const rawUserId = req.params.userId;
      const courseId = Array.isArray(rawCourseId) ? rawCourseId[0] : rawCourseId;
      const userId = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;

      if (!courseId || !userId) {
        res.status(400).json({ message: 'Course id and user id are required' });
        return;
      }

      const success = await courseShareService.unshareWith(courseId, authUser.id, userId);

      if (!success) {
        res.status(404).json({ message: 'Course share not found' });
        return;
      }

      res.status(204).send();
    } catch (error: unknown) {
      logger.error({ error }, '[CourseShareController#unshare]');
      res.status(500).json({ message: 'Failed to unshare course' });
    }
  }

  async getSharedUsers(req: Request, res: Response): Promise<void> {
    try {
      const authUser = req.user as AuthenticatedUser;
      const rawCourseId = req.params.courseId;
      const courseId = Array.isArray(rawCourseId) ? rawCourseId[0] : rawCourseId;

      if (!courseId) {
        res.status(400).json({ message: 'Course id is required' });
        return;
      }

      const users = await courseShareService.getUsersWithAccess(courseId, authUser.id);
      res.json(users);
    } catch (error: unknown) {
      logger.error({ error }, '[CourseShareController#getSharedUsers]');
      res.status(500).json({ message: 'Failed to fetch shared users' });
    }
  }

  async getSharedCourses(req: Request, res: Response): Promise<void> {
    try {
      const authUser = req.user as AuthenticatedUser;

      const courses = await courseShareService.getSharedCourses(authUser.id);
      res.json(courses);
    } catch (error: unknown) {
      logger.error({ error }, '[CourseShareController#getSharedCourses]');
      res.status(500).json({ message: 'Failed to fetch shared courses' });
    }
  }
}
