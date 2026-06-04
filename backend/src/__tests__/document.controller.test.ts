import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { Readable, PassThrough } from 'node:stream';
import type { Request, Response } from 'express';

import { DocumentController } from '../controllers/document.controller';
import type { DocumentService } from '../services/document.service';

/**
 * Creates a mock Express response object.
 *
 * The status() method returns the response object itself
 * so chained calls like res.status(201).json(...) can be tested.
 */
function createMockResponse() {
  const res: Partial<Response> = {};

  res.status = mock(() => res as Response);
  res.json = mock(() => res as Response);

  return res as Response & {
    status: ReturnType<typeof mock>;
    json: ReturnType<typeof mock>;
  };
}

/**
 * Creates a DocumentController instance with a mocked DocumentService.
 *
 * The controller currently instantiates its service internally,
 * so we replace the private field after construction for testing.
 *
 * @param mockDocumentService Mocked service implementation
 * @returns Controller instance using the mocked service
 */
function createController(mockDocumentService: Partial<DocumentService>) {
  const controller = new DocumentController();
  (controller as unknown as { documentService: Partial<DocumentService> }).documentService =
    mockDocumentService;
  return controller;
}

/**
 * Creates a mock Express response that is pipe-compatible.
 *
 * The download handler pipes a stream into the response, so we need an
 * actual Writable target. We use a PassThrough and capture the bytes it
 * receives, while still mocking setHeader/status/json so they can be
 * asserted.
 */
function createPipeableResponse() {
  const sink = new PassThrough();
  const chunks: Buffer[] = [];
  sink.on('data', (chunk: Buffer) => chunks.push(chunk));

  const setHeader = mock(() => undefined);
  const status = mock(() => res as unknown as Response);
  const json = mock(() => res as unknown as Response);
  const destroy = mock(() => undefined);

  const res = Object.assign(sink, {
    setHeader,
    status,
    json,
    destroy,
    headersSent: false,
  }) as unknown as Response & {
    setHeader: typeof setHeader;
    status: typeof status;
    json: typeof json;
    destroy: typeof destroy;
    headersSent: boolean;
  };

  return { res, chunks };
}

/**
 * Creates a mocked DocumentService for controller tests.
 */
function createMockDocumentService(overrides: Partial<DocumentService> = {}) {
  return {
    upload: mock(),
    listByCourse: mock(),
    listByOwner: mock(),
    getDownloadable: mock(),
    deleteForOwner: mock(),
    ...overrides,
  } as unknown as DocumentService;
}

/**
 * Test cases for DocumentController.upload
 */
describe('DocumentController.upload', () => {
  /**
   * Test case: Successful upload
   *
   * Scenario:
   * - file is present
   * - courseId is provided
   * - user is authenticated
   *
   * Expected behavior:
   * - DocumentService.upload() is called with file, courseId, and ownerId
   * - Status code: 201
   * - Response contains created document metadata
   */
  it('should return 201 and created document on successful upload', async () => {
    const uploadedDocument = {
      id: 'doc-1',
      filename: 'Slides.pdf',
      bucket: 'documents',
      objectKey: 'courses/course-1/slides.pdf',
      fileSize: 1024,
      fileType: 'application/pdf',
      courseId: 'course-1',
      ownerId: 'user-1',
    };

    const mockDocumentService = {
      upload: mock(async () => uploadedDocument),
      listByCourse: mock(),
    };

    const controller = createController(mockDocumentService as unknown as DocumentService);

    const file = {
      originalname: 'Slides.pdf',
      mimetype: 'application/pdf',
      size: 1024,
      buffer: Buffer.from('test'),
    } as Express.Multer.File;

    const req = {
      file,
      body: { courseId: 'course-1' },
      user: { id: 'user-1' },
    } as unknown as Request;

    const res = createMockResponse();

    await controller.upload(req, res);

    expect(mockDocumentService.upload).toHaveBeenCalledWith({
      file,
      courseId: 'course-1',
      ownerId: 'user-1',
    });
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(uploadedDocument);
  });

  /**
   * Test case: Missing file
   *
   * Expected behavior:
   * - Request is rejected before service call
   * - Status code: 400
   */
  it('should return 400 if file is missing', async () => {
    const mockDocumentService = {
      upload: mock(),
      listByCourse: mock(),
    };

    const controller = createController(mockDocumentService as unknown as DocumentService);

    const req = {
      body: { courseId: 'course-1' },
      user: { id: 'user-1' },
    } as unknown as Request;

    const res = createMockResponse();

    await controller.upload(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'File is required.' });
    expect(mockDocumentService.upload).not.toHaveBeenCalled();
  });

  /**
   * Test case: Missing courseId
   *
   * Expected behavior:
   * - Request is rejected before service call
   * - Status code: 400
   */
  it('should return 400 if courseId is missing', async () => {
    const mockDocumentService = {
      upload: mock(),
      listByCourse: mock(),
    };

    const controller = createController(mockDocumentService as unknown as DocumentService);

    const file = {
      originalname: 'Slides.pdf',
      mimetype: 'application/pdf',
      size: 1024,
      buffer: Buffer.from('test'),
    } as Express.Multer.File;

    const req = {
      file,
      body: {},
      user: { id: 'user-1' },
    } as unknown as Request;

    const res = createMockResponse();

    await controller.upload(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'courseId is required.' });
    expect(mockDocumentService.upload).not.toHaveBeenCalled();
  });

  /**
   * Test case: Unauthorized upload request
   *
   * Expected behavior:
   * - Request is rejected before service call
   * - Status code: 401
   */
  it('should return 401 if user is not authenticated', async () => {
    const mockDocumentService = {
      upload: mock(),
      listByCourse: mock(),
    };

    const controller = createController(mockDocumentService as unknown as DocumentService);

    const file = {
      originalname: 'Slides.pdf',
      mimetype: 'application/pdf',
      size: 1024,
      buffer: Buffer.from('test'),
    } as Express.Multer.File;

    const req = {
      file,
      body: { courseId: 'course-1' },
    } as unknown as Request;

    const res = createMockResponse();

    await controller.upload(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized.' });
    expect(mockDocumentService.upload).not.toHaveBeenCalled();
  });

  /**
   * Test case: Course not found during upload
   *
   * Expected behavior:
   * - Status code: 404
   * - Response contains specific course error
   */
  it('should return 404 if course is not found during upload', async () => {
    const mockDocumentService = {
      upload: mock(async () => {
        throw new Error('Course not found.');
      }),
      listByCourse: mock(),
    };

    const controller = createController(mockDocumentService as unknown as DocumentService);

    const file = {
      originalname: 'Slides.pdf',
      mimetype: 'application/pdf',
      size: 1024,
      buffer: Buffer.from('test'),
    } as Express.Multer.File;

    const req = {
      file,
      body: { courseId: 'course-1' },
      user: { id: 'user-1' },
    } as unknown as Request;

    const res = createMockResponse();

    await controller.upload(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Course not found.' });
  });

  /**
   * Test case: Unexpected upload error
   *
   * Expected behavior:
   * - Status code: 500
   * - Generic error message is returned
   */
  it('should return 500 for unexpected upload errors', async () => {
    const mockDocumentService = {
      upload: mock(async () => {
        throw new Error('Unexpected failure');
      }),
      listByCourse: mock(),
    };

    const controller = createController(mockDocumentService as unknown as DocumentService);

    const file = {
      originalname: 'Slides.pdf',
      mimetype: 'application/pdf',
      size: 1024,
      buffer: Buffer.from('test'),
    } as Express.Multer.File;

    const req = {
      file,
      body: { courseId: 'course-1' },
      user: { id: 'user-1' },
    } as unknown as Request;

    const res = createMockResponse();

    await controller.upload(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Failed to upload document.' });
  });
});

/**
 * Test cases for DocumentController.listByCourse
 */
describe('DocumentController.listByCourse', () => {
  /**
   * Test case: Successful document listing with sort/filter/search options
   *
   * Scenario:
   * - courseId is present
   * - user is authenticated
   * - query params contain sort, fileType, and search
   *
   * Expected behavior:
   * - DocumentService.listByCourse() is called with normalized options
   * - Status code: 200
   * - Response contains returned document list
   */
  it('should return 200 and documents on successful listByCourse request', async () => {
    const documents = [
      {
        id: 'doc-1',
        filename: 'Agile.pdf',
        fileType: 'application/pdf',
        fileSize: 1234,
        createdAt: '2026-04-20T10:00:00.000Z',
        courseId: 'course-1',
      },
    ];

    const mockDocumentService = {
      upload: mock(),
      listByCourse: mock(async () => documents),
    };

    const controller = createController(mockDocumentService as unknown as DocumentService);

    const req = {
      params: { courseId: 'course-1' },
      query: {
        sort: 'filename:asc',
        fileType: 'application/pdf',
        search: 'agile',
      },
      user: { id: 'user-1' },
    } as unknown as Request;

    const res = createMockResponse();

    await controller.listByCourse(req, res);

    expect(mockDocumentService.listByCourse).toHaveBeenCalledWith('course-1', 'user-1', {
      sort: 'filename:asc',
      fileType: 'application/pdf',
      search: 'agile',
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(documents);
  });

  /**
   * Test case: Missing courseId
   *
   * Expected behavior:
   * - Request is rejected before service call
   * - Status code: 400
   */
  it('should return 400 if courseId is missing in listByCourse', async () => {
    const mockDocumentService = {
      upload: mock(),
      listByCourse: mock(),
    };

    const controller = createController(mockDocumentService as unknown as DocumentService);

    const req = {
      params: {},
      query: {},
      user: { id: 'user-1' },
    } as unknown as Request;

    const res = createMockResponse();

    await controller.listByCourse(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'courseId is required.' });
    expect(mockDocumentService.listByCourse).not.toHaveBeenCalled();
  });

  /**
   * Test case: Unauthorized listByCourse request
   *
   * Expected behavior:
   * - Request is rejected before service call
   * - Status code: 401
   */
  it('should return 401 if user is not authenticated in listByCourse', async () => {
    const mockDocumentService = {
      upload: mock(),
      listByCourse: mock(),
    };

    const controller = createController(mockDocumentService as unknown as DocumentService);

    const req = {
      params: { courseId: 'course-1' },
      query: {},
    } as unknown as Request;

    const res = createMockResponse();

    await controller.listByCourse(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized.' });
    expect(mockDocumentService.listByCourse).not.toHaveBeenCalled();
  });

  /**
   * Test case: Course not found during listByCourse
   *
   * Expected behavior:
   * - Status code: 404
   * - Response contains specific course error
   */
  it('should return 404 if course is not found in listByCourse', async () => {
    const mockDocumentService = {
      upload: mock(),
      listByCourse: mock(async () => {
        throw new Error('Course not found.');
      }),
    };

    const controller = createController(mockDocumentService as unknown as DocumentService);

    const req = {
      params: { courseId: 'course-1' },
      query: {},
      user: { id: 'user-1' },
    } as unknown as Request;

    const res = createMockResponse();

    await controller.listByCourse(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Course not found.' });
  });

  /**
   * Test case: Unexpected listByCourse error
   *
   * Expected behavior:
   * - Status code: 500
   * - Generic error message is returned
   */
  it('should return 500 for unexpected listByCourse errors', async () => {
    const mockDocumentService = {
      upload: mock(),
      listByCourse: mock(async () => {
        throw new Error('Unexpected failure');
      }),
    };

    const controller = createController(mockDocumentService as unknown as DocumentService);

    const req = {
      params: { courseId: 'course-1' },
      query: {},
      user: { id: 'user-1' },
    } as unknown as Request;

    const res = createMockResponse();

    await controller.listByCourse(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Failed to fetch course documents.' });
  });

  /**
   * Test case: Non-string query params are ignored
   *
   * Scenario:
   * Express query parameters may be arrays or ParsedQs objects.
   *
   * Expected behavior:
   * - Only single string values are forwarded
   * - Non-string values become undefined
   */
  it('should ignore non-string query params and pass undefined instead', async () => {
    const documents: unknown[] = [];

    const mockDocumentService = {
      upload: mock(),
      listByCourse: mock(async () => documents),
    };

    const controller = createController(mockDocumentService as unknown as DocumentService);

    const req = {
      params: { courseId: 'course-1' },
      query: {
        sort: ['filename:asc'],
        fileType: { nested: 'application/pdf' },
        search: ['agile'],
      },
      user: { id: 'user-1' },
    } as unknown as Request;

    const res = createMockResponse();

    await controller.listByCourse(req, res);

    expect(mockDocumentService.listByCourse).toHaveBeenCalledWith('course-1', 'user-1', {
      sort: undefined,
      fileType: undefined,
      search: undefined,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(documents);
  });
});

/**
 * Test cases for listByOwner()
 */
describe('listByOwner', () => {
  let listByOwnerMock: ReturnType<typeof mock>;
  let mockDocumentService: DocumentService;
  let controller: DocumentController;

  beforeEach(() => {
    listByOwnerMock = mock(async () => []);

    mockDocumentService = createMockDocumentService({
      listByOwner: listByOwnerMock,
    });

    controller = createController(mockDocumentService);
  });

  /**
   * Test case: Successful listByOwner request
   *
   * Scenario:
   * - authenticated user requests their uploaded documents
   * - sort and limit query params are provided
   *
   * Expected behavior:
   * - controller forwards user id, sort, and limit to the service
   * - response status is 200
   * - documents are returned as JSON
   */
  it('should return 200 and documents on successful listByOwner request', async () => {
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

    listByOwnerMock.mockResolvedValueOnce(documents);

    const req = {
      user: { id: 'user-1' },
      query: {
        sort: 'createdAt:desc',
        limit: '3',
      },
    } as unknown as Request;

    const res = createMockResponse();

    await controller.listByOwner(req, res);

    expect(listByOwnerMock).toHaveBeenCalledWith('user-1', {
      sort: 'createdAt:desc',
      limit: 3,
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(documents);
  });

  /**
   * Test case: Default limit
   *
   * Scenario:
   * - no limit query parameter is provided
   *
   * Expected behavior:
   * - controller uses default limit 50
   */
  it('should default limit to 50 when no limit query param is provided', async () => {
    listByOwnerMock.mockResolvedValueOnce([]);

    const req = {
      user: { id: 'user-1' },
      query: {},
    } as unknown as Request;

    const res = createMockResponse();

    await controller.listByOwner(req, res);

    expect(listByOwnerMock).toHaveBeenCalledWith('user-1', {
      sort: undefined,
      fileType: undefined,
      search: undefined,
      limit: 50,
    });

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  /**
   * Test case: Missing authentication
   *
   * Expected behavior:
   * - returns 401
   * - service is not called
   */
  it('should return 401 if user is not authenticated in listByOwner', async () => {
    const req = {
      user: undefined,
      query: {},
    } as unknown as Request;

    const res = createMockResponse();

    await controller.listByOwner(req, res);

    expect(mockDocumentService.listByOwner).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized.' });
  });

  /**
   * Test case: Unexpected service error
   *
   * Expected behavior:
   * - returns 500
   */
  it('should return 500 for unexpected listByOwner errors', async () => {
    listByOwnerMock.mockRejectedValueOnce(new Error('Database unavailable'));

    const req = {
      user: { id: 'user-1' },
      query: {},
    } as unknown as Request;

    const res = createMockResponse();

    await controller.listByOwner(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Failed to fetch documents.',
    });
  });
});

/**
 * Test cases for DocumentController.download
 */
describe('DocumentController.download', () => {
  /**
   * Test case: Inline download (default disposition)
   *
   * Expected behavior:
   * - Content-Type, Content-Length, and Content-Disposition headers are set
   * - Stream is piped to the response and bytes are received
   * - Disposition defaults to "inline" when no query param is provided
   */
  it('should stream the file inline with correct headers', async () => {
    const fileBytes = Buffer.from('hello-pdf');
    const stream = Readable.from([fileBytes]);

    const mockDocumentService = {
      upload: mock(),
      listByCourse: mock(),
      getDownloadable: mock(async () => ({
        stream,
        filename: 'Slides.pdf',
        contentType: 'application/pdf',
        fileSize: fileBytes.length,
      })),
    };

    const controller = createController(mockDocumentService as unknown as DocumentService);

    const req = {
      params: { id: 'doc-1' },
      query: {},
      user: { id: 'user-1' },
    } as unknown as Request;

    const { res, chunks } = createPipeableResponse();

    await controller.download(req, res);

    // Wait for the pipe to finish so we can assert on the body.
    await new Promise<void>((resolve) => res.on('finish', () => resolve()));

    expect(mockDocumentService.getDownloadable).toHaveBeenCalledWith('doc-1', 'user-1');

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Length', String(fileBytes.length));

    const dispositionCall = (res.setHeader.mock.calls as unknown as Array<[string, string]>).find(
      (call) => call[0] === 'Content-Disposition'
    );
    expect(dispositionCall).toBeDefined();
    expect(String(dispositionCall?.[1])).toMatch(/^inline; filename="Slides\.pdf"/);

    expect(Buffer.concat(chunks).toString()).toBe('hello-pdf');
  });

  /**
   * Test case: Attachment download
   *
   * Expected behavior:
   * - Content-Disposition uses "attachment" when query param is set
   */
  it('should force an attachment when disposition=attachment', async () => {
    const stream = Readable.from([Buffer.from('x')]);

    const mockDocumentService = {
      upload: mock(),
      listByCourse: mock(),
      getDownloadable: mock(async () => ({
        stream,
        filename: 'Slides.pdf',
        contentType: 'application/pdf',
        fileSize: 1,
      })),
    };

    const controller = createController(mockDocumentService as unknown as DocumentService);

    const req = {
      params: { id: 'doc-1' },
      query: { disposition: 'attachment' },
      user: { id: 'user-1' },
    } as unknown as Request;

    const { res } = createPipeableResponse();

    await controller.download(req, res);
    await new Promise<void>((resolve) => res.on('finish', () => resolve()));

    const dispositionCall = (res.setHeader.mock.calls as unknown as Array<[string, string]>).find(
      (call) => call[0] === 'Content-Disposition'
    );
    expect(String(dispositionCall?.[1])).toMatch(/^attachment; filename="Slides\.pdf"/);
  });

  /**
   * Test case: Filename with non-ASCII characters
   *
   * Expected behavior:
   * - Both filename and filename* parts of RFC 5987 are present
   * - filename* is UTF-8 percent-encoded
   */
  it('should encode non-ASCII filenames per RFC 5987', async () => {
    const stream = Readable.from([Buffer.from('x')]);

    const mockDocumentService = {
      upload: mock(),
      listByCourse: mock(),
      getDownloadable: mock(async () => ({
        stream,
        filename: 'Bücher Zusammenfassung.pdf',
        contentType: 'application/pdf',
        fileSize: 1,
      })),
    };

    const controller = createController(mockDocumentService as unknown as DocumentService);

    const req = {
      params: { id: 'doc-1' },
      query: {},
      user: { id: 'user-1' },
    } as unknown as Request;

    const { res } = createPipeableResponse();

    await controller.download(req, res);
    await new Promise<void>((resolve) => res.on('finish', () => resolve()));

    const dispositionCall = (res.setHeader.mock.calls as unknown as Array<[string, string]>).find(
      (call) => call[0] === 'Content-Disposition'
    );
    const value = String(dispositionCall?.[1]);

    expect(value).toContain('filename="B_cher Zusammenfassung.pdf"');
    expect(value).toContain("filename*=UTF-8''B%C3%BCcher%20Zusammenfassung.pdf");
  });

  /**
   * Test case: Missing id
   *
   * Expected behavior:
   * - Returns 400 before touching the service
   */
  it('should return 400 if id is missing', async () => {
    const mockDocumentService = {
      upload: mock(),
      listByCourse: mock(),
      getDownloadable: mock(),
    };

    const controller = createController(mockDocumentService as unknown as DocumentService);

    const req = {
      params: {},
      query: {},
      user: { id: 'user-1' },
    } as unknown as Request;

    const res = createMockResponse();

    await controller.download(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'id is required.' });
    expect(mockDocumentService.getDownloadable).not.toHaveBeenCalled();
  });

  /**
   * Test case: Unauthenticated request
   *
   * Expected behavior:
   * - Returns 401 before touching the service
   */
  it('should return 401 if user is not authenticated', async () => {
    const mockDocumentService = {
      upload: mock(),
      listByCourse: mock(),
      getDownloadable: mock(),
    };

    const controller = createController(mockDocumentService as unknown as DocumentService);

    const req = {
      params: { id: 'doc-1' },
      query: {},
    } as unknown as Request;

    const res = createMockResponse();

    await controller.download(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized.' });
    expect(mockDocumentService.getDownloadable).not.toHaveBeenCalled();
  });

  /**
   * Test case: Document not found
   *
   * Expected behavior:
   * - Service throws DOCUMENT_NOT_FOUND
   * - Controller returns 404
   */
  it('should return 404 when the document does not exist', async () => {
    const mockDocumentService = {
      upload: mock(),
      listByCourse: mock(),
      getDownloadable: mock(async () => {
        throw new Error('DOCUMENT_NOT_FOUND');
      }),
    };

    const controller = createController(mockDocumentService as unknown as DocumentService);

    const req = {
      params: { id: 'doc-missing' },
      query: {},
      user: { id: 'user-1' },
    } as unknown as Request;

    const res = createMockResponse();

    await controller.download(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Document not found.' });
  });

  /**
   * Test case: Access denied
   *
   * Expected behavior:
   * - Service throws DOCUMENT_ACCESS_DENIED
   * - Controller returns 403
   */
  it('should return 403 when the user has no access to the course', async () => {
    const mockDocumentService = {
      upload: mock(),
      listByCourse: mock(),
      getDownloadable: mock(async () => {
        throw new Error('DOCUMENT_ACCESS_DENIED');
      }),
    };

    const controller = createController(mockDocumentService as unknown as DocumentService);

    const req = {
      params: { id: 'doc-1' },
      query: {},
      user: { id: 'user-x' },
    } as unknown as Request;

    const res = createMockResponse();

    await controller.download(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'You do not have access to this document.',
    });
  });

  /**
   * Test case: Unexpected service error
   *
   * Expected behavior:
   * - Generic 500 response with sanitized message
   */
  it('should return 500 for unexpected errors', async () => {
    const mockDocumentService = {
      upload: mock(),
      listByCourse: mock(),
      getDownloadable: mock(async () => {
        throw new Error('Storage unreachable');
      }),
    };

    const controller = createController(mockDocumentService as unknown as DocumentService);

    const req = {
      params: { id: 'doc-1' },
      query: {},
      user: { id: 'user-1' },
    } as unknown as Request;

    const res = createMockResponse();

    await controller.download(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Failed to download document.' });
  });
});

/**
 * Test cases for DocumentController.deleteById
 */
describe('DocumentController.deleteById', () => {
  it('should return 204 when the document is deleted successfully', async () => {
    const mockDocumentService = {
      upload: mock(),
      listByCourse: mock(),
      deleteForOwner: mock(async () => undefined),
    };

    const controller = createController(mockDocumentService as unknown as DocumentService);

    const res = createMockResponse();
    const sendSpy = mock(() => res as Response);
    (res as unknown as { send: typeof sendSpy }).send = sendSpy;

    const req = {
      params: { id: 'doc-1' },
      user: { id: 'user-1' },
    } as unknown as Request;

    await controller.deleteById(req, res);

    expect(mockDocumentService.deleteForOwner).toHaveBeenCalledWith('doc-1', 'user-1');
    expect(res.status).toHaveBeenCalledWith(204);
    expect(sendSpy).toHaveBeenCalled();
  });

  it('should return 400 if id is missing', async () => {
    const mockDocumentService = {
      upload: mock(),
      listByCourse: mock(),
      deleteForOwner: mock(),
    };

    const controller = createController(mockDocumentService as unknown as DocumentService);

    const req = {
      params: {},
      user: { id: 'user-1' },
    } as unknown as Request;

    const res = createMockResponse();

    await controller.deleteById(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'id is required.' });
    expect(mockDocumentService.deleteForOwner).not.toHaveBeenCalled();
  });

  it('should return 401 if the user is not authenticated', async () => {
    const mockDocumentService = {
      upload: mock(),
      listByCourse: mock(),
      deleteForOwner: mock(),
    };

    const controller = createController(mockDocumentService as unknown as DocumentService);

    const req = {
      params: { id: 'doc-1' },
    } as unknown as Request;

    const res = createMockResponse();

    await controller.deleteById(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Unauthorized.' });
    expect(mockDocumentService.deleteForOwner).not.toHaveBeenCalled();
  });

  it('should return 404 when the document does not exist', async () => {
    const mockDocumentService = {
      upload: mock(),
      listByCourse: mock(),
      deleteForOwner: mock(async () => {
        throw new Error('DOCUMENT_NOT_FOUND');
      }),
    };

    const controller = createController(mockDocumentService as unknown as DocumentService);

    const req = {
      params: { id: 'doc-missing' },
      user: { id: 'user-1' },
    } as unknown as Request;

    const res = createMockResponse();

    await controller.deleteById(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'Document not found.' });
  });

  it('should return 403 when the user is not the course owner', async () => {
    const mockDocumentService = {
      upload: mock(),
      listByCourse: mock(),
      deleteForOwner: mock(async () => {
        throw new Error('DOCUMENT_FORBIDDEN');
      }),
    };

    const controller = createController(mockDocumentService as unknown as DocumentService);

    const req = {
      params: { id: 'doc-1' },
      user: { id: 'user-x' },
    } as unknown as Request;

    const res = createMockResponse();

    await controller.deleteById(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'You do not have permission to delete this document.',
    });
  });

  it('should return 500 for unexpected errors', async () => {
    const mockDocumentService = {
      upload: mock(),
      listByCourse: mock(),
      deleteForOwner: mock(async () => {
        throw new Error('Database meltdown');
      }),
    };

    const controller = createController(mockDocumentService as unknown as DocumentService);

    const req = {
      params: { id: 'doc-1' },
      user: { id: 'user-1' },
    } as unknown as Request;

    const res = createMockResponse();

    await controller.deleteById(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Failed to delete document.' });
  });
});
