import { describe, it, expect, mock } from 'bun:test';
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
   * - query params contain sortBy, fileType, and search
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
        sortBy: 'nameAsc',
        fileType: 'application/pdf',
        search: 'agile',
      },
      user: { id: 'user-1' },
    } as unknown as Request;

    const res = createMockResponse();

    await controller.listByCourse(req, res);

    expect(mockDocumentService.listByCourse).toHaveBeenCalledWith('course-1', 'user-1', {
      sortBy: 'nameAsc',
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
        sortBy: ['nameAsc'],
        fileType: { nested: 'application/pdf' },
        search: ['agile'],
      },
      user: { id: 'user-1' },
    } as unknown as Request;

    const res = createMockResponse();

    await controller.listByCourse(req, res);

    expect(mockDocumentService.listByCourse).toHaveBeenCalledWith('course-1', 'user-1', {
      sortBy: undefined,
      fileType: undefined,
      search: undefined,
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(documents);
  });
});
