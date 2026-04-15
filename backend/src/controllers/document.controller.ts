import { logger } from '../lib/logger';
import type { Request, Response } from 'express';
import { DocumentService } from '../services/document.service';

/**
 * Controller responsible for handling document-related HTTP requests.
 * Acts as a bridge between incoming requests and the service layer.
 */
class DocumentController {
  private readonly documentService = new DocumentService();

  /**
   * Handles document upload requests.
   *
   * Extracts file and courseId from the request,
   * validates input, and delegates the upload logic to the service.
   *
   * @param req Express request containing file and courseId
   * @param res Express response
   */
  async upload(req: Request, res: Response): Promise<void> {
    try {
      const file = req.file;
      const { courseId } = req.body;

      const userId = (req.user as { id: string } | undefined)?.id;

      if (!file) {
        res.status(400).json({ message: 'File is required.' });
        return;
      }

      if (!courseId) {
        res.status(400).json({ message: 'courseId is required.' });
        return;
      }

      if (!userId) {
        res.status(401).json({ message: 'Unauthorized.' });
        return;
      }

      const document = await this.documentService.upload({
        file,
        courseId,
        ownerId: userId,
      });

      res.status(201).json(document);
    } catch (error) {
      logger.error({ err: error }, 'Failed to upload document');

      if (error instanceof Error && error.message === 'Course not found.') {
        res.status(404).json({ message: 'Course not found.' });
        return;
      }

      res.status(500).json({ message: 'Failed to upload document.' });
    }
  }
}

export { DocumentController };
