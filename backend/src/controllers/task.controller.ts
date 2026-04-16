import { Request, Response } from 'express';
import { TaskService } from '../services/task.service';
import {
  AuthenticatedUser,
  CreateTaskRequest,
  UpdateTaskRequest,
  PatchTaskCompletionRequest,
} from '../types';
import { logger } from '../lib/logger';

const taskService = new TaskService();

const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];
const VALID_STATUSES = ['OPEN', 'IN_PROGRESS', 'DONE'];

export class TaskController {
  async list(req: Request, res: Response): Promise<void> {
    try {
      const authUser = req.user as AuthenticatedUser;
      const rawCourseId = req.params.courseId;
      const courseId = Array.isArray(rawCourseId) ? rawCourseId[0] : rawCourseId;

      if (!courseId) {
        res.status(400).json({ message: 'Course id is required' });
        return;
      }

      const tasks = await taskService.listByCourse(courseId, authUser.id);
      res.json(tasks);
    } catch (error: unknown) {
      logger.error({ error }, '[TaskController#list]');
      res.status(500).json({ message: 'Failed to fetch tasks' });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const authUser = req.user as AuthenticatedUser;
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;

      if (!id) {
        res.status(400).json({ message: 'Task id is required' });
        return;
      }

      const task = await taskService.findByIdForOwner(id, authUser.id);
      if (!task) {
        res.status(404).json({ message: 'Task not found' });
        return;
      }

      res.json(task);
    } catch (error: unknown) {
      logger.error({ error }, '[TaskController#getById]');
      res.status(500).json({ message: 'Failed to fetch task' });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const authUser = req.user as AuthenticatedUser;
      const rawCourseId = req.params.courseId;
      const courseId = Array.isArray(rawCourseId) ? rawCourseId[0] : rawCourseId;

      if (!courseId) {
        res.status(400).json({ message: 'Course id is required' });
        return;
      }

      const { title, description, dueDate, priority } = req.body as CreateTaskRequest;

      if (!title?.trim()) {
        res.status(400).json({ message: 'Task title is required' });
        return;
      }

      if (priority && !VALID_PRIORITIES.includes(priority)) {
        res.status(400).json({ message: 'Invalid priority value' });
        return;
      }

      if (dueDate && isNaN(new Date(dueDate).getTime())) {
        res.status(400).json({ message: 'Invalid due date' });
        return;
      }

      const task = await taskService.create(
        { title, description, dueDate, priority },
        courseId,
        authUser.id
      );
      if (!task) {
        res.status(404).json({ message: 'Course not found' });
        return;
      }

      res.status(201).json(task);
    } catch (error: unknown) {
      logger.error({ error }, '[TaskController#create]');
      res.status(500).json({ message: 'Failed to create task' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const authUser = req.user as AuthenticatedUser;
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;

      if (!id) {
        res.status(400).json({ message: 'Task id is required' });
        return;
      }

      const data = req.body as UpdateTaskRequest;

      if (data.title !== undefined && !data.title.trim()) {
        res.status(400).json({ message: 'Task title cannot be empty' });
        return;
      }

      if (data.priority !== undefined && !VALID_PRIORITIES.includes(data.priority)) {
        res.status(400).json({ message: 'Invalid priority value' });
        return;
      }

      if (data.status !== undefined && !VALID_STATUSES.includes(data.status)) {
        res.status(400).json({ message: 'Invalid status value' });
        return;
      }

      if (
        data.dueDate !== undefined &&
        data.dueDate !== null &&
        isNaN(new Date(data.dueDate).getTime())
      ) {
        res.status(400).json({ message: 'Invalid due date' });
        return;
      }

      const updated = await taskService.updateForOwner(id, authUser.id, data);
      if (!updated) {
        res.status(404).json({ message: 'Task not found' });
        return;
      }

      res.json(updated);
    } catch (error: unknown) {
      logger.error({ error }, '[TaskController#update]');
      res.status(500).json({ message: 'Failed to update task' });
    }
  }

  async setCompletion(req: Request, res: Response): Promise<void> {
    try {
      const authUser = req.user as AuthenticatedUser;
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;

      if (!id) {
        res.status(400).json({ message: 'Task id is required' });
        return;
      }

      const { completed } = req.body as PatchTaskCompletionRequest;

      if (typeof completed !== 'boolean') {
        res.status(400).json({ message: 'completed must be a boolean' });
        return;
      }

      const task = await taskService.setCompleted(id, authUser.id, completed);
      if (!task) {
        res.status(404).json({ message: 'Task not found' });
        return;
      }

      res.json(task);
    } catch (error: unknown) {
      logger.error({ error }, '[TaskController#setCompletion]');
      res.status(500).json({ message: 'Failed to update task completion' });
    }
  }

  async remove(req: Request, res: Response): Promise<void> {
    try {
      const authUser = req.user as AuthenticatedUser;
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;

      if (!id) {
        res.status(400).json({ message: 'Task id is required' });
        return;
      }

      const deleted = await taskService.deleteForOwner(id, authUser.id);
      if (!deleted) {
        res.status(404).json({ message: 'Task not found' });
        return;
      }

      res.status(204).send();
    } catch (error: unknown) {
      logger.error({ error }, '[TaskController#remove]');
      res.status(500).json({ message: 'Failed to delete task' });
    }
  }
}
