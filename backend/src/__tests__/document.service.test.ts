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
  courseId: string;
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
const mockStorageDownloadBuffer = mock(async (): Promise<Buffer> => Buffer.from(''));
const mockStorageDelete = mock(async (): Promise<void> => undefined);
const mockParseOffice = mock(
  async (): Promise<unknown> => ({
    warnings: [],
    to: mock(async () => ({
      value: [
        {
          text: 'Parsed office text',
          metadata: { sourceType: 'docx', closestHeading: 'Intro' },
          startIndex: 0,
          endIndex: 18,
        },
      ],
      messages: [],
    })),
  })
);
const mockTranscribePdf = mock(async (): Promise<string> => 'Gemini transcribed PDF text');
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
    downloadBuffer: mockStorageDownloadBuffer,
    delete: mockStorageDelete,
  },
}));

mock.module('officeparser', () => ({
  OfficeParser: {
    parseOffice: mockParseOffice,
  },
}));

mock.module('../lib/pdf-vision', () => ({
  transcribePdf: mockTranscribePdf,
}));

// Import service after mocks are defined
const { DocumentService } = await import('../services/document.service');

function buildServiceWithAccess(hasAccess: boolean) {
  const checkAccess = mock(async () => hasAccess);
  const fakeShareService = { checkAccess } as unknown as ConstructorParameters<
    typeof DocumentService
  >[0];
  const service = new DocumentService(fakeShareService);
  return { service, checkAccess };
}

function buildOfficeAst(
  chunks: Array<{
    text: string;
    metadata: Record<string, unknown>;
    startIndex?: number;
    endIndex?: number;
  }>,
  warnings: Array<{ code: string; message: string }> = [],
  messages: Array<{ code: string; message: string }> = []
) {
  return {
    warnings,
    to: mock(async () => ({
      value: chunks,
      messages,
    })),
  };
}

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
    mockStorageDownloadBuffer.mockClear();
    mockStorageDelete.mockClear();
    mockParseOffice.mockClear();
    mockTranscribePdf.mockClear();
  });

  /**
   * Test cases for upload()
   */
  describe('upload', () => {
    /**
     * Test case: Successful upload
     *
     * Scenario:
     * - user has owner or shared access to the course
     * - file is uploaded to MinIO
     * - document metadata is stored in Prisma
     *
     * Expected behavior:
     * - course access is checked
     * - bucket is ensured
     * - upload is called with generated object key
     * - metadata is persisted
     */
    it('should upload file to storage and persist metadata', async () => {
      const { service, checkAccess } = buildServiceWithAccess(true);

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

      expect(checkAccess).toHaveBeenCalledWith('course-1', 'user-1');

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
      const { service } = buildServiceWithAccess(true);

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
      const { service, checkAccess } = buildServiceWithAccess(false);

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

      expect(checkAccess).toHaveBeenCalledWith('course-1', 'user-1');
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
     * - documents are queried for the correct course
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
      mockDocumentFindMany.mockResolvedValueOnce(documents);

      const { service, checkAccess } = buildServiceWithAccess(true);
      const result = await service.listByCourse('course-1', 'user-1');

      expect(checkAccess).toHaveBeenCalledWith('course-1', 'user-1');

      expect(mockDocumentFindMany).toHaveBeenCalledWith({
        where: {
          courseId: 'course-1',
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
      mockDocumentFindMany.mockResolvedValueOnce([]);

      const { service } = buildServiceWithAccess(true);

      await service.listByCourse('course-1', 'user-1', {
        fileType: 'application/pdf',
      });

      expect(mockDocumentFindMany).toHaveBeenCalledWith({
        where: {
          courseId: 'course-1',
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
      mockDocumentFindMany.mockResolvedValueOnce([]);

      const { service } = buildServiceWithAccess(true);

      await service.listByCourse('course-1', 'user-1', {
        search: 'agile',
      });

      expect(mockDocumentFindMany).toHaveBeenCalledWith({
        where: {
          courseId: 'course-1',
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
      mockDocumentFindMany.mockResolvedValueOnce([]);

      const { service } = buildServiceWithAccess(true);

      await service.listByCourse('course-1', 'user-1', {
        sort: 'filename:asc',
      });

      expect(mockDocumentFindMany).toHaveBeenCalledWith({
        where: {
          courseId: 'course-1',
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
      mockDocumentFindMany.mockResolvedValueOnce([]);

      const { service } = buildServiceWithAccess(true);

      await service.listByCourse('course-1', 'user-1', {
        sort: 'fileSize:desc',
        fileType: 'application/pdf',
        search: 'intro',
      });

      expect(mockDocumentFindMany).toHaveBeenCalledWith({
        where: {
          courseId: 'course-1',
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
      const { service, checkAccess } = buildServiceWithAccess(false);

      await expect(service.listByCourse('course-1', 'user-1')).rejects.toThrow('Course not found.');

      expect(checkAccess).toHaveBeenCalledWith('course-1', 'user-1');
      expect(mockDocumentFindMany).not.toHaveBeenCalled();
    });
  });

  describe('readCourseDocuments', () => {
    const readSelect = {
      id: true,
      filename: true,
      bucket: true,
      objectKey: true,
      fileSize: true,
      fileType: true,
      createdAt: true,
      courseId: true,
    };

    it('should read text documents when the user has owner or shared course access', async () => {
      const createdAt = new Date('2026-04-20T10:00:00.000Z');
      mockDocumentFindMany.mockResolvedValueOnce([
        {
          id: 'doc-1',
          filename: 'notes.txt',
          bucket: 'documents',
          objectKey: 'courses/course-1/notes.txt',
          fileSize: 42,
          fileType: 'text/plain',
          createdAt,
          courseId: 'course-1',
        },
      ]);
      mockStorageDownloadBuffer.mockResolvedValueOnce(
        Buffer.from('Intro\n\nPhotosynthesis turns light into chemical energy.')
      );

      const { service, checkAccess } = buildServiceWithAccess(true);

      const result = await service.readCourseDocuments('course-1', 'shared-user');

      expect(checkAccess).toHaveBeenCalledWith('course-1', 'shared-user');
      expect(mockDocumentFindMany).toHaveBeenCalledWith({
        where: { courseId: 'course-1' },
        orderBy: { createdAt: 'desc' },
        select: readSelect,
      });
      expect(mockStorageDownloadBuffer).toHaveBeenCalledWith(
        'documents',
        'courses/course-1/notes.txt'
      );
      expect(result.documents).toEqual([
        {
          id: 'doc-1',
          filename: 'notes.txt',
          fileSize: 42,
          fileType: 'text/plain',
          createdAt,
          courseId: 'course-1',
          readableType: 'text',
        },
      ]);
      expect(result.chunks[0].text).toContain('Photosynthesis');
      expect(result.errors).toEqual([]);
      expect(result.skipped).toEqual([]);
      expect(result.truncated).toBe(false);
    });

    for (const testCase of [
      {
        filename: 'summary.docx',
        fileType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        expectedFileType: 'docx',
        metadata: { sourceType: 'docx', closestHeading: 'Chapter 1' },
      },
      {
        filename: 'slides.pptx',
        fileType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        expectedFileType: 'pptx',
        metadata: { sourceType: 'pptx', slideNumber: 3 },
      },
    ]) {
      it(`should parse ${testCase.expectedFileType} documents with officeparser`, async () => {
        mockDocumentFindMany.mockResolvedValueOnce([
          {
            id: 'doc-office',
            filename: testCase.filename,
            bucket: 'documents',
            objectKey: `courses/course-1/${testCase.filename}`,
            fileSize: 1024,
            fileType: testCase.fileType,
            createdAt: new Date('2026-04-20T10:00:00.000Z'),
            courseId: 'course-1',
          },
        ]);
        mockStorageDownloadBuffer.mockResolvedValueOnce(Buffer.from('office-bytes'));
        mockParseOffice.mockResolvedValueOnce(
          buildOfficeAst(
            [
              {
                text: `${testCase.expectedFileType} extracted text`,
                metadata: testCase.metadata,
                startIndex: 5,
                endIndex: 30,
              },
            ],
            [{ code: 'PARSER_WARNING', message: 'Non-fatal parser warning' }]
          )
        );

        const { service } = buildServiceWithAccess(true);
        const result = await service.readCourseDocuments('course-1', 'user-1');

        expect(mockParseOffice).toHaveBeenCalledWith(
          Buffer.from('office-bytes'),
          expect.objectContaining({
            fileType: testCase.expectedFileType,
            ocr: false,
          })
        );
        expect(result.chunks).toEqual([
          expect.objectContaining({
            documentId: 'doc-office',
            filename: testCase.filename,
            text: `${testCase.expectedFileType} extracted text`,
            metadata: expect.objectContaining({
              sourceType: testCase.expectedFileType,
              startIndex: 5,
              endIndex: 30,
            }),
          }),
        ]);
        expect(result.warnings[0]).toContain('Non-fatal parser warning');
      });
    }

    it('should read PDF documents with Gemini vision instead of officeparser', async () => {
      mockDocumentFindMany.mockResolvedValueOnce([
        {
          id: 'doc-pdf',
          filename: 'lecture.pdf',
          bucket: 'documents',
          objectKey: 'courses/course-1/lecture.pdf',
          fileSize: 2048,
          fileType: 'application/pdf',
          createdAt: new Date('2026-04-20T10:00:00.000Z'),
          courseId: 'course-1',
        },
      ]);
      mockStorageDownloadBuffer.mockResolvedValueOnce(Buffer.from('pdf-bytes'));
      mockTranscribePdf.mockResolvedValueOnce('Chapter 1\n\nMitochondria are the powerhouse.');

      const { service } = buildServiceWithAccess(true);
      const result = await service.readCourseDocuments('course-1', 'user-1');

      expect(mockTranscribePdf).toHaveBeenCalledWith(Buffer.from('pdf-bytes'), 'lecture.pdf');
      expect(mockParseOffice).not.toHaveBeenCalled();
      expect(result.chunks[0]).toEqual(
        expect.objectContaining({
          documentId: 'doc-pdf',
          filename: 'lecture.pdf',
          text: expect.stringContaining('Mitochondria'),
          metadata: expect.objectContaining({ sourceType: 'pdf' }),
        })
      );
      expect(result.errors).toEqual([]);
    });

    it('should record an error and continue when PDF transcription fails', async () => {
      mockDocumentFindMany.mockResolvedValueOnce([
        {
          id: 'doc-pdf',
          filename: 'huge.pdf',
          bucket: 'documents',
          objectKey: 'courses/course-1/huge.pdf',
          fileSize: 99,
          fileType: 'application/pdf',
          createdAt: new Date('2026-04-20T10:00:00.000Z'),
          courseId: 'course-1',
        },
      ]);
      mockStorageDownloadBuffer.mockResolvedValueOnce(Buffer.from('pdf-bytes'));
      mockTranscribePdf.mockRejectedValueOnce(new Error('too large for vision reading'));

      const { service } = buildServiceWithAccess(true);
      const result = await service.readCourseDocuments('course-1', 'user-1');

      expect(result.chunks).toEqual([]);
      expect(result.errors).toEqual([
        expect.objectContaining({
          documentId: 'doc-pdf',
          filename: 'huge.pdf',
          message: expect.stringContaining('too large'),
        }),
      ]);
    });

    it('should throw if the user does not have access to the course', async () => {
      const { service, checkAccess } = buildServiceWithAccess(false);

      await expect(service.readCourseDocuments('course-1', 'user-x')).rejects.toThrow(
        'Course not found.'
      );

      expect(checkAccess).toHaveBeenCalledWith('course-1', 'user-x');
      expect(mockDocumentFindMany).not.toHaveBeenCalled();
      expect(mockStorageDownloadBuffer).not.toHaveBeenCalled();
    });

    it('should filter by document ids when provided', async () => {
      mockDocumentFindMany.mockResolvedValueOnce([]);

      const { service } = buildServiceWithAccess(true);

      await service.readCourseDocuments('course-1', 'user-1', {
        documentIds: ['doc-2', 'doc-2', 'doc-3'],
      });

      expect(mockDocumentFindMany).toHaveBeenCalledWith({
        where: {
          courseId: 'course-1',
          id: { in: ['doc-2', 'doc-3'] },
        },
        orderBy: { createdAt: 'desc' },
        select: readSelect,
      });
    });

    it('should skip legacy doc and ppt files with explicit reasons', async () => {
      mockDocumentFindMany.mockResolvedValueOnce([
        {
          id: 'doc-legacy-word',
          filename: 'old-notes.doc',
          bucket: 'documents',
          objectKey: 'courses/course-1/old-notes.doc',
          fileSize: 100,
          fileType: 'application/msword',
          createdAt: new Date('2026-04-20T10:00:00.000Z'),
          courseId: 'course-1',
        },
        {
          id: 'doc-legacy-slides',
          filename: 'old-slides.ppt',
          bucket: 'documents',
          objectKey: 'courses/course-1/old-slides.ppt',
          fileSize: 100,
          fileType: 'application/vnd.ms-powerpoint',
          createdAt: new Date('2026-04-20T10:00:00.000Z'),
          courseId: 'course-1',
        },
      ]);

      const { service } = buildServiceWithAccess(true);
      const result = await service.readCourseDocuments('course-1', 'user-1');

      expect(result.skipped).toEqual([
        expect.objectContaining({
          documentId: 'doc-legacy-word',
          reason: expect.stringContaining('.doc'),
        }),
        expect.objectContaining({
          documentId: 'doc-legacy-slides',
          reason: expect.stringContaining('.ppt'),
        }),
      ]);
      expect(mockStorageDownloadBuffer).not.toHaveBeenCalled();
      expect(result.chunks).toEqual([]);
    });

    it('should rank chunks by query relevance deterministically', async () => {
      mockDocumentFindMany.mockResolvedValueOnce([
        {
          id: 'doc-general',
          filename: 'general.txt',
          bucket: 'documents',
          objectKey: 'courses/course-1/general.txt',
          fileSize: 100,
          fileType: 'text/plain',
          createdAt: new Date('2026-04-21T10:00:00.000Z'),
          courseId: 'course-1',
        },
        {
          id: 'doc-match',
          filename: 'match.txt',
          bucket: 'documents',
          objectKey: 'courses/course-1/match.txt',
          fileSize: 100,
          fileType: 'text/plain',
          createdAt: new Date('2026-04-20T10:00:00.000Z'),
          courseId: 'course-1',
        },
      ]);
      mockStorageDownloadBuffer
        .mockResolvedValueOnce(Buffer.from('general course notes'))
        .mockResolvedValueOnce(Buffer.from('mitosis and more mitosis details'));

      const { service } = buildServiceWithAccess(true);
      const result = await service.readCourseDocuments('course-1', 'user-1', {
        query: 'mitosis',
      });

      expect(result.chunks[0].documentId).toBe('doc-match');
      expect(result.chunks[0].score).toBe(2);
      expect(result.chunks[1].documentId).toBe('doc-general');
      expect(result.chunks[1].score).toBe(0);
    });

    it('should cap returned text and mark truncated chunks', async () => {
      mockDocumentFindMany.mockResolvedValueOnce([
        {
          id: 'doc-long',
          filename: 'long.txt',
          bucket: 'documents',
          objectKey: 'courses/course-1/long.txt',
          fileSize: 100,
          fileType: 'text/plain',
          createdAt: new Date('2026-04-20T10:00:00.000Z'),
          courseId: 'course-1',
        },
      ]);
      mockStorageDownloadBuffer.mockResolvedValueOnce(Buffer.from('abcdefghijklmnopqrstuvwxyz'));

      const { service } = buildServiceWithAccess(true);
      const result = await service.readCourseDocuments('course-1', 'user-1', {
        maxCharacters: 10,
      });

      expect(result.chunks).toHaveLength(1);
      expect(result.chunks[0].text).toBe('abcdefghij');
      expect(result.chunks[0].truncated).toBe(true);
      expect(result.returnedCharacters).toBe(10);
      expect(result.maxCharacters).toBe(10);
      expect(result.truncated).toBe(true);
    });
  });

  /**
   * Test cases for listByOwner()
   */
  describe('listByOwner', () => {
    /**
     * Test case: Default document listing
     *
     * Scenario:
     * - authenticated owner requests resources
     * - no custom sorting or limit provided
     *
     * Expected behavior:
     * - documents are returned
     * - default sorting is createdAt desc
     * - course metadata is included
     */
    it('should return documents sorted by newest first by default', async () => {
      const documents = [
        {
          id: 'doc-1',
          filename: 'Agile.pdf',
          fileSize: 1234,
          fileType: 'application/pdf',
          createdAt: new Date('2026-04-20T10:00:00.000Z'),
          courseId: 'course-1',
          course: {
            id: 'course-1',
            name: 'PM4',
            color: '#ff6600',
          },
        },
      ];

      mockDocumentFindMany.mockResolvedValueOnce(documents);

      const service = new DocumentService();

      const result = await service.listByOwner('user-1');

      expect(mockDocumentFindMany).toHaveBeenCalled();

      expect(result).toEqual(documents);
    });

    /**
     * Test case: Explicit limit
     *
     * Scenario:
     * - frontend requests a specific amount of documents
     *
     * Expected behavior:
     * - Prisma query receives the provided limit
     */
    it('should apply provided limit', async () => {
      mockDocumentFindMany.mockResolvedValueOnce([]);

      const service = new DocumentService();

      await service.listByOwner('user-1', {
        limit: 10,
      });

      expect(mockDocumentFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
        })
      );
    });

    /**
     * Test case: Maximum limit protection
     *
     * Scenario:
     * - frontend requests more than the allowed maximum
     *
     * Expected behavior:
     * - limit is capped at 50
     */
    it('should clamp limit to 50', async () => {
      mockDocumentFindMany.mockResolvedValueOnce([]);

      const service = new DocumentService();

      await service.listByOwner('user-1', {
        limit: 999,
      });

      expect(mockDocumentFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        })
      );
    });

    /**
     * Test case: Filename sorting
     *
     * Expected behavior:
     * - filename sort option is translated into Prisma orderBy
     */
    it('should sort by filename ascending', async () => {
      mockDocumentFindMany.mockResolvedValueOnce([]);

      const service = new DocumentService();

      await service.listByOwner('user-1', {
        sort: 'filename:asc',
      });

      expect(mockDocumentFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            filename: 'asc',
          },
        })
      );
    });

    /**
     * Test case: File size sorting
     *
     * Expected behavior:
     * - fileSize sort option is translated into Prisma orderBy
     */
    it('should sort by fileSize descending', async () => {
      mockDocumentFindMany.mockResolvedValueOnce([]);

      const service = new DocumentService();

      await service.listByOwner('user-1', {
        sort: 'fileSize:desc',
      });

      expect(mockDocumentFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            fileSize: 'desc',
          },
        })
      );
    });

    /**
     * Test case: Invalid sort option
     *
     * Scenario:
     * - unsupported sort value is provided
     *
     * Expected behavior:
     * - service falls back to default sorting
     */
    it('should fall back to createdAt desc for invalid sort values', async () => {
      mockDocumentFindMany.mockResolvedValueOnce([]);

      const service = new DocumentService();

      await service.listByOwner('user-1', {
        sort: 'totallyInvalidSort',
      });

      expect(mockDocumentFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: {
            createdAt: 'desc',
          },
        })
      );
    });

    /**
     * Test case: Returned documents contain course metadata
     *
     * Expected behavior:
     * - course relation is included in the select clause
     */
    it('should include course metadata for each document', async () => {
      mockDocumentFindMany.mockResolvedValueOnce([]);

      const service = new DocumentService();

      await service.listByOwner('user-1');

      expect(mockDocumentFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            course: {
              select: {
                id: true,
                name: true,
                color: true,
              },
            },
          }),
        })
      );
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
   * Access model: any user with course access can delete a document.
   * Workflow: DB delete first, then storage delete (best-effort).
   */
  describe('deleteForOwner', () => {
    it('should delete the DB record and storage object when the user has course access', async () => {
      mockDocumentFindUnique.mockResolvedValueOnce({
        bucket: 'documents',
        objectKey: 'courses/course-1/Slides-123.pdf',
        courseId: 'course-1',
      });

      const { service, checkAccess } = buildServiceWithAccess(true);

      await service.deleteForOwner('doc-1', 'user-1');

      expect(mockDocumentFindUnique).toHaveBeenCalledWith({
        where: { id: 'doc-1' },
        select: {
          bucket: true,
          objectKey: true,
          courseId: true,
        },
      });
      expect(checkAccess).toHaveBeenCalledWith('course-1', 'user-1');

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

    it('should throw DOCUMENT_FORBIDDEN when the user has no course access', async () => {
      mockDocumentFindUnique.mockResolvedValueOnce({
        bucket: 'documents',
        objectKey: 'courses/course-1/Slides.pdf',
        courseId: 'course-1',
      });

      const { service, checkAccess } = buildServiceWithAccess(false);

      await expect(service.deleteForOwner('doc-1', 'user-1')).rejects.toThrow('DOCUMENT_FORBIDDEN');

      expect(checkAccess).toHaveBeenCalledWith('course-1', 'user-1');
      expect(mockDocumentDelete).not.toHaveBeenCalled();
      expect(mockStorageDelete).not.toHaveBeenCalled();
    });

    it('should not fail the request when the storage delete fails', async () => {
      mockDocumentFindUnique.mockResolvedValueOnce({
        bucket: 'documents',
        objectKey: 'courses/course-1/Slides.pdf',
        courseId: 'course-1',
      });
      mockStorageDelete.mockRejectedValueOnce(new Error('S3 outage'));

      const { service } = buildServiceWithAccess(true);

      // Should resolve without throwing — the user-visible state is already correct
      await service.deleteForOwner('doc-1', 'user-1');

      expect(mockDocumentDelete).toHaveBeenCalledWith({ where: { id: 'doc-1' } });
      expect(mockStorageDelete).toHaveBeenCalledTimes(1);
    });
  });
});
