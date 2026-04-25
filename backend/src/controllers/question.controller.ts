import { Request, Response } from 'express';
import {
  AuthenticatedUser,
  CreateQuestionRequest,
  ReorderQuestionsRequest,
  UpdateQuestionRequest,
} from '../types';
import { logger } from '../lib/logger';
import { QuestionService } from '../services/question.service';

const questionService = new QuestionService();

const VALID_TYPES = ['MULTIPLE_CHOICE', 'SINGLE_CHOICE', 'CARD'] as const;

export class QuestionController {
  async list(req: Request, res: Response): Promise<void> {
    try {
      const authUser = req.user as AuthenticatedUser;

      const rawQuizId = req.params.quizId;
      const quizId = Array.isArray(rawQuizId) ? rawQuizId[0] : rawQuizId;
      if (!quizId) {
        res.status(400).json({ message: 'Quiz id is required' });
        return;
      }

      const questions = await questionService.listByQuiz(quizId, authUser.id);
      res.json(questions);
    } catch (error: unknown) {
      logger.error({ error }, '[QuestionController#list]');
      res.status(500).json({ message: 'Failed to fetch questions' });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const authUser = req.user as AuthenticatedUser;
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;

      if (!id) {
        res.status(400).json({ message: 'Question id is required' });
        return;
      }

      const question = await questionService.findByIdForOwner(id, authUser.id);
      if (!question) {
        res.status(404).json({ message: 'Question not found' });
        return;
      }

      res.json(question);
    } catch (error: unknown) {
      logger.error({ error }, '[QuestionController#getById]');
      res.status(500).json({ message: 'Failed to fetch question' });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const authUser = req.user as AuthenticatedUser;

      const rawQuizId = req.params.quizId;
      const quizId = Array.isArray(rawQuizId) ? rawQuizId[0] : rawQuizId;

      if (!quizId) {
        res.status(400).json({ message: 'Quiz id is required' });
        return;
      }

      const { title, description, type } = req.body as CreateQuestionRequest;

      if (!title?.trim()) {
        res.status(400).json({ message: 'Question title is required' });
        return;
      }

      if (!VALID_TYPES.includes(type)) {
        res.status(400).json({ message: 'Invalid question type' });
        return;
      }

      const question = await questionService.create(
        { title, description, type },
        quizId,
        authUser.id
      );
      if (!question) {
        res.status(404).json({ message: 'Course not found' });
        return;
      }

      res.status(201).json(question);
    } catch (error: unknown) {
      logger.error({ error }, '[QuestionController#create]');
      res.status(500).json({ message: 'Failed to create question' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const authUser = req.user as AuthenticatedUser;
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;

      if (!id) {
        res.status(400).json({ message: 'Question id is required' });
        return;
      }

      const data = req.body as UpdateQuestionRequest;

      if (data.title !== undefined && !data.title.trim()) {
        res.status(400).json({ message: 'Question title cannot be empty' });
        return;
      }

      if (data.description !== undefined && data.description !== null && !data.description.trim()) {
        res.status(400).json({ message: 'Question description cannot be empty' });
        return;
      }

      if (data.type !== undefined && !VALID_TYPES.includes(data.type)) {
        res.status(400).json({ message: 'Invalid question type' });
        return;
      }

      const updated = await questionService.updateForOwner(id, authUser.id, data);
      if (!updated) {
        res.status(404).json({ message: 'Question not found' });
        return;
      }

      res.json(updated);
    } catch (error: unknown) {
      logger.error({ error }, '[QuestionController#update]');
      res.status(500).json({ message: 'Failed to update question' });
    }
  }

  async reorder(req: Request, res: Response): Promise<void> {
    try {
      const authUser = req.user as AuthenticatedUser;
      const rawQuizId = req.params.quizId;
      const quizId = Array.isArray(rawQuizId) ? rawQuizId[0] : rawQuizId;

      if (!quizId) {
        res.status(400).json({ message: 'Quiz id is required' });
        return;
      }

      const { order } = req.body as ReorderQuestionsRequest;

      if (!Array.isArray(order) || order.length === 0) {
        res.status(400).json({ message: 'order must be a non-empty array of question ids' });
        return;
      }

      const success = await questionService.reorderQuestions(quizId, authUser.id, order);
      if (!success) {
        res.status(404).json({ message: 'Quiz not found or question ids are invalid' });
        return;
      }

      res.status(204).send();
    } catch (error: unknown) {
      logger.error({ error }, '[QuestionController#reorder]');
      res.status(500).json({ message: 'Failed to reorder questions' });
    }
  }

  async remove(req: Request, res: Response): Promise<void> {
    try {
      const authUser = req.user as AuthenticatedUser;
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;

      if (!id) {
        res.status(400).json({ message: 'Question id is required' });
        return;
      }

      const deleted = await questionService.deleteForOwner(id, authUser.id);
      if (!deleted) {
        res.status(404).json({ message: 'Question not found' });
        return;
      }

      res.status(204).send();
    } catch (error: unknown) {
      logger.error({ error }, '[QuestionController#remove]');
      res.status(500).json({ message: 'Failed to delete question' });
    }
  }
}
