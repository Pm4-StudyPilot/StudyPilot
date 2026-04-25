import { Request, Response } from 'express';
import { QuizService } from '../services/quiz.service';
import { AuthenticatedUser, CreateQuizRequest, UpdateQuizRequest } from '../types';
import { logger } from '../lib/logger';

const quizService = new QuizService();

export class QuizController {
  async list(req: Request, res: Response): Promise<void> {
    try {
      const authUser = req.user as AuthenticatedUser;
      const rawCourseId = req.params.courseId;
      const courseId = Array.isArray(rawCourseId) ? rawCourseId[0] : rawCourseId;

      if (!courseId) {
        res.status(400).json({ message: 'Course id is required' });
        return;
      }

      const quizzes = await quizService.listByCourse(courseId, authUser.id);
      res.json(quizzes);
    } catch (error: unknown) {
      logger.error({ error }, '[QuizController#list]');
      res.status(500).json({ message: 'Failed to fetch quizs' });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const authUser = req.user as AuthenticatedUser;
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;

      if (!id) {
        res.status(400).json({ message: 'Quiz id is required' });
        return;
      }

      const quiz = await quizService.findByIdForOwner(id, authUser.id);
      if (!quiz) {
        res.status(404).json({ message: 'Quiz not found' });
        return;
      }

      res.json(quiz);
    } catch (error: unknown) {
      logger.error({ error }, '[QuizController#getById]');
      res.status(500).json({ message: 'Failed to fetch quiz' });
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

      const { title, description, isOrderRandom } = req.body as CreateQuizRequest;

      if (!title?.trim()) {
        res.status(400).json({ message: 'Quiz title is required' });
        return;
      }

      if (isOrderRandom !== undefined && typeof isOrderRandom !== 'boolean') {
        res.status(400).json({ message: 'Invalid isOrderRandom value' });
        return;
      }

      const quiz = await quizService.create(
        { title, description, isOrderRandom },

        courseId,
        authUser.id
      );
      if (!quiz) {
        res.status(404).json({ message: 'Course not found' });
        return;
      }

      res.status(201).json(quiz);
    } catch (error: unknown) {
      logger.error({ error }, '[QuizController#create]');
      res.status(500).json({ message: 'Failed to create quiz' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const authUser = req.user as AuthenticatedUser;
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;

      if (!id) {
        res.status(400).json({ message: 'Quiz id is required' });
        return;
      }

      const data = req.body as UpdateQuizRequest;

      if (data.title !== undefined && !data.title.trim()) {
        res.status(400).json({ message: 'Quiz title cannot be empty' });
        return;
      }

      if (data.isOrderRandom !== undefined && typeof data.isOrderRandom !== 'boolean') {
        res.status(400).json({ message: 'Invalid isOrderRandom value' });
        return;
      }

      const updated = await quizService.updateForOwner(id, authUser.id, data);
      if (!updated) {
        res.status(404).json({ message: 'Quiz not found' });
        return;
      }

      res.json(updated);
    } catch (error: unknown) {
      logger.error({ error }, '[QuizController#update]');
      res.status(500).json({ message: 'Failed to update quiz' });
    }
  }

  async remove(req: Request, res: Response): Promise<void> {
    try {
      const authUser = req.user as AuthenticatedUser;
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;

      if (!id) {
        res.status(400).json({ message: 'Quiz id is required' });
        return;
      }

      const deleted = await quizService.deleteForOwner(id, authUser.id);
      if (!deleted) {
        res.status(404).json({ message: 'Quiz not found' });
        return;
      }

      res.status(204).send();
    } catch (error: unknown) {
      logger.error({ error }, '[QuizController#remove]');
      res.status(500).json({ message: 'Failed to delete quiz' });
    }
  }
}
