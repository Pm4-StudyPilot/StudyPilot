import { Router } from 'express';
import { CourseController } from '../controllers/course.controller';
import { authenticate } from '../middleware/auth';

const courseRouter = Router();
const courseController = new CourseController();

/**
 * @openapi
 * /courses:
 *   get:
 *     tags:
 *       - Courses
 *     summary: List the authenticated user's courses
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of courses.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Course'
 *       401:
 *         description: Unauthorized.
 *   post:
 *     tags:
 *       - Courses
 *     summary: Create a new course
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCourseRequest'
 *     responses:
 *       201:
 *         description: Course created.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Course'
 *       400:
 *         description: Invalid input.
 *       401:
 *         description: Unauthorized.
 */
courseRouter.get('/', authenticate, (req, res) => courseController.list(req, res));
courseRouter.post('/', authenticate, (req, res) => courseController.create(req, res));

/**
 * @openapi
 * /courses/{id}:
 *   get:
 *     tags:
 *       - Courses
 *     summary: Get a course by id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Course details.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Course'
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Course not found.
 *   patch:
 *     tags:
 *       - Courses
 *     summary: Update a course by id
 *     security:
 *       - bearerAuth: []
 *     parameters:
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
 *             $ref: '#/components/schemas/UpdateCourseRequest'
 *     responses:
 *       200:
 *         description: Course updated.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Course'
 *       400:
 *         description: Invalid input.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Course not found.
 *   delete:
 *     tags:
 *       - Courses
 *     summary: Delete a course by id
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Course deleted.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Course not found.
 */
courseRouter.get('/:id', authenticate, (req, res) => courseController.getById(req, res));
courseRouter.patch('/:id', authenticate, (req, res) => courseController.update(req, res));
courseRouter.delete('/:id', authenticate, (req, res) => courseController.remove(req, res));

export { courseRouter };
