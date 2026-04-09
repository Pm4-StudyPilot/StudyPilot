import { Router } from 'express';
import { storage } from '../config/minio';

const router = Router();

/**
 * @openapi
 * /storage/presigned-url:
 *   post:
 *     tags:
 *       - Storage
 *     summary: Get a pre-signed URL for direct upload to MinIO
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               bucket:
 *                 type: string
 *               filename:
 *                 type: string
 *               keyPrefix:
 *                 type: string
 *             required:
 *               - bucket
 *               - filename
 *     responses:
 *       200:
 *         description: Pre-signed PUT URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                 key:
 *                   type: string
 */
router.post('/presigned-url', async (req, res) => {
  const { bucket, filename, keyPrefix } = req.body as {
    bucket?: string;
    filename?: string;
    keyPrefix?: string;
  };

  if (!bucket || !filename) {
    res.status(400).json({ message: 'bucket and filename are required' });
    return;
  }

  const key = `${keyPrefix ?? bucket}/${Date.now()}-${filename}`;
  await storage.ensureBucket(bucket);
  const url = await storage.presignedPutUrl(bucket, key, 3600);
  res.json({ url, key });
});

export { router as storageRouter };
