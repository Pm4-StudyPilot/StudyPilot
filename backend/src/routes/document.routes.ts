import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth';
import { DocumentController } from '../controllers/document.controller';

const documentRouter = Router();
const documentController = new DocumentController();

/**
 * Multer configuration for handling file uploads.
 * Files are temporarily stored in the local "uploads/" directory.
 */
const upload = multer({ dest: 'uploads/' });

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
 *         description: Missing file or courseId.
 *       401:
 *         description: Unauthorized.
 */
documentRouter.post('/', authenticate, upload.single('file'), (req, res) =>
  documentController.upload(req, res)
);

export { documentRouter };
