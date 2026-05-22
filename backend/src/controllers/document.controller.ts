import { logger } from '../lib/logger';
import { getSingleQueryParam } from '../utils/query';
import type { Request, Response } from 'express';
import { DocumentService } from '../services/document.service';

/**
 * Builds a Content-Disposition header value that is safe for filenames
 * containing non-ASCII or special characters.
 *
 * Uses RFC 5987 encoding: both a sanitized ASCII fallback (`filename=`)
 * and a UTF-8 encoded value (`filename*=`) so that older clients still
 * receive a valid name and modern clients see the original.
 *
 * @param disposition "inline" or "attachment"
 * @param filename Original filename as stored at upload time
 */
function buildContentDisposition(disposition: 'inline' | 'attachment', filename: string): string {
  const fallback = filename.replace(/[^\x20-\x7e]/g, '_').replace(/"/g, "'");
  const encoded = encodeURIComponent(filename);
  return `${disposition}; filename="${fallback}"; filename*=UTF-8''${encoded}`;
}

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

  /**
   * Streams a stored document back to the client for opening or downloading.
   *
   * Workflow:
   * 1. Validate document id and authenticated user
   * 2. Ask the service for a download stream + metadata
   * 3. Set Content-Type, Content-Length, and Content-Disposition headers
   * 4. Pipe the storage stream to the response
   *
   * Query parameters:
   * - disposition: "inline" (default) for opening in-browser, "attachment" to force download
   *
   * Error mapping:
   * - 401: no authenticated user
   * - 404: document not found
   * - 403: user has no access to the document's course
   * - 500: unexpected errors (including storage failures)
   *
   * @param req Express request with `id` in params and optional `disposition` in query
   * @param res Express response, used as a writable stream for the file body
   */
  async download(req: Request, res: Response): Promise<void> {
    try {
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      const userId = (req.user as { id: string } | undefined)?.id;

      if (!id) {
        res.status(400).json({ message: 'id is required.' });
        return;
      }

      if (!userId) {
        res.status(401).json({ message: 'Unauthorized.' });
        return;
      }

      const rawDisposition = getSingleQueryParam(req.query.disposition);
      const disposition: 'inline' | 'attachment' =
        rawDisposition === 'attachment' ? 'attachment' : 'inline';

      const { stream, filename, contentType, fileSize } =
        await this.documentService.getDownloadable(id, userId);

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', buildContentDisposition(disposition, filename));

      if (fileSize !== null) {
        res.setHeader('Content-Length', fileSize.toString());
      }

      stream.on('error', (streamError: Error) => {
        logger.error({ err: streamError, documentId: id }, 'Document stream error');
        if (!res.headersSent) {
          res.status(500).json({ message: 'Failed to stream document.' });
          return;
        }
        res.destroy(streamError);
      });

      stream.pipe(res);
    } catch (error) {
      logger.error({ err: error }, 'Failed to download document');

      if (error instanceof Error && error.message === 'DOCUMENT_NOT_FOUND') {
        res.status(404).json({ message: 'Document not found.' });
        return;
      }

      if (error instanceof Error && error.message === 'DOCUMENT_ACCESS_DENIED') {
        res.status(403).json({ message: 'You do not have access to this document.' });
        return;
      }

      res.status(500).json({ message: 'Failed to download document.' });
    }
  }

  /**
   * Deletes a document owned by the authenticated user.
   *
   * Workflow:
   * 1. Validate document id and authenticated user
   * 2. Ask the service to delete the document (DB + storage)
   * 3. Respond with 204 No Content on success
   *
   * Error mapping:
   * - 400: missing id
   * - 401: no authenticated user
   * - 404: document not found
   * - 403: user is not the course owner
   * - 500: unexpected errors
   *
   * @param req Express request with `id` in params
   * @param res Express response
   */
  async deleteById(req: Request, res: Response): Promise<void> {
    try {
      const rawId = req.params.id;
      const id = Array.isArray(rawId) ? rawId[0] : rawId;
      const userId = (req.user as { id: string } | undefined)?.id;

      if (!id) {
        res.status(400).json({ message: 'id is required.' });
        return;
      }

      if (!userId) {
        res.status(401).json({ message: 'Unauthorized.' });
        return;
      }

      await this.documentService.deleteForOwner(id, userId);

      res.status(204).send();
    } catch (error) {
      logger.error({ err: error }, 'Failed to delete document');

      if (error instanceof Error && error.message === 'DOCUMENT_NOT_FOUND') {
        res.status(404).json({ message: 'Document not found.' });
        return;
      }

      if (error instanceof Error && error.message === 'DOCUMENT_FORBIDDEN') {
        res.status(403).json({ message: 'You do not have permission to delete this document.' });
        return;
      }

      res.status(500).json({ message: 'Failed to delete document.' });
    }
  }
}

export { DocumentController };
