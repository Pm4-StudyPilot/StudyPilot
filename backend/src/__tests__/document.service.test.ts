import { describe, it, expect, beforeEach, mock } from 'bun:test';

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

const mockEnsureBucket = mock(async (): Promise<void> => undefined);
const mockStorageUpload = mock(async (): Promise<void> => undefined);
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
    mockEnsureBucket.mockClear();
    mockStorageUpload.mockClear();
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
        sortBy: 'nameAsc',
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
        sortBy: 'sizeDesc',
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
});
