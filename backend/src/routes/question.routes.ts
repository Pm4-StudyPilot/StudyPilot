import { Router } from 'express';
import { QuestionController } from '../controllers/question.controller';
import { authenticate } from '../middleware/auth';
import { generalLimiter } from '../middleware/rateLimiter';

const questionRouter = Router({ mergeParams: true });
const questionController = new QuestionController();

/**
 * @openapi
 * /courses/{quizId}/questions:
 *   get:
 *     tags:
 *       - Questions
 *     summary: List all questions for a quiz
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of questions.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Question'
 *       401:
 *         description: Unauthorized.
 *   post:
 *     tags:
 *       - Questions
 *     summary: Create a new question for a quiz
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateQuestionRequest'
 *     responses:
 *       201:
 *         description: Question created.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Question'
 *       400:
 *         description: Invalid input.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Quiz not found.
 */
questionRouter.get('/', generalLimiter, authenticate, (req, res) =>
  questionController.list(req, res)
);
questionRouter.post('/', generalLimiter, authenticate, (req, res) =>
  questionController.create(req, res)
);

/**
 * @openapi
 * /courses/{quizId}/questions/order:
 *   patch:
 *     tags:
 *       - Questions
 *     summary: Reorder questions within a quiz
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReorderQuestionsRequest'
 *     responses:
 *       204:
 *         description: Questions reordered.
 *       400:
 *         description: Invalid input.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Quiz not found or question ids are invalid.
 */
questionRouter.patch('/order', generalLimiter, authenticate, (req, res) =>
  questionController.reorder(req, res)
);

/**
 * @openapi
 * /courses/{quizId}/questions/{id}:
 *   get:
 *     tags:
 *       - Questions
 *     summary: Get a question by id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
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
 *         description: Question details.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Question'
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Question or quiz not found.
 *   patch:
 *     tags:
 *       - Questions
 *     summary: Update a question by id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
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
 *             $ref: '#/components/schemas/UpdateQuestionRequest'
 *     responses:
 *       200:
 *         description: Question updated.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Question'
 *       400:
 *         description: Invalid input.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Question or quiz not found.
 *   delete:
 *     tags:
 *       - Questions
 *     summary: Delete a question by id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: quizId
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
 *         description: Question deleted.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Question or quiz not found.
 */
questionRouter.get('/:id', generalLimiter, authenticate, (req, res) =>
  questionController.getById(req, res)
);
questionRouter.patch('/:id', generalLimiter, authenticate, (req, res) =>
  questionController.update(req, res)
);
questionRouter.delete('/:id', generalLimiter, authenticate, (req, res) =>
  questionController.remove(req, res)
);

export { questionRouter };
