import type { Express } from 'express';
import type { Readable } from 'node:stream';
import path from 'node:path';
import { OfficeParser, type OfficeChunk, type SupportedFileType } from 'officeparser';
import { prisma } from '../config/database';
import { storage } from '../config/minio';
import { CourseShareService } from './course-share.service';
import { logger } from '../lib/logger';

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
 * - limit: optional maximum number of documents to return
 *
 * These values are mapped from HTTP query parameters.
 * The sort value is accepted as a string because query parameters are untrusted input
 * and are validated before being used in the Prisma query.
 */
type ListDocumentsOptions = {
  sort?: string;
  fileType?: string;
  search?: string;
  limit?: number;
};

export type ReadCourseDocumentsOptions = {
  documentIds?: string[];
  query?: string;
  maxCharacters?: number;
};

export type ReadCourseDocumentChunk = {
  documentId: string;
  filename: string;
  index: number;
  text: string;
  score?: number;
  truncated: boolean;
  metadata?: {
    sourceType?: string;
    pageNumber?: number;
    slideNumber?: number;
    closestHeading?: string;
    startIndex?: number;
    endIndex?: number;
  };
};

export type ReadCourseDocumentsResult = {
  courseId: string;
  documents: Array<{
    id: string;
    filename: string;
    fileSize: number | null;
    fileType: string | null;
    createdAt: Date;
    courseId: string;
    readableType: 'text' | SupportedFileType | null;
  }>;
  chunks: ReadCourseDocumentChunk[];
  skipped: Array<{ documentId: string; filename: string; reason: string }>;
  errors: Array<{ documentId: string; filename: string; message: string }>;
  warnings: string[];
  totalDocuments: number;
  returnedCharacters: number;
  maxCharacters: number;
  truncated: boolean;
};

/**
 * Name of the MinIO bucket used to store uploaded course documents.
 */
const DOCUMENTS_BUCKET = 'documents';

/**
 * Default sort order for document listings.
 */
const DEFAULT_DOCUMENT_SORT: DocumentSort = 'createdAt:desc';
const DEFAULT_READ_MAX_CHARACTERS = 25_000;
const MAX_READ_CHARACTERS = 60_000;
const DOCUMENT_CHUNK_SIZE = 1_200;
const DOCUMENT_CHUNK_OVERLAP = 120;
type ReadableOfficeType = 'pdf' | 'docx' | 'pptx';

type StoredDocumentForReading = {
  id: string;
  filename: string;
  bucket: string;
  objectKey: string;
  fileSize: number | null;
  fileType: string | null;
  createdAt: Date;
  courseId: string;
};

type CandidateChunk = ReadCourseDocumentChunk & {
  order: number;
};

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

function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeMaxCharacters(value?: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_READ_MAX_CHARACTERS;
  }

  return Math.min(MAX_READ_CHARACTERS, Math.max(1, Math.floor(value)));
}

function filenameExtension(filename: string): string {
  return path.extname(filename).toLowerCase().replace(/^\./, '');
}

function getReadableDocumentType(
  fileType: string | null,
  filename: string
): 'text' | ReadableOfficeType | null {
  const extension = filenameExtension(filename);

  if (fileType === 'text/plain' || extension === 'txt') return 'text';
  if (fileType === 'application/pdf' || extension === 'pdf') return 'pdf';

  if (
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    extension === 'docx'
  ) {
    return 'docx';
  }

  if (
    fileType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    extension === 'pptx'
  ) {
    return 'pptx';
  }

  return null;
}

function getUnsupportedReason(fileType: string | null, filename: string): string {
  const extension = filenameExtension(filename);

  if (fileType === 'application/msword' || extension === 'doc') {
    return 'Legacy .doc files are not supported for AI reading. Please upload a .docx version.';
  }

  if (fileType === 'application/vnd.ms-powerpoint' || extension === 'ppt') {
    return 'Legacy .ppt files are not supported for AI reading. Please upload a .pptx version.';
  }

  return 'This document type is not supported for AI reading.';
}

function queryTerms(query?: string): string[] {
  return Array.from(
    new Set(
      (query ?? '')
        .toLowerCase()
        .split(/[^a-z0-9]+/i)
        .map((term) => term.trim())
        .filter((term) => term.length >= 2)
    )
  );
}

function scoreChunk(text: string, terms: string[]): number | undefined {
  if (terms.length === 0) return undefined;

  const normalized = text.toLowerCase();
  return terms.reduce((score, term) => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches = normalized.match(new RegExp(escaped, 'g'));
    return score + (matches?.length ?? 0);
  }, 0);
}

function splitTextIntoChunks(text: string, chunkSize = DOCUMENT_CHUNK_SIZE): string[] {
  const normalized = normalizeText(text);
  if (!normalized) return [];

  const chunks: string[] = [];
  let start = 0;

  while (start < normalized.length) {
    const hardEnd = Math.min(normalized.length, start + chunkSize);
    let end = hardEnd;

    if (hardEnd < normalized.length) {
      const preferredBreak = Math.max(
        normalized.lastIndexOf('\n\n', hardEnd),
        normalized.lastIndexOf('\n', hardEnd),
        normalized.lastIndexOf('. ', hardEnd),
        normalized.lastIndexOf(' ', hardEnd)
      );

      if (preferredBreak > start + Math.floor(chunkSize * 0.5)) {
        end = preferredBreak + (normalized[preferredBreak] === '.' ? 1 : 0);
      }
    }

    const chunk = normalizeText(normalized.slice(start, end));
    if (chunk) chunks.push(chunk);

    if (end >= normalized.length) break;
    start = Math.max(end - DOCUMENT_CHUNK_OVERLAP, start + 1);
  }

  return chunks;
}

function formatIssue(issue: { code?: unknown; message?: unknown }): string {
  const message = typeof issue.message === 'string' ? issue.message : 'Unknown parser warning';
  const code = typeof issue.code === 'string' ? issue.code : undefined;
  return code ? `${code}: ${message}` : message;
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
/**
 * Result of resolving a document for download.
 *
 * Properties:
 * - stream: Readable stream of the file content from object storage
 * - filename: original filename stored at upload time, used for Content-Disposition
 * - contentType: MIME type stored at upload time, used for Content-Type
 * - fileSize: size in bytes if known, used for Content-Length
 */
type DownloadableDocument = {
  stream: Readable;
  filename: string;
  contentType: string;
  fileSize: number | null;
};

class DocumentService {
  constructor(private readonly courseShareService: CourseShareService = new CourseShareService()) {}

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
    // Check if user has access to the course (owner OR shared with them)
    const hasAccess = await this.courseShareService.checkAccess(courseId, ownerId);
    if (!hasAccess) {
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

   * Returns all documents for a course accessible by the authenticated user.
   *
   * Workflow:
   * 1. Check if user has access to the course (owner OR shared with them)
   * 2. Build a dynamic filter object based on provided options
   * 3. Apply sorting using a validated generic sort key
   * 4. Query document metadata from the database (all documents in the course, not just owned by user)
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
   * - Results include all documents in the course (shared documents are visible to all users with access)
   * - Default sorting is by newest documents first
   *
   * @param courseId ID of the course
   * @param userId ID of the authenticated user
   * @param options Optional filter and sort configuration
   *
   * @returns List of document metadata entries
   *
   * @throws Error if the user does not have access to the course
   */
  async listByCourse(courseId: string, userId: string, options: ListDocumentsOptions = {}) {
    // Check if user has access to the course (owner OR shared with them)
    const hasAccess = await this.courseShareService.checkAccess(courseId, userId);

    if (!hasAccess) {
      throw new Error('Course not found.');
    }

    /**
     * Build dynamic Prisma "where" filter object.
     *
     * Base filter:
     * - restrict to course
     *
     * Optional filters:
     * - fileType: exact match on MIME type
     * - search: partial match on filename (case-insensitive)
     */
    const where: {
      courseId: string;
      fileType?: string;
      filename?: { contains: string; mode: 'insensitive' };
    } = {
      courseId,
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

  /**
   * Reads uploaded course documents for AI context.
   *
   * The method intentionally returns structured text chunks instead of raw
   * binary files. This keeps the MCP tool safe to expose to the agent while
   * preserving citation metadata such as document id, filename, page/slide,
   * and truncation state.
   */
  async readCourseDocuments(
    courseId: string,
    userId: string,
    options: ReadCourseDocumentsOptions = {}
  ): Promise<ReadCourseDocumentsResult> {
    const hasAccess = await this.courseShareService.checkAccess(courseId, userId);

    if (!hasAccess) {
      throw new Error('Course not found.');
    }

    const maxCharacters = normalizeMaxCharacters(options.maxCharacters);
    const requestedDocumentIds = Array.isArray(options.documentIds)
      ? Array.from(new Set(options.documentIds.filter((id) => id.trim().length > 0)))
      : [];

    const documents = await prisma.document.findMany({
      where: {
        courseId,
        ...(requestedDocumentIds.length > 0 ? { id: { in: requestedDocumentIds } } : {}),
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        filename: true,
        bucket: true,
        objectKey: true,
        fileSize: true,
        fileType: true,
        createdAt: true,
        courseId: true,
      },
    });

    const terms = queryTerms(options.query);
    const chunks: CandidateChunk[] = [];
    const skipped: ReadCourseDocumentsResult['skipped'] = [];
    const errors: ReadCourseDocumentsResult['errors'] = [];
    const warnings: string[] = [];
    let order = 0;

    for (const document of documents) {
      const readableType = getReadableDocumentType(document.fileType, document.filename);

      if (!readableType) {
        skipped.push({
          documentId: document.id,
          filename: document.filename,
          reason: getUnsupportedReason(document.fileType, document.filename),
        });
        continue;
      }

      try {
        const buffer = await storage.downloadBuffer(document.bucket, document.objectKey);
        const extracted = await this.extractReadableChunks(
          document,
          readableType,
          buffer,
          warnings
        );

        if (extracted.length === 0) {
          warnings.push(`No readable text was extracted from "${document.filename}".`);
          continue;
        }

        for (const chunk of extracted) {
          const text = normalizeText(chunk.text);
          if (!text) continue;

          const score = scoreChunk(text, terms);
          chunks.push({
            documentId: document.id,
            filename: document.filename,
            index: chunk.index,
            text,
            ...(score !== undefined ? { score } : {}),
            truncated: false,
            metadata: chunk.metadata,
            order,
          });
          order += 1;
        }
      } catch (error) {
        logger.warn(
          { err: error, documentId: document.id, courseId },
          'Failed to extract document text for AI context'
        );
        errors.push({
          documentId: document.id,
          filename: document.filename,
          message: error instanceof Error ? error.message : 'Failed to read document.',
        });
      }
    }

    const rankedChunks =
      terms.length === 0
        ? chunks
        : [...chunks].sort((a, b) => (b.score ?? 0) - (a.score ?? 0) || a.order - b.order);

    const cappedChunks: ReadCourseDocumentChunk[] = [];
    let returnedCharacters = 0;
    let truncated = false;

    for (const chunk of rankedChunks) {
      if (returnedCharacters >= maxCharacters) {
        truncated = true;
        break;
      }

      const remaining = maxCharacters - returnedCharacters;
      const textFits = chunk.text.length <= remaining;
      const text = textFits ? chunk.text : chunk.text.slice(0, remaining).trimEnd();

      if (!text) {
        truncated = true;
        break;
      }

      cappedChunks.push({
        documentId: chunk.documentId,
        filename: chunk.filename,
        index: chunk.index,
        text,
        ...(chunk.score !== undefined ? { score: chunk.score } : {}),
        truncated: !textFits,
        metadata: chunk.metadata,
      });

      returnedCharacters += text.length;

      if (!textFits) {
        truncated = true;
        break;
      }
    }

    if (!truncated && cappedChunks.length < rankedChunks.length) {
      truncated = true;
    }

    return {
      courseId,
      documents: documents.map((document) => ({
        id: document.id,
        filename: document.filename,
        fileSize: document.fileSize,
        fileType: document.fileType,
        createdAt: document.createdAt,
        courseId: document.courseId,
        readableType: getReadableDocumentType(document.fileType, document.filename),
      })),
      chunks: cappedChunks,
      skipped,
      errors,
      warnings,
      totalDocuments: documents.length,
      returnedCharacters,
      maxCharacters,
      truncated,
    };
  }

  private async extractReadableChunks(
    document: StoredDocumentForReading,
    readableType: 'text' | ReadableOfficeType,
    buffer: Buffer,
    warnings: string[]
  ): Promise<
    Array<{
      index: number;
      text: string;
      metadata?: ReadCourseDocumentChunk['metadata'];
    }>
  > {
    if (readableType === 'text') {
      return splitTextIntoChunks(buffer.toString('utf8')).map((text, index) => ({
        index,
        text,
        metadata: {
          sourceType: 'text',
        },
      }));
    }

    const parserWarnings: string[] = [];
    const ast = await OfficeParser.parseOffice(buffer, {
      fileType: readableType,
      ocr: false,
      onWarning: (issue) => parserWarnings.push(formatIssue(issue)),
    });
    const conversion = await ast.to('chunks', {
      chunksConfig: {
        strategy: 'document-structure',
        maxChunkSize: DOCUMENT_CHUNK_SIZE,
        addStartIndex: true,
      },
    });

    const officeChunks = Array.isArray(conversion.value) ? (conversion.value as OfficeChunk[]) : [];

    const conversionWarnings = conversion.messages.map(formatIssue);
    const astWarnings = ast.warnings.map(formatIssue);

    for (const warning of [...parserWarnings, ...astWarnings, ...conversionWarnings]) {
      warnings.push(`${document.filename}: ${warning}`);
    }

    return officeChunks.map((chunk, index) => ({
      index,
      text: chunk.text,
      metadata: {
        sourceType: chunk.metadata.sourceType,
        pageNumber: chunk.metadata.pageNumber,
        slideNumber: chunk.metadata.slideNumber,
        closestHeading: chunk.metadata.closestHeading,
        startIndex: chunk.startIndex,
        endIndex: chunk.endIndex,
      },
    }));
  }

  /**
   * Resolves a document for download by the authenticated user.
   *
   * Workflow:
   * 1. Look up the document by id (no owner filter yet — access is decided below)
   * 2. Verify the user has access to the document's course
   *    (owner of the course OR the course is shared with them)
   * 3. Open a download stream from object storage
   *
   * Access model:
   * - Mirrors CourseService.hasAccess: owner OR shared user.
   * - This means collaborators on a shared course can download its documents,
   *   which is the whole point of sharing.
   *
   * Error semantics:
   * - DOCUMENT_NOT_FOUND: document id does not exist
   * - DOCUMENT_ACCESS_DENIED: document exists but the user has no course access
   *
   * The caller is responsible for piping `stream` to the HTTP response and
   * for setting the response headers using the returned metadata.
   *
   * @param documentId Document id
   * @param userId Authenticated user id
   *
   * @returns Stream + metadata required to respond to a download request
   *
   * @throws Error('DOCUMENT_NOT_FOUND') if the document does not exist
   * @throws Error('DOCUMENT_ACCESS_DENIED') if the user has no access to the course
   */
  async getDownloadable(documentId: string, userId: string): Promise<DownloadableDocument> {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        filename: true,
        bucket: true,
        objectKey: true,
        fileSize: true,
        fileType: true,
        courseId: true,
      },
    });

    if (!document) {
      throw new Error('DOCUMENT_NOT_FOUND');
    }

    const hasAccess = await this.courseShareService.checkAccess(document.courseId, userId);

    if (!hasAccess) {
      throw new Error('DOCUMENT_ACCESS_DENIED');
    }

    const stream = await storage.download(document.bucket, document.objectKey);

    return {
      stream,
      filename: document.filename,
      contentType: document.fileType ?? 'application/octet-stream',
      fileSize: document.fileSize,
    };
  }

  /**
   * Deletes a document owned by the authenticated user.
   *
   * Workflow:
   * 1. Look up the document and its parent course in a single query
   * 2. Verify the user owns the parent course
   *    (only course owners can delete — shared collaborators have read access only)
   * 3. Delete the database record first so the document no longer appears in the UI
   * 4. Delete the underlying object from storage
   *    Storage failures are logged but do not fail the request — the user-visible
   *    state is already consistent, and the orphan object can be reclaimed later
   *
   * Order rationale:
   * - DB first, storage second: if storage fails after the DB delete, the user
   *   sees the document as gone (which matches their intent). The leftover
   *   object in MinIO is invisible and recoverable.
   * - The reverse order would create a broken link visible to the user if the
   *   DB delete failed after the storage delete.
   *
   * Error semantics:
   * - DOCUMENT_NOT_FOUND: document id does not exist
   * - DOCUMENT_FORBIDDEN: document exists but the user is not the course owner
   *
   * @param documentId Document id
   * @param userId Authenticated user id
   *
   * @throws Error('DOCUMENT_NOT_FOUND') if the document does not exist
   * @throws Error('DOCUMENT_FORBIDDEN') if the user is not the course owner
   */
  async deleteForOwner(documentId: string, userId: string): Promise<void> {
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        bucket: true,
        objectKey: true,
        courseId: true,
      },
    });

    if (!document) {
      throw new Error('DOCUMENT_NOT_FOUND');
    }

    // Check if user has access to the course (owner OR shared with them)
    const hasAccess = await this.courseShareService.checkAccess(document.courseId, userId);
    if (!hasAccess) {
      throw new Error('DOCUMENT_FORBIDDEN');
    }

    await prisma.document.delete({
      where: { id: documentId },
    });

    try {
      await storage.delete(document.bucket, document.objectKey);
    } catch (storageError) {
      // Best-effort cleanup. The DB record is already gone so the user
      // cannot see or interact with the document; an orphan object in
      // storage is acceptable and can be reclaimed by a janitor job.
      logger.error(
        { err: storageError, documentId, bucket: document.bucket, objectKey: document.objectKey },
        'Failed to delete document object from storage'
      );
    }
  }

  /**
   * Returns all documents owned by the authenticated user.
   *
   * Workflow:
   * 1. Build a dynamic filter object based on provided options
   * 2. Apply optional filtering by MIME type
   * 3. Apply optional filename search
   * 4. Apply validated sorting
   * 5. Return document metadata together with basic course information
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
   * - Results are scoped to the authenticated user
   * - Related course information is included to provide context in the
   *   Resources overview page
   * - Results are ordered by newest documents first by default
   *
   * @param ownerId ID of the authenticated user
   * @param options Optional filter and sort configuration
   *
   * @returns List of document metadata entries including course information
   */
  async listByOwner(ownerId: string, options: ListDocumentsOptions = {}) {
    const where: {
      ownerId: string;
      fileType?: string;
      filename?: { contains: string; mode: 'insensitive' };
    } = {
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
      orderBy: getDocumentOrderBy(options?.sort),
      take: Math.min(Math.max(options.limit ?? 3, 1), 50),
      select: {
        id: true,
        filename: true,
        fileSize: true,
        fileType: true,
        createdAt: true,
        courseId: true,
        course: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
    });
  }
}

export { DocumentService };
