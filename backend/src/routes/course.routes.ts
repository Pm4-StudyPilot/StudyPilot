import { Router } from 'express';
import { CourseController } from '../controllers/course.controller';
import { CourseShareController } from '../controllers/course-share.controller';
import { authenticate } from '../middleware/auth';
import { generalLimiter } from '../middleware/rateLimiter';

const courseRouter = Router();
const courseController = new CourseController();
const courseShareController = new CourseShareController();

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

/**
 * @openapi
 * /courses/{id}/share:
 *   post:
 *     tags:
 *       - Courses
 *     summary: Share a course with another user
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
 *             type: object
 *             properties:
 *               username:
 *                 type: string
 *                 description: Username or email of the user to share with
 *             required:
 *               - username
 *     responses:
 *       201:
 *         description: Course shared successfully.
 *       400:
 *         description: Invalid input or user not found.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Course not found.
 *   get:
 *     tags:
 *       - Courses
 *     summary: Get list of users a course is shared with
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
 *         description: List of users the course is shared with.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Course not found.
 */
courseRouter.post('/:courseId/share', authenticate, generalLimiter, (req, res) =>
  courseShareController.share(req, res)
);
courseRouter.get('/:courseId/share', authenticate, generalLimiter, (req, res) =>
  courseShareController.getSharedUsers(req, res)
);

/**
 * @openapi
 * /courses/{courseId}/share/{userId}:
 *   delete:
 *     tags:
 *       - Courses
 *     summary: Remove course share with a user
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: courseId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       204:
 *         description: Course share removed.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Course share not found.
 */
courseRouter.delete('/:courseId/share/:userId', authenticate, generalLimiter, (req, res) =>
  courseShareController.unshare(req, res)
);

/**
 * @openapi
 * /courses/shared/mine:
 *   get:
 *     tags:
 *       - Courses
 *     summary: Get list of courses shared with the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of courses shared with the user.
 *       401:
 *         description: Unauthorized.
 */
courseRouter.get('/shared/mine', authenticate, generalLimiter, (req, res) =>
  courseShareController.getSharedCourses(req, res)
);

export { courseRouter };
