import { logger } from '../lib/logger';
import { getSingleQueryParam } from '../utils/query';
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

  /**
   * Returns uploaded documents for a course owned by the authenticated user.
   *
   * Supports optional query parameters for:
   * - sorting
   * - filtering by MIME type
   * - searching by filename
   *
   * @param req Express request containing:
   * - courseId in path params
   * - optional sort, fileType, and search in query params
   * @param res Express response
   */
  async listByCourse(req: Request, res: Response): Promise<void> {
    try {
      const rawCourseId = req.params.courseId;
      const courseId = Array.isArray(rawCourseId) ? rawCourseId[0] : rawCourseId;

      const userId = (req.user as { id: string } | undefined)?.id;

      if (!courseId) {
        res.status(400).json({ message: 'courseId is required.' });
        return;
      }

      if (!userId) {
        res.status(401).json({ message: 'Unauthorized.' });
        return;
      }

      const sort = getSingleQueryParam(req.query.sort);
      const fileType = getSingleQueryParam(req.query.fileType);
      const search = getSingleQueryParam(req.query.search);

      const documents = await this.documentService.listByCourse(courseId, userId, {
        sort,
        fileType,
        search,
      });

      res.status(200).json(documents);
    } catch (error) {
      logger.error({ err: error }, 'Failed to fetch course documents');

      if (error instanceof Error && error.message === 'Course not found.') {
        res.status(404).json({ message: 'Course not found.' });
        return;
      }

      res.status(500).json({ message: 'Failed to fetch course documents.' });
    }
  }
}

export { DocumentController };
