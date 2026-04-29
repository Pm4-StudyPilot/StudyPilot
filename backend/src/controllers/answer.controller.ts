import { Request, Response } from 'express';
import {
  AuthenticatedUser,
  CreateAnswerRequest,
  ReorderAnswersRequest,
  UpdateAnswerRequest,
} from '../types';
import { logger } from '../lib/logger';
import { AnswerService } from '../services/answer.service';

const answerService = new AnswerService();

export class AnswerController {
  async list(req: Request, res: Response): Promise<void> {
    try {
      const authUser = req.user as AuthenticatedUser;

      const rawQuestionId = req.params.questionId;
      const questionId = Array.isArray(rawQuestionId) ? rawQuestionId[0] : rawQuestionId;
      if (!questionId) {
        res.status(400).json({ message: 'Question id is required' });
        return;
      }

      const answers = await answerService.listByQuestion(questionId, authUser.id);
      res.json(answers);
    } catch (error: unknown) {
      logger.error({ error }, '[AnswerController#list]');
      res.status(500).json({ message: 'Failed to fetch answers' });
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const authUser = req.user as AuthenticatedUser;
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;

      if (!id) {
        res.status(400).json({ message: 'Answer id is required' });
        return;
      }

      const answer = await answerService.findByIdForOwner(id, authUser.id);
      if (!answer) {
        res.status(404).json({ message: 'Answer not found' });
        return;
      }

      res.json(answer);
    } catch (error: unknown) {
      logger.error({ error }, '[AnswerController#getById]');
      res.status(500).json({ message: 'Failed to fetch answer' });
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

      const { content, isCorrect } = req.body as CreateAnswerRequest;

      if (!content?.trim()) {
        res.status(400).json({ message: 'Answer content is required' });
        return;
      }

      const answer = await answerService.create({ content, isCorrect }, quizId, authUser.id);
      if (!answer) {
        res.status(404).json({ message: 'Course not found' });
        return;
      }

      res.status(201).json(answer);
    } catch (error: unknown) {
      logger.error({ error }, '[AnswerController#create]');
      res.status(500).json({ message: 'Failed to create answer' });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const authUser = req.user as AuthenticatedUser;
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;

      if (!id) {
        res.status(400).json({ message: 'Answer id is required' });
        return;
      }

      const data = req.body as UpdateAnswerRequest;

      if (data.isCorrect !== undefined && !data.isCorrect) {
        res.status(400).json({ message: 'Question isCorrect cannot be empty' });
        return;
      }

      if (data.content !== undefined && data.content !== null && !data.content.trim()) {
        res.status(400).json({ message: 'Question content cannot be empty' });
        return;
      }

      const updated = await answerService.updateForOwner(id, authUser.id, data);
      if (!updated) {
        res.status(404).json({ message: 'Answer not found' });
        return;
      }

      res.json(updated);
    } catch (error: unknown) {
      logger.error({ error }, '[AnswerController#update]');
      res.status(500).json({ message: 'Failed to update answer' });
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

      const { order } = req.body as ReorderAnswersRequest;

      if (!Array.isArray(order) || order.length === 0) {
        res.status(400).json({ message: 'order must be a non-empty array of question ids' });
        return;
      }

      const success = await answerService.reorderAnswers(quizId, authUser.id, order);
      if (!success) {
        res.status(404).json({ message: 'Question not found or answer ids are invalid' });
        return;
      }

      res.status(204).send();
    } catch (error: unknown) {
      logger.error({ error }, '[AnswerController#reorder]');
      res.status(500).json({ message: 'Failed to reorder answers' });
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

      const deleted = await answerService.deleteForOwner(id, authUser.id);
      if (!deleted) {
        res.status(404).json({ message: 'Answer not found' });
        return;
      }

      res.status(204).send();
    } catch (error: unknown) {
      logger.error({ error }, '[AnswerController#remove]');
      res.status(500).json({ message: 'Failed to delete answer' });
    }
  }
}
