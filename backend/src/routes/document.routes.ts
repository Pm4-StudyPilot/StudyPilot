import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import type { Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { DocumentController } from '../controllers/document.controller';

const documentRouter = Router();
const documentController = new DocumentController();

/**
 * Returns a sanitized filename base to avoid problematic characters.
 */
function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9-_]/g, '-') // replace special chars/spaces
    .replace(/-+/g, '-') // collapse repeated dashes
    .replace(/^-|-$/g, ''); // trim leading/trailing dashes
}

/**
 * Multer storage configuration for local document uploads.
 * Files are stored in the "uploads/" directory with a unique filename.
 */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const extension = path.extname(file.originalname);
    const originalBaseName = path.basename(file.originalname, extension);

    // sanitize and limit filename length
    const sanitizedBaseName = sanitizeFileName(originalBaseName).slice(0, 50) || 'document';

    cb(null, `${sanitizedBaseName}-${uniqueSuffix}${extension}`);
  },
});

/**
 * Multer upload middleware with local storage, file size limit,
 * and optional file type validation.
 */
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ];

    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
      return;
    }

    cb(new Error('Unsupported file type.'));
  },
});

/**
 * Handles multer-specific upload errors and forwards valid requests
 * to the document controller.
 */
function handleDocumentUpload(req: Request, res: Response, next: NextFunction): void {
  upload.single('file')(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ message: 'File is too large. Maximum size is 10 MB.' });
        return;
      }

      res.status(400).json({ message: `Upload error: ${error.message}` });
      return;
    }

    res.status(400).json({
      message: error instanceof Error ? error.message : 'Invalid upload request.',
    });
  });
}

/**
 * @openapi
 * /documents:
 *   post:
 *     tags:
 *       - Documents
 *     summary: Upload a document
 *     description: Upload a document and assign it to a course.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               courseId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Document uploaded successfully.
 *       400:
 *         description: Missing file, invalid file type or oversized file.
 *       401:
 *         description: Unauthorized.
 */
documentRouter.post('/', authenticate, handleDocumentUpload, (req, res) =>
  documentController.upload(req, res)
);

/**
 * @openapi
 * /documents/course/{courseId}:
 *   get:
 *     tags:
 *       - Documents
 *     summary: List documents for a course
 *     description: Returns all uploaded documents for a course owned by the authenticated user.
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
 *         description: Documents returned successfully.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Course not found.
 */
documentRouter.get('/course/:courseId', authenticate, (req, res) =>
  documentController.listByCourse(req, res)
);

export { documentRouter };
