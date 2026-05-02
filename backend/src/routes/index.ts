import { Router } from 'express';
import { authRouter } from './auth.routes';
import { courseRouter } from './course.routes';
import { documentRouter } from './document.routes';
import { storageRouter } from './storage.routes';
import { taskRouter } from './task.routes';
import { userRouter } from './user.routes';
import { quizRouter } from './quiz.routes';
import { questionRouter } from './question.routes';
import { answerRouter } from './answers.routes';

const router = Router();

/**
 * @openapi
 * /health:
 *   get:
 *     tags:
 *       - System
 *     summary: Health check
 *     description: Returns a simple status response to confirm the API is running.
 *     responses:
 *       200:
 *         description: API is healthy.
 */
router.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

router.use('/auth', authRouter);
router.use('/courses', courseRouter);
router.use('/courses/:courseId/quizzes', quizRouter);
router.use('/courses/:courseId/quizzes/:quizId/questions', questionRouter);
router.use('/courses/:courseId/quizzes/:quizId/questions/:questionId/answers', answerRouter);
router.use('/documents', documentRouter);
router.use('/courses/:courseId/tasks', taskRouter);
router.use('/storage', storageRouter);
router.use('/users', userRouter);

export { router };
