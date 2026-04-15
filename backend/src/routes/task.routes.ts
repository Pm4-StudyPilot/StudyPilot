import { Router } from 'express';
import { TaskController } from '../controllers/task.controller';
import { authenticate } from '../middleware/auth';

const taskRouter = Router({ mergeParams: true });
const taskController = new TaskController();

/**
 * @openapi
 * /courses/{courseId}/tasks:
 *   get:
 *     tags:
 *       - Tasks
 *     summary: List all tasks for a course
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
 *         description: List of tasks.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Task'
 *       401:
 *         description: Unauthorized.
 *   post:
 *     tags:
 *       - Tasks
 *     summary: Create a new task in a course
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
 *             $ref: '#/components/schemas/CreateTaskRequest'
 *     responses:
 *       201:
 *         description: Task created.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: Invalid input.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Course not found.
 */
taskRouter.get('/', authenticate, (req, res) => taskController.list(req, res));
taskRouter.post('/', authenticate, (req, res) => taskController.create(req, res));

/**
 * @openapi
 * /courses/{courseId}/tasks/{id}:
 *   get:
 *     tags:
 *       - Tasks
 *     summary: Get a task by id
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
 *         description: Task details.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Task not found.
 *   patch:
 *     tags:
 *       - Tasks
 *     summary: Update a task by id
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
 *             $ref: '#/components/schemas/UpdateTaskRequest'
 *     responses:
 *       200:
 *         description: Task updated.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: Invalid input.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Task not found.
 *   delete:
 *     tags:
 *       - Tasks
 *     summary: Delete a task by id
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
 *         description: Task deleted.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Task not found.
 */
taskRouter.get('/:id', authenticate, (req, res) => taskController.getById(req, res));
taskRouter.patch('/:id', authenticate, (req, res) => taskController.update(req, res));
taskRouter.delete('/:id', authenticate, (req, res) => taskController.remove(req, res));

/**
 * @openapi
 * /courses/{courseId}/tasks/{id}/completion:
 *   patch:
 *     tags:
 *       - Tasks
 *     summary: Update task completion state
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
 *             $ref: '#/components/schemas/PatchTaskCompletionRequest'
 *     responses:
 *       200:
 *         description: Task completion updated.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Task'
 *       400:
 *         description: Invalid input.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Task not found.
 */
taskRouter.patch('/:id/completion', authenticate, (req, res) =>
  taskController.setCompletion(req, res)
);

export { taskRouter };
