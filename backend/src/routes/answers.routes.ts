import { Router } from 'express';
import { AnswerController } from '../controllers/answer.controller';
import { authenticate } from '../middleware/auth';
import { generalLimiter } from '../middleware/rateLimiter';

const answerRouter = Router({ mergeParams: true });
const answerController = new AnswerController();

/**
 * @openapi
 * /courses/{courseId}/quizzes/{quizId}/questions/{questionId}/answers:
 *   get:
 *     tags:
 *       - Answers
 *     summary: List all answers for a question
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of answers.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Answer'
 *       401:
 *         description: Unauthorized.
 *   post:
 *     tags:
 *       - Answers
 *     summary: Create a new answer for a question
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateAnswerRequest'
 *     responses:
 *       201:
 *         description: Answer created.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Answer'
 *       400:
 *         description: Invalid input.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Question not found.
 */
answerRouter.get('/', generalLimiter, authenticate, (req, res) => answerController.list(req, res));
answerRouter.post('/', generalLimiter, authenticate, (req, res) =>
  answerController.create(req, res)
);

/**
 * @openapi
 * /courses/{courseId}/quizzes/{quizId}/questions/{questionId}/answers/order:
 *   patch:
 *     tags:
 *       - Answers
 *     summary: Reorder answers within a question
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: questionId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReorderAnswersRequest'
 *     responses:
 *       204:
 *         description: Answers reordered.
 *       400:
 *         description: Invalid input.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Question not found or answer ids are invalid.
 */
answerRouter.patch('/order', generalLimiter, authenticate, (req, res) =>
  answerController.reorder(req, res)
);

/**
 * @openapi
 * /courses/{courseId}/quizzes/{quizId}/questions/{questionId}/answers/{id}:
 *   get:
 *     tags:
 *       - Answers
 *     summary: Get a answer by id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: questionId
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
 *         description: Answer details.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Answer'
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Answer or question not found.
 *   patch:
 *     tags:
 *       - Answers
 *     summary: Update a answer by id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: questionId
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
 *             $ref: '#/components/schemas/UpdateAnswerRequest'
 *     responses:
 *       200:
 *         description: Answer updated.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Answer'
 *       400:
 *         description: Invalid input.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Answer or question not found.
 *   delete:
 *     tags:
 *       - Answers
 *     summary: Delete a answer by id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: quizId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: questionId
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
 *         description: Answer deleted.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Answer or question not found.
 */
answerRouter.get('/:id', generalLimiter, authenticate, (req, res) =>
  answerController.getById(req, res)
);
answerRouter.patch('/:id', generalLimiter, authenticate, (req, res) =>
  answerController.update(req, res)
);
answerRouter.delete('/:id', generalLimiter, authenticate, (req, res) =>
  answerController.remove(req, res)
);

export { answerRouter };
