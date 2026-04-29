import { Router } from 'express';
import { QuizController } from '../controllers/quiz.controller';
import { authenticate } from '../middleware/auth';
import { generalLimiter } from '../middleware/rateLimiter';

const quizRouter = Router({ mergeParams: true });
const quizController = new QuizController();

/**
 * @openapi
 * /courses/{courseId}/quizzes:
 *   get:
 *     tags:
 *       - Quizzes
 *     summary: List all quizzes for a course
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of quizzes.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Quiz'
 *       401:
 *         description: Unauthorized.
 *   post:
 *     tags:
 *       - Quizzes
 *     summary: Create a new quiz in a course
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateQuizRequest'
 *     responses:
 *       201:
 *         description: Quiz created.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Quiz'
 *       400:
 *         description: Invalid input.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Course not found.
 */
quizRouter.get('/', generalLimiter, authenticate, (req, res) => quizController.list(req, res));
quizRouter.post('/', generalLimiter, authenticate, (req, res) => quizController.create(req, res));

/**
 * @openapi
 * /courses/{courseId}/quizzes/{id}:
 *   get:
 *     tags:
 *       - Quizzes
 *     summary: Get a quiz by id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Quiz details.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Quiz'
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Quiz not found.
 *   patch:
 *     tags:
 *       - Quizzes
 *     summary: Update a quiz by id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateQuizRequest'
 *     responses:
 *       200:
 *         description: Quiz updated.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Quiz'
 *       400:
 *         description: Invalid input.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Quiz not found.
 *   delete:
 *     tags:
 *       - Quizzes
 *     summary: Delete a quiz by id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Quiz deleted.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Quiz not found.
 */
quizRouter.get('/:id', generalLimiter, authenticate, (req, res) =>
  quizController.getById(req, res)
);
quizRouter.patch('/:id', generalLimiter, authenticate, (req, res) =>
  quizController.update(req, res)
);
quizRouter.delete('/:id', generalLimiter, authenticate, (req, res) =>
  quizController.remove(req, res)
);

export { quizRouter };
