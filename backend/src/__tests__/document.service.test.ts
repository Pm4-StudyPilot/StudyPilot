import { describe, it, expect, beforeEach, mock } from 'bun:test';
import { Readable } from 'node:stream';

type MockCourseRecord = {
  id: string;
  ownerId: string;
};

type MockDocumentRecord = {
  id: string;
  filename: string;
  fileSize: number | null;
  fileType: string | null;
  createdAt: Date;
  courseId: string;
  bucket?: string;
  objectKey?: string;
  ownerId?: string;
};

type MockDocumentDownloadRecord = {
  filename: string;
  bucket: string;
  objectKey: string;
  fileSize: number | null;
  fileType: string | null;
  courseId: string;
};

type MockDocumentDeleteRecord = {
  bucket: string;
  objectKey: string;
  course: { ownerId: string };
};

/**
 * Mock functions for Prisma and MinIO dependencies.
 */
const mockCourseFindFirst = mock(async (): Promise<MockCourseRecord | null> => null);

const mockDocumentCreate = mock(
  async (): Promise<MockDocumentRecord> => ({
    id: 'doc-default',
    filename: 'default.pdf',
    fileSize: null,
    fileType: null,
    createdAt: new Date(),
    courseId: 'course-1',
  })
);

const mockDocumentFindMany = mock(async (): Promise<MockDocumentRecord[]> => []);
// findUnique is used by both download and delete code paths; the per-test
// mockResolvedValueOnce() determines which record shape is returned.
const mockDocumentFindUnique = mock(
  async (): Promise<MockDocumentDownloadRecord | MockDocumentDeleteRecord | null> => null
);
const mockDocumentDelete = mock(async (): Promise<void> => undefined);

const mockEnsureBucket = mock(async (): Promise<void> => undefined);
const mockStorageUpload = mock(async (): Promise<void> => undefined);
const mockStorageDownload = mock(async (): Promise<Readable> => Readable.from([]));
const mockStorageDelete = mock(async (): Promise<void> => undefined);
/**
 * Mock Prisma database module.
 */
mock.module('../config/database', () => ({
  prisma: {
    course: {
      findFirst: mockCourseFindFirst,
    },
    document: {
      create: mockDocumentCreate,
      findMany: mockDocumentFindMany,
      findUnique: mockDocumentFindUnique,
      delete: mockDocumentDelete,
    },
  },
}));

/**
 * Mock MinIO storage module.
 */
mock.module('../config/minio', () => ({
  storage: {
    ensureBucket: mockEnsureBucket,
    upload: mockStorageUpload,
    download: mockStorageDownload,
    delete: mockStorageDelete,
  },
}));

// Import service after mocks are defined
const { DocumentService } = await import('../services/document.service');

/**
 * Unit tests for DocumentService.
 *
 * Covered scenarios:
 * - successful upload
 * - upload failure when course is not found
 * - successful listByCourse query
 * - listByCourse filtering and sorting
 * - listByCourse failure when course is not found
 */
describe('DocumentService', () => {
  beforeEach(() => {
    mockCourseFindFirst.mockClear();
    mockDocumentCreate.mockClear();
    mockDocumentFindMany.mockClear();
    mockDocumentFindUnique.mockClear();
    mockDocumentDelete.mockClear();
    mockEnsureBucket.mockClear();
    mockStorageUpload.mockClear();
    mockStorageDownload.mockClear();
    mockStorageDelete.mockClear();
  });

  /**
   * Test cases for upload()
   */
  describe('upload', () => {
    /**
     * Test case: Successful upload
     *
     * Scenario:
     * - course exists and belongs to the user
     * - file is uploaded to MinIO
     * - document metadata is stored in Prisma
     *
     * Expected behavior:
     * - course ownership is checked
     * - bucket is ensured
     * - upload is called with generated object key
     * - metadata is persisted
     */
    it('should upload file to storage and persist metadata', async () => {
      mockCourseFindFirst.mockResolvedValueOnce({
        id: 'course-1',
        ownerId: 'user-1',
      });

      mockDocumentCreate.mockResolvedValueOnce({
        id: 'doc-1',
        filename: 'My Slides.pdf',
        bucket: 'documents',
        objectKey: 'courses/course-1/My-Slides-123456.pdf',
        fileSize: 2048,
        fileType: 'application/pdf',
        courseId: 'course-1',
        ownerId: 'user-1',
        createdAt: new Date(),
      });

      const service = new DocumentService();

      const file = {
        originalname: 'My Slides.pdf',
        mimetype: 'application/pdf',
        size: 2048,
        buffer: Buffer.from('fake-pdf-content'),
      } as Express.Multer.File;

      const result = await service.upload({
        file,
        courseId: 'course-1',
        ownerId: 'user-1',
      });

      expect(mockCourseFindFirst).toHaveBeenCalledWith({
        where: {
          id: 'course-1',
          ownerId: 'user-1',
        },
      });

      expect(mockEnsureBucket).toHaveBeenCalledWith('documents');

      expect(mockStorageUpload).toHaveBeenCalledTimes(1);
      expect(mockStorageUpload).toHaveBeenCalledWith(
        'documents',
        expect.stringContaining('courses/course-1/'),
        file.buffer,
        {
          contentType: 'application/pdf',
        }
      );

      expect(mockDocumentCreate).toHaveBeenCalledTimes(1);
      expect(mockDocumentCreate).toHaveBeenCalledWith({
        data: {
          filename: 'My Slides.pdf',
          bucket: 'documents',
          objectKey: expect.stringContaining('courses/course-1/'),
          fileSize: 2048,
          fileType: 'application/pdf',
          courseId: 'course-1',
          ownerId: 'user-1',
        },
      });

      expect(result.id).toBe('doc-1');
      expect(result.filename).toBe('My Slides.pdf');
      expect(result.bucket).toBe('documents');
      expect(typeof result.objectKey).toBe('string');
      expect(result.objectKey.length).toBeGreaterThan(0);
      expect(result.fileSize).toBe(2048);
      expect(result.fileType).toBe('application/pdf');
      expect(result.courseId).toBe('course-1');
      expect(result.ownerId).toBe('user-1');
    });

    /**
     * Test case: Filename sanitization and generated object key
     *
     * Scenario:
     * The filename contains spaces and special characters.
     *
     * Expected behavior:
     * - object key uses sanitized base name
     * - upload path starts with courses/{courseId}/
     */
    it('should sanitize filename when generating object key', async () => {
      mockCourseFindFirst.mockResolvedValueOnce({
        id: 'course-1',
        ownerId: 'user-1',
      });

      mockDocumentCreate.mockResolvedValueOnce({
        id: 'doc-1',
        filename: 'My Slides.pdf',
        bucket: 'documents',
        objectKey: 'courses/course-1/My-Slides-123456.pdf',
        fileSize: 2048,
        fileType: 'application/pdf',
        courseId: 'course-1',
        ownerId: 'user-1',
        createdAt: new Date(),
      });

      const service = new DocumentService();

      const file = {
        originalname: 'My * Weird Slides !!!.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('fake-content'),
      } as Express.Multer.File;

      await service.upload({
        file,
        courseId: 'course-1',
        ownerId: 'user-1',
      });

      const firstCall = mockStorageUpload.mock.calls[0];
      expect(firstCall).toBeDefined();

      if (!firstCall) {
        throw new Error('Expected storage.upload to be called once');
      }

      const uploadArgs = firstCall as unknown as [string, string, Buffer, { contentType: string }];

      const objectKey = uploadArgs[1];

      expect(objectKey).toContain('courses/course-1/');
      expect(objectKey).toContain('My-Weird-Slides');
      expect(objectKey.endsWith('.pdf')).toBe(true);
    });

    /**
     * Test case: Course not found during upload
     *
     * Expected behavior:
     * - throws "Course not found."
     * - no upload to MinIO
     * - no DB insert
     */
    it('should throw if course is not found during upload', async () => {
      mockCourseFindFirst.mockResolvedValueOnce(null);

      const service = new DocumentService();

      const file = {
        originalname: 'Slides.pdf',
        mimetype: 'application/pdf',
        size: 1024,
        buffer: Buffer.from('fake-content'),
      } as Express.Multer.File;

      await expect(
        service.upload({
          file,
          courseId: 'course-1',
          ownerId: 'user-1',
        })
      ).rejects.toThrow('Course not found.');

      expect(mockEnsureBucket).not.toHaveBeenCalled();
      expect(mockStorageUpload).not.toHaveBeenCalled();
      expect(mockDocumentCreate).not.toHaveBeenCalled();
    });
  });

  /**
   * Test cases for listByCourse()
   */
  describe('listByCourse', () => {
    /**
     * Test case: Successful listByCourse with default sorting
     *
     * Scenario:
     * - course exists and belongs to the user
     * - no explicit filter or sort options provided
     *
     * Expected behavior:
     * - documents are queried for the correct course and owner
     * - default sorting is createdAt desc
     * - only selected metadata is returned
     */
    it('should return documents sorted by newest first by default', async () => {
      const documents: Array<{
        id: string;
        filename: string;
        fileSize: number | null;
        fileType: string | null;
        createdAt: Date;
        courseId: string;
      }> = [
        {
          id: 'doc-1',
          filename: 'Agile.pdf',
          fileSize: 1234,
          fileType: 'application/pdf',
          createdAt: new Date('2026-04-20T10:00:00.000Z'),
          courseId: 'course-1',
        },
      ];
      mockCourseFindFirst.mockResolvedValueOnce({
        id: 'course-1',
        ownerId: 'user-1',
      });

      mockDocumentFindMany.mockResolvedValueOnce(documents);

      const service = new DocumentService();
      const result = await service.listByCourse('course-1', 'user-1');

      expect(mockCourseFindFirst).toHaveBeenCalledWith({
        where: {
          id: 'course-1',
          ownerId: 'user-1',
        },
      });

      expect(mockDocumentFindMany).toHaveBeenCalledWith({
        where: {
          courseId: 'course-1',
          ownerId: 'user-1',
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          filename: true,
          fileSize: true,
          fileType: true,
          createdAt: true,
          courseId: true,
        },
      });

      expect(result).toEqual(documents);
    });

    /**
     * Test case: listByCourse with fileType filter
     *
     * Expected behavior:
     * - fileType is added to Prisma where clause
     */
    it('should apply fileType filter when provided', async () => {
      mockCourseFindFirst.mockResolvedValueOnce({
        id: 'course-1',
        ownerId: 'user-1',
      });

      mockDocumentFindMany.mockResolvedValueOnce([]);

      const service = new DocumentService();

      await service.listByCourse('course-1', 'user-1', {
        fileType: 'application/pdf',
      });

      expect(mockDocumentFindMany).toHaveBeenCalledWith({
        where: {
          courseId: 'course-1',
          ownerId: 'user-1',
          fileType: 'application/pdf',
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          filename: true,
          fileSize: true,
          fileType: true,
          createdAt: true,
          courseId: true,
        },
      });
    });

    /**
     * Test case: listByCourse with filename search
     *
     * Expected behavior:
     * - search term is mapped to case-insensitive filename contains filter
     */
    it('should apply case-insensitive filename search when provided', async () => {
      mockCourseFindFirst.mockResolvedValueOnce({
        id: 'course-1',
        ownerId: 'user-1',
      });

      mockDocumentFindMany.mockResolvedValueOnce([]);

      const service = new DocumentService();

      await service.listByCourse('course-1', 'user-1', {
        search: 'agile',
      });

      expect(mockDocumentFindMany).toHaveBeenCalledWith({
        where: {
          courseId: 'course-1',
          ownerId: 'user-1',
          filename: {
            contains: 'agile',
            mode: 'insensitive',
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          filename: true,
          fileSize: true,
          fileType: true,
          createdAt: true,
          courseId: true,
        },
      });
    });

    /**
     * Test case: listByCourse with custom sorting
     *
     * Expected behavior:
     * - selected sort option is translated into Prisma orderBy
     */
    it('should apply custom sort option when provided', async () => {
      mockCourseFindFirst.mockResolvedValueOnce({
        id: 'course-1',
        ownerId: 'user-1',
      });

      mockDocumentFindMany.mockResolvedValueOnce([]);

      const service = new DocumentService();

      await service.listByCourse('course-1', 'user-1', {
        sort: 'filename:asc',
      });

      expect(mockDocumentFindMany).toHaveBeenCalledWith({
        where: {
          courseId: 'course-1',
          ownerId: 'user-1',
        },
        orderBy: {
          filename: 'asc',
        },
        select: {
          id: true,
          filename: true,
          fileSize: true,
          fileType: true,
          createdAt: true,
          courseId: true,
        },
      });
    });

    /**
     * Test case: listByCourse with combined filter + search + sorting
     *
     * Expected behavior:
     * - all query options are reflected in the Prisma query
     */
    it('should combine filters, search, and sorting in one query', async () => {
      mockCourseFindFirst.mockResolvedValueOnce({
        id: 'course-1',
        ownerId: 'user-1',
      });

      mockDocumentFindMany.mockResolvedValueOnce([]);

      const service = new DocumentService();

      await service.listByCourse('course-1', 'user-1', {
        sort: 'fileSize:desc',
        fileType: 'application/pdf',
        search: 'intro',
      });

      expect(mockDocumentFindMany).toHaveBeenCalledWith({
        where: {
          courseId: 'course-1',
          ownerId: 'user-1',
          fileType: 'application/pdf',
          filename: {
            contains: 'intro',
            mode: 'insensitive',
          },
        },
        orderBy: {
          fileSize: 'desc',
        },
        select: {
          id: true,
          filename: true,
          fileSize: true,
          fileType: true,
          createdAt: true,
          courseId: true,
        },
      });
    });

    /**
     * Test case: Course not found during listByCourse
     *
     * Expected behavior:
     * - throws "Course not found."
     * - document query is not executed
     */
    it('should throw if course is not found during listByCourse', async () => {
      mockCourseFindFirst.mockResolvedValueOnce(null);

      const service = new DocumentService();

      await expect(service.listByCourse('course-1', 'user-1')).rejects.toThrow('Course not found.');

      expect(mockDocumentFindMany).not.toHaveBeenCalled();
    });
  });

  /**
   * Test cases for getDownloadable()
   *
   * The download flow uses CourseShareService.checkAccess to allow either
   * the course owner or any user the course has been shared with. The
   * service is injected so we can stub the access decision per test.
   */
  describe('getDownloadable', () => {
    function buildService(hasAccess: boolean) {
      const checkAccess = mock(async () => hasAccess);
      const fakeShareService = { checkAccess } as unknown as ConstructorParameters<
        typeof DocumentService
      >[0];
      const service = new DocumentService(fakeShareService);
      return { service, checkAccess };
    }

    it('should return the stream and metadata when the user has access', async () => {
      mockDocumentFindUnique.mockResolvedValueOnce({
        filename: 'Slides.pdf',
        bucket: 'documents',
        objectKey: 'courses/course-1/Slides-123.pdf',
        fileSize: 4096,
        fileType: 'application/pdf',
        courseId: 'course-1',
      });

      const fakeStream = Readable.from([Buffer.from('hello-pdf')]);
      mockStorageDownload.mockResolvedValueOnce(fakeStream);

      const { service, checkAccess } = buildService(true);

      const result = await service.getDownloadable('doc-1', 'user-1');

      expect(mockDocumentFindUnique).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
        select: {
          filename: true,
          bucket: true,
          objectKey: true,
          fileSize: true,
          fileType: true,
          courseId: true,
        },
      });
      expect(checkAccess).toHaveBeenCalledWith('course-1', 'user-1');
      expect(mockStorageDownload).toHaveBeenCalledWith(
        'documents',
        'courses/course-1/Slides-123.pdf'
      );

      expect(result.stream).toBe(fakeStream);
      expect(result.filename).toBe('Slides.pdf');
      expect(result.contentType).toBe('application/pdf');
      expect(result.fileSize).toBe(4096);
    });

    it('should fall back to application/octet-stream when fileType is missing', async () => {
      mockDocumentFindUnique.mockResolvedValueOnce({
        filename: 'mystery.bin',
        bucket: 'documents',
        objectKey: 'courses/course-1/mystery.bin',
        fileSize: null,
        fileType: null,
        courseId: 'course-1',
      });

      mockStorageDownload.mockResolvedValueOnce(Readable.from([]));

      const { service } = buildService(true);
      const result = await service.getDownloadable('doc-1', 'user-1');

      expect(result.contentType).toBe('application/octet-stream');
      expect(result.fileSize).toBeNull();
    });

    it('should throw DOCUMENT_NOT_FOUND if the document does not exist', async () => {
      mockDocumentFindUnique.mockResolvedValueOnce(null);

      const { service, checkAccess } = buildService(true);

      await expect(service.getDownloadable('doc-missing', 'user-1')).rejects.toThrow(
        'DOCUMENT_NOT_FOUND'
      );

      expect(checkAccess).not.toHaveBeenCalled();
      expect(mockStorageDownload).not.toHaveBeenCalled();
    });

    it('should throw DOCUMENT_ACCESS_DENIED if the user has no course access', async () => {
      mockDocumentFindUnique.mockResolvedValueOnce({
        filename: 'Slides.pdf',
        bucket: 'documents',
        objectKey: 'courses/course-1/Slides.pdf',
        fileSize: 100,
        fileType: 'application/pdf',
        courseId: 'course-1',
      });

      const { service, checkAccess } = buildService(false);

      await expect(service.getDownloadable('doc-1', 'user-x')).rejects.toThrow(
        'DOCUMENT_ACCESS_DENIED'
      );

      expect(checkAccess).toHaveBeenCalledWith('course-1', 'user-x');
      expect(mockStorageDownload).not.toHaveBeenCalled();
    });
  });

  /**
   * Test cases for deleteForOwner()
   *
   * Access model: only the parent course's owner can delete a document.
   * Workflow: DB delete first, then storage delete (best-effort).
   */
  describe('deleteForOwner', () => {
    it('should delete the DB record and storage object when the user owns the course', async () => {
      mockDocumentFindUnique.mockResolvedValueOnce({
        bucket: 'documents',
        objectKey: 'courses/course-1/Slides-123.pdf',
        course: { ownerId: 'user-1' },
      });

      const service = new DocumentService();

      await service.deleteForOwner('doc-1', 'user-1');

      expect(mockDocumentFindUnique).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
        select: {
          bucket: true,
          objectKey: true,
          course: {
            select: { ownerId: true },
          },
        },
      });

      expect(mockDocumentDelete).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
      });
      expect(mockStorageDelete).toHaveBeenCalledWith(
        'documents',
        'courses/course-1/Slides-123.pdf'
      );
    });

    it('should throw DOCUMENT_NOT_FOUND when the document does not exist', async () => {
      mockDocumentFindUnique.mockResolvedValueOnce(null);

      const service = new DocumentService();

      await expect(service.deleteForOwner('doc-missing', 'user-1')).rejects.toThrow(
        'DOCUMENT_NOT_FOUND'
      );

      expect(mockDocumentDelete).not.toHaveBeenCalled();
      expect(mockStorageDelete).not.toHaveBeenCalled();
    });

    it('should throw DOCUMENT_FORBIDDEN when the user is not the course owner', async () => {
      mockDocumentFindUnique.mockResolvedValueOnce({
        bucket: 'documents',
        objectKey: 'courses/course-1/Slides.pdf',
        course: { ownerId: 'someone-else' },
      });

      const service = new DocumentService();

      await expect(service.deleteForOwner('doc-1', 'user-1')).rejects.toThrow('DOCUMENT_FORBIDDEN');

      expect(mockDocumentDelete).not.toHaveBeenCalled();
      expect(mockStorageDelete).not.toHaveBeenCalled();
    });

    it('should not fail the request when the storage delete fails', async () => {
      mockDocumentFindUnique.mockResolvedValueOnce({
        bucket: 'documents',
        objectKey: 'courses/course-1/Slides.pdf',
        course: { ownerId: 'user-1' },
      });
      mockStorageDelete.mockRejectedValueOnce(new Error('S3 outage'));

      const service = new DocumentService();

      // Should resolve without throwing — the user-visible state is already correct
      await service.deleteForOwner('doc-1', 'user-1');

      expect(mockDocumentDelete).toHaveBeenCalledWith({ where: { id: 'doc-1' } });
      expect(mockStorageDelete).toHaveBeenCalledTimes(1);
    });
  });
});
