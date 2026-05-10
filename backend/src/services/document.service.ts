import type { Express } from 'express';
import path from 'node:path';
import { prisma } from '../config/database';
import { storage } from '../config/minio';

/**
 * Input data required to upload a document.
 *
 * Properties:
 * - file: file object provided by multer
 * - courseId: ID of the course the document should be linked to
 * - ownerId: ID of the authenticated user uploading the file
 */
type UploadDocumentInput = {
  file: Express.Multer.File;
  courseId: string;
  ownerId: string;
};

/**
 * Supported sort directions for document queries.
 */
type SortDirection = 'asc' | 'desc';

/**
 * Generic sort key format used by query parameters.
 *
 * Format:
 * - "<field>:<direction>"
 *
 * Example:
 * - "createdAt:desc"
 * - "filename:asc"
 */
type SortKey<
  T,
  Suffixes extends string = SortDirection,
> = `${Extract<keyof T, string>}:${Suffixes}`;

/**
 * Document fields that are allowed to be used for sorting.
 *
 * Only these fields can be selected through the sort query parameter.
 */
type DocumentSortableFields = {
  createdAt: Date;
  filename: string;
  fileSize: number | null;
  fileType: string | null;
};

/**
 * Valid document sort query value.
 *
 * Examples:
 * - "createdAt:desc" for newest documents first
 * - "filename:asc" for alphabetical order
 * - "fileSize:desc" for largest files first
 */
type DocumentSort = SortKey<DocumentSortableFields>;

/**
 * Options for filtering and sorting document queries.
 *
 * Properties:
 * - sort: optional sort value in the format "<field>:<direction>"
 *   Example: "createdAt:desc", "filename:asc", "fileSize:desc"
 * - fileType: optional MIME type filter, e.g. "application/pdf"
 * - search: case-insensitive search string for filename matching
 *
 * These values are mapped from HTTP query parameters.
 * The sort value is accepted as a string because query parameters are untrusted input
 * and are validated before being used in the Prisma query.
 */
type ListDocumentsOptions = {
  sort?: string;
  fileType?: string;
  search?: string;
};

/**
 * Name of the MinIO bucket used to store uploaded course documents.
 */
const DOCUMENTS_BUCKET = 'documents';

/**
 * Default sort order for document listings.
 */
const DEFAULT_DOCUMENT_SORT: DocumentSort = 'createdAt:desc';

/**
 * Builds a Prisma-compatible orderBy clause from a generic sort query value.
 *
 * Expected format:
 * - "<field>:<direction>"
 *
 * Supported fields:
 * - createdAt
 * - filename
 * - fileSize
 * - fileType
 *
 * Supported directions:
 * - asc
 * - desc
 *
 * Invalid or missing sort values fall back to "createdAt:desc".
 *
 * @param sort Sort query value, e.g. "filename:asc" or "createdAt:desc"
 * @returns Prisma orderBy object
 */
function getDocumentOrderBy(sort: string = DEFAULT_DOCUMENT_SORT) {
  const allowedFields = ['createdAt', 'filename', 'fileSize', 'fileType'] as const;
  const [field, direction] = sort.split(':');

  if (
    !allowedFields.includes(field as (typeof allowedFields)[number]) ||
    (direction !== 'asc' && direction !== 'desc')
  ) {
    return { createdAt: 'desc' as const };
  }

  return {
    [field]: direction,
  };
}

/**
 * Sanitizes a filename segment so it can safely be used inside an object key.
 *
 * Behavior:
 * - replaces unsupported characters with "-"
 * - collapses repeated dashes
 * - trims leading and trailing dashes
 *
 * This helps avoid problematic object keys in MinIO / S3-compatible storage.
 *
 * @param name Raw filename without extension
 * @returns Sanitized filename segment
 */
function sanitizeFileName(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Service responsible for document-related business logic.
 *
 * Responsibilities:
 * - validate that a course belongs to the authenticated user
 * - upload file content to MinIO object storage
 * - persist document metadata in the database
 * - list stored documents for a specific course
 * - support filtering and sorting of document queries
 *
 * Storage model:
 * - file binary is stored in MinIO (object storage)
 * - metadata is stored in PostgreSQL via Prisma
 *
 * Design notes:
 * - separation of concerns: file storage vs metadata storage
 * - extensible query system (filter + sort via options object)
 */
class DocumentService {
  /**
   * Uploads a document to object storage and stores its metadata in the database.
   *
   * Workflow:
   * 1. Verify that the target course exists and belongs to the authenticated user
   * 2. Build a safe and unique object key for MinIO storage
   * 3. Ensure the target bucket exists
   * 4. Upload the file buffer to MinIO
   * 5. Store document metadata in the database
   *
   * Notes:
   * - The original filename is preserved in the database for display purposes
   * - A sanitized filename is used inside the object key to avoid unsafe characters
   * - A timestamp/random suffix is added to prevent key collisions
   *
   * @param input Upload input containing file, courseId, and ownerId
   * @returns Created document metadata entry
   *
   * @throws Error if the course does not exist or does not belong to the user
   * @throws Error if the MinIO upload fails
   */
  async upload({ file, courseId, ownerId }: UploadDocumentInput) {
    // Verify that the selected course exists and belongs to the authenticated user
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        ownerId,
      },
    });

    if (!course) {
      throw new Error('Course not found.');
    }

    // Extract extension and base filename for object-key generation
    const extension = path.extname(file.originalname);
    const originalBaseName = path.basename(file.originalname, extension);

    // Sanitize and limit the base filename for safer storage keys
    const sanitizedBaseName = sanitizeFileName(originalBaseName).slice(0, 50) || 'document';

    // Add a unique suffix to avoid collisions between uploads with similar names
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;

    // Build the final MinIO object key using a course-based folder structure
    const objectKey = `courses/${courseId}/${sanitizedBaseName}-${uniqueSuffix}${extension}`;

    // Ensure the MinIO bucket exists before uploading
    await storage.ensureBucket(DOCUMENTS_BUCKET);

    // Upload the binary file content to MinIO
    await storage.upload(DOCUMENTS_BUCKET, objectKey, file.buffer, {
      contentType: file.mimetype,
    });

    // Persist the document metadata in PostgreSQL
    return prisma.document.create({
      data: {
        filename: file.originalname,
        bucket: DOCUMENTS_BUCKET,
        objectKey,
        fileSize: file.size,
        fileType: file.mimetype,
        courseId,
        ownerId,
      },
    });
  }

  /**
   * Returns all documents for a course owned by the authenticated user.
   *
   * Workflow:
   * 1. Verify that the course exists and belongs to the authenticated user
   * 2. Build a dynamic filter object based on provided options
   * 3. Apply sorting using a validated generic sort key
   * 4. Query document metadata from the database
   *
   * Filtering capabilities:
   * - fileType: restrict results to a specific MIME type
   * - search: case-insensitive partial match on filename
   *
   * Sorting capabilities:
   * - createdAt
   * - filename
   * - fileSize
   * - fileType
   *
   * Sort format:
   * - "<field>:<asc|desc>", e.g. "createdAt:desc"
   *
   * Notes:
   * - Only metadata is returned, not the binary file content
   * - Results are always scoped to the authenticated user's course
   * - Default sorting is by newest documents first
   *
   * @param courseId ID of the course
   * @param ownerId ID of the authenticated user
   * @param options Optional filter and sort configuration
   *
   * @returns List of document metadata entries
   *
   * @throws Error if the course does not exist or does not belong to the user
   */
  async listByCourse(courseId: string, ownerId: string, options: ListDocumentsOptions = {}) {
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        ownerId,
      },
    });

    if (!course) {
      throw new Error('Course not found.');
    }

    /**
     * Build dynamic Prisma "where" filter object.
     *
     * Base filter:
     * - restrict to course and owner
     *
     * Optional filters:
     * - fileType: exact match on MIME type
     * - search: partial match on filename (case-insensitive)
     */
    const where: {
      courseId: string;
      ownerId: string;
      fileType?: string;
      filename?: { contains: string; mode: 'insensitive' };
    } = {
      courseId,
      ownerId,
    };

    if (options.fileType) {
      where.fileType = options.fileType;
    }

    if (options.search) {
      where.filename = {
        contains: options.search,
        mode: 'insensitive',
      };
    }

    return prisma.document.findMany({
      where,

      /**
       * Dynamic sorting based on provided option.
       * Falls back to "createdAt:desc" if no valid option is given.
       */
      orderBy: getDocumentOrderBy(options?.sort),

      /**
       * Select only relevant metadata fields for the frontend.
       * This avoids exposing internal storage details (e.g. bucket, objectKey).
       */
      select: {
        id: true,
        filename: true,
        fileSize: true,
        fileType: true,
        createdAt: true,
        courseId: true,
      },
    });
  }
}

export { DocumentService };
