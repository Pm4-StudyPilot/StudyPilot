import { Router } from 'express';
import { authRouter } from './auth.routes';
import { courseRouter } from './course.routes';
import { storageRouter } from './storage.routes';
import { userRouter } from './user.routes';

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
router.use('/storage', storageRouter);
router.use('/users', userRouter);

export { router };
