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
 * Supported sorting options for document queries.
 *
 * Naming convention:
 * - <field><direction>
 *
 * Examples:
 * - dateDesc: newest documents first (default)
 * - nameAsc: alphabetical order (A → Z)
 * - sizeDesc: largest files first
 *
 * These values are typically provided by the frontend via query parameters.
 */
type DocumentSortOption =
  | 'dateDesc'
  | 'dateAsc'
  | 'nameAsc'
  | 'nameDesc'
  | 'sizeAsc'
  | 'sizeDesc'
  | 'typeAsc'
  | 'typeDesc';

/**
 * Options for filtering and sorting document queries.
 *
 * Properties:
 * - sortBy: defines how the result set should be ordered
 * - fileType: optional MIME type filter (e.g. application/pdf)
 * - search: case-insensitive search string for filename matching
 *
 * These options are usually mapped from HTTP query parameters.
 */
type ListDocumentsOptions = {
  sortBy?: DocumentSortOption;
  fileType?: string;
  search?: string;
};

/**
 * Name of the MinIO bucket used to store uploaded course documents.
 */
const DOCUMENTS_BUCKET = 'documents';

/**
 * Maps a DocumentSortOption to a Prisma-compatible orderBy clause.
 *
 * This function translates frontend-friendly sort options into
 * database query instructions.
 *
 * Default behavior:
 * - If no sort option is provided, documents are sorted by newest first.
 *
 * @param sortBy Selected sort option (e.g. "nameAsc", "sizeDesc")
 * @returns Prisma orderBy object
 */
function getDocumentOrderBy(sortBy: DocumentSortOption = 'dateDesc') {
  switch (sortBy) {
    case 'dateAsc':
      return { createdAt: 'asc' as const };
    case 'nameAsc':
      return { filename: 'asc' as const };
    case 'nameDesc':
      return { filename: 'desc' as const };
    case 'sizeAsc':
      return { fileSize: 'asc' as const };
    case 'sizeDesc':
      return { fileSize: 'desc' as const };
    case 'typeAsc':
      return { fileType: 'asc' as const };
    case 'typeDesc':
      return { fileType: 'desc' as const };
    case 'dateDesc':
    default:
      return { createdAt: 'desc' as const };
  }
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
   * 3. Apply sorting using a predefined mapping function
   * 4. Query document metadata from the database
   *
   * Filtering capabilities:
   * - fileType: restrict results to a specific MIME type
   * - search: case-insensitive partial match on filename
   *
   * Sorting capabilities:
   * - date (createdAt)
   * - filename
   * - fileSize
   * - fileType
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
       * Falls back to "createdAt desc" if no option is given.
       */
      orderBy: getDocumentOrderBy(options.sortBy),

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
