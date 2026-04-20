import { Router } from 'express';
import multer from 'multer';
import type { Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import { DocumentController } from '../controllers/document.controller';
import { generalLimiter, sensitiveLimiter } from '../middleware/rateLimiter';

const documentRouter = Router();
const documentController = new DocumentController();

/**
 * Multer upload middleware configuration.
 *
 * Storage strategy:
 * - Uses memoryStorage so uploaded files are kept in memory as Buffer objects
 * - This is required because files are forwarded to MinIO in the service layer
 *   instead of being stored on the local filesystem
 *
 * Validation:
 * - Maximum file size: 10 MB
 * - Allowed file formats:
 *   - PDF
 *   - Word (.doc, .docx)
 *   - PowerPoint (.ppt, .pptx)
 *   - Plain text (.txt)
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB
  },
  fileFilter: (_req, file, cb) => {
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
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
 * Wraps the multer upload middleware and translates upload-related errors
 * into consistent HTTP responses.
 *
 * Handled cases:
 * - file too large
 * - unsupported file type
 * - malformed upload request
 *
 * If no upload error occurs, the request is forwarded to the controller.
 *
 * @param req Express request
 * @param res Express response
 * @param next Express next middleware callback
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
 *     description: Uploads a document for a course. The file is validated by multer, stored in MinIO object storage, and its metadata is saved in the database.
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
 *             required:
 *               - file
 *               - courseId
 *     responses:
 *       201:
 *         description: Document uploaded successfully.
 *       400:
 *         description: Missing file, invalid file type, malformed request, or oversized file.
 *       401:
 *         description: Unauthorized.
 *       404:
 *         description: Course not found.
 */
documentRouter.post('/', sensitiveLimiter, authenticate, handleDocumentUpload, (req, res) =>
  documentController.upload(req, res)
);

/**
 * @openapi
 * /documents/course/{courseId}:
 *   get:
 *     tags:
 *       - Documents
 *     summary: List documents for a course
 *     description: Returns all uploaded document metadata for a course owned by the authenticated user. Results are sorted by newest first.
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
documentRouter.get('/course/:courseId', generalLimiter, authenticate, (req, res) =>
  documentController.listByCourse(req, res)
);

export { documentRouter };
