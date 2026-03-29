import { describe, it, expect, mock } from 'bun:test';
import type { Request, Response } from 'express';
import { AuthController } from '../controllers/auth.controller';
import type { AuthService } from '../services/auth.service';

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

describe('AuthController.register', () => {
  /**
   * Test case: Missing required fields
   *
   * Scenario:
   * Only email is provided, while username and password are missing.
   *
   * Expected behavior:
   * - Request is rejected
   * - Status code: 400
   * - Response contains validation error message
   */
  it('should return 400 if required fields are missing', async () => {
    const mockAuthService = {
      register: mock(),
      login: mock(),
    };

    const controller = new AuthController(mockAuthService as unknown as AuthService);

    const req = {
      body: {
        email: 'test@students.zhaw.ch',
      },
    } as Request;

    const res = createMockResponse();

    await controller.register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Email, username, and password are required',
    });
    expect(mockAuthService.register).not.toHaveBeenCalled();
  });

  /**
   * Test case: Successful registration
   *
   * Scenario:
   * Valid email, username, and password are provided.
   *
   * Expected behavior:
   * - AuthService.register() is called with the provided data
   * - Status code: 201
   * - Response contains created user and token
   */
  it('should return 201 and registration result on successful registration', async () => {
    const serviceResult = {
      user: {
        id: '1',
        email: 'test@students.zhaw.ch',
        username: 'testuser',
        role: 'student',
      },
      token: 'fake-jwt-token',
    };

    const mockAuthService = {
      register: mock(async () => serviceResult),
      login: mock(),
    };

    const controller = new AuthController(mockAuthService as unknown as AuthService);

    const req = {
      body: {
        email: 'test@students.zhaw.ch',
        username: 'testuser',
        password: 'Password123!',
      },
    } as Request;

    const res = createMockResponse();

    await controller.register(req, res);

    expect(mockAuthService.register).toHaveBeenCalledWith(
      'test@students.zhaw.ch',
      'testuser',
      'Password123!'
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(serviceResult);
  });

  /**
   * Test case: Duplicate email
   *
   * Scenario:
   * AuthService throws a Prisma unique constraint error related to email.
   *
   * Expected behavior:
   * - Request is rejected
   * - Status code: 409
   * - Response contains duplicate email error message
   */
  it('should return 409 if email already exists', async () => {
    const mockAuthService = {
      register: mock(async () => {
        throw {
          code: 'P2002',
          message: 'Unique constraint failed on the fields: (`email`)',
        };
      }),
      login: mock(),
    };

    const controller = new AuthController(mockAuthService as unknown as AuthService);

    const req = {
      body: {
        email: 'duplicate@students.zhaw.ch',
        username: 'testuser',
        password: 'Password123!',
      },
    } as Request;

    const res = createMockResponse();

    await controller.register(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Email already exists',
    });
  });

  /**
   * Test case: Duplicate username
   *
   * Scenario:
   * AuthService throws a Prisma unique constraint error related to username.
   *
   * Expected behavior:
   * - Request is rejected
   * - Status code: 409
   * - Response contains duplicate username error message
   */
  it('should return 409 if username already exists', async () => {
    const mockAuthService = {
      register: mock(async () => {
        throw {
          code: 'P2002',
          message: 'Unique constraint failed on the fields: (`username`)',
        };
      }),
      login: mock(),
    };

    const controller = new AuthController(mockAuthService as unknown as AuthService);

    const req = {
      body: {
        email: 'test@students.zhaw.ch',
        username: 'duplicateUser',
        password: 'Password123!',
      },
    } as Request;

    const res = createMockResponse();

    await controller.register(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Username already exists',
    });
  });
});
