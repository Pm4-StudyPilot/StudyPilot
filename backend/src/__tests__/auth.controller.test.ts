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

/**
 * Test cases for Register
 */
describe("AuthController.register", () => {
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
      checkAvailability: mock(),
    };

    const controller = new AuthController(mockAuthService as unknown as AuthService);

    const req = {
      body: {
        email: 'test@students.zhaw.ch',
        username: 'testuser',
        password: 'Strong@Password123!',
      },
    } as Request;

    const res = createMockResponse();

    await controller.register(req, res);

    expect(mockAuthService.register).toHaveBeenCalledWith(
      'test@students.zhaw.ch',
      'testuser',
      'Strong@Password123!'
    );
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(serviceResult);
  });

  /**
   * Test case: Email normalization (trim + lowercase)
   *
   * Scenario:
   * Email contains leading/trailing spaces and uppercase letters.
   *
   * Expected behavior:
   * - Email is normalized before being passed to AuthService
   */
  it("should normalize email before calling AuthService.register", async () => {
    const mockAuthService = {
      register: mock(async () => ({
        user: {
          id: "1",
          email: "test@students.zhaw.ch",
          username: "testuser",
          role: "student",
        },
        token: "fake-jwt-token",
      })),
      login: mock(),
      checkAvailability: mock(),
    };

    const controller = new AuthController(mockAuthService as unknown as AuthService);

    const req = {
      body: {
        email: "  TEST@students.zhaw.ch  ",
        username: "testuser",
        password: "Strong@Password123!",
      },
    } as Request;

    const res = createMockResponse();

    await controller.register(req, res);

    expect(mockAuthService.register).toHaveBeenCalledWith(
      "test@students.zhaw.ch", // normalized
      "testuser",
      "Strong@Password123!"
    );
  });

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
  it("should return 400 if required fields are missing", async () => {
    const mockAuthService = {
      register: mock(),
      login: mock(),
      checkAvailability: mock(),
    };

    const controller = new AuthController(mockAuthService as unknown as AuthService);

    const req = {
      body: {
        email: "test@students.zhaw.ch",
      },
    } as Request;

    const res = createMockResponse();

    await controller.register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Email, username, and password are required",
    });
    expect(mockAuthService.register).not.toHaveBeenCalled();
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
      checkAvailability: mock(),
    };

    const controller = new AuthController(mockAuthService as unknown as AuthService);

    const req = {
      body: {
        email: 'duplicate@students.zhaw.ch',
        username: 'testuser',
        password: 'Strong@Password123!',
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
      checkAvailability: mock(),
    };

    const controller = new AuthController(mockAuthService as unknown as AuthService);

    const req = {
      body: {
        email: 'test@students.zhaw.ch',
        username: 'duplicateUser',
        password: 'Strong@Password123!',
      },
    } as Request;

    const res = createMockResponse();

    await controller.register(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Username already exists',
    });
  });

  /**
   * Test case: Invalid email format
   *
   * Scenario:
   * A registration request is sent with an invalid e-mail format,
   * while username and password are otherwise provided.
   *
   * Expected behavior:
   * - Request is rejected before AuthService.register() is called
   * - Status code: 400
   * - Response contains invalid e-mail format message
   */
  it("should return 400 if email format is invalid", async () => {
    const mockAuthService = {
      register: mock(),
      login: mock(),
      checkAvailability: mock(),
    };

    const controller = new AuthController(mockAuthService as unknown as AuthService);

    const req = {
      body: {
        email: "invalid-email",
        username: "testuser",
        password: "Strong@Password123!",
      },
    } as Request;

    const res = createMockResponse();

    await controller.register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid email format",
    });
    expect(mockAuthService.register).not.toHaveBeenCalled();
  });

  /**
   * Test case: Invalid password format
   *
   * Scenario:
   * A registration request is sent with a password that does not meet
   * the defined security requirements.
   *
   * Expected behavior:
   * - Request is rejected before AuthService.register() is called
   * - Status code: 400
   * - Response contains password security error message
   */
  it("should return 400 if password does not meet security requirements", async () => {
    const mockAuthService = {
      register: mock(),
      login: mock(),
      checkAvailability: mock(),
    };

    const controller = new AuthController(mockAuthService as unknown as AuthService);

    const req = {
      body: {
        email: "test@students.zhaw.ch",
        username: "testuser",
        password: "short",
      },
    } as Request;

    const res = createMockResponse();

    await controller.register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Password does not meet security requirements",
    });
    expect(mockAuthService.register).not.toHaveBeenCalled();
  });

  /**
   * Test case: Whitespace-only required fields
   *
   * Scenario:
   * Email, username, and password are provided as whitespace-only strings.
   *
   * Expected behavior:
   * - Request is rejected because trimmed values are empty
   * - Status code: 400
   * - Response contains required fields validation message
   */
  it("should return 400 if required fields contain only whitespace", async () => {
    const mockAuthService = {
      register: mock(),
      login: mock(),
      checkAvailability: mock(),
    };

    const controller = new AuthController(mockAuthService as unknown as AuthService);

    const req = {
      body: {
        email: "   ",
        username: "   ",
        password: "   ",
      },
    } as Request;

    const res = createMockResponse();

    await controller.register(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Email, username, and password are required",
    });
    expect(mockAuthService.register).not.toHaveBeenCalled();
  });

  /**
   * Test case: Generic duplicate fallback
   *
   * Scenario:
   * AuthService throws a Prisma unique constraint error, but the message
   * does not explicitly mention e-mail or username.
   *
   * Expected behavior:
   * - Request is rejected
   * - Status code: 409
   * - Response contains generic duplicate entry message
   */
  it("should return 409 with generic duplicate message for unknown P2002 target", async () => {
    const mockAuthService = {
      register: mock(async () => {
        throw {
          code: "P2002",
          message: "Unique constraint failed on unknown field",
        };
      }),
      login: mock(),
      checkAvailability: mock(),
    };

    const controller = new AuthController(mockAuthService as unknown as AuthService);

    const req = {
      body: {
        email: "test@students.zhaw.ch",
        username: "testuser",
        password: "Strong@Password123!",
      },
    } as Request;

    const res = createMockResponse();

    await controller.register(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({
      message: "Duplicate entry",
    });
  });

  /**
   * Test case: Unexpected registration error
   *
   * Scenario:
   * AuthService.register() throws an unexpected non-Prisma error.
   *
   * Expected behavior:
   * - Request is rejected
   * - Status code: 500
   * - Response contains general registration failure message
   */
  it("should return 500 for unexpected registration errors", async () => {
    const mockAuthService = {
      register: mock(async () => {
        throw new Error("Unexpected failure");
      }),
      login: mock(),
      checkAvailability: mock(),
    };

    const controller = new AuthController(mockAuthService as unknown as AuthService);

    const req = {
      body: {
        email: "test@students.zhaw.ch",
        username: "testuser",
        password: "Strong@Password123!",
      },
    } as Request;

    const res = createMockResponse();

    await controller.register(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "Registration failed",
    });
  });
});

/**
 * Test cases for Login 
 */  
describe("AuthController.login", () => {
  /**
   * Test case: Successful login
   *
   * Scenario:
   * A valid identifier (email or username) and password are provided.
   *
   * Expected behavior:
   * - AuthService.login() is called with the provided identifier and password
   * - Response contains authenticated user and token
   */
  it("should return user and token on successful login", async () => {
    const serviceResult = {
      user: {
        id: "1",
        email: "test@students.zhaw.ch",
        username: "testuser",
        role: "student",
      },
      token: "fake-jwt-token",
    };

    const mockAuthService = {
      register: mock(),
      login: mock(async () => serviceResult),
      checkAvailability: mock(),
    };

    const controller = new AuthController(mockAuthService as unknown as AuthService);

    const req = {
      body: {
        identifier: "testuser",
        password: "Strong@Password123!",
      },
    } as Request;

    const res = createMockResponse();

    await controller.login(req, res);

    expect(mockAuthService.login).toHaveBeenCalledWith("testuser", "Strong@Password123!");
    expect(res.json).toHaveBeenCalledWith(serviceResult);
  });

  /**
   * Test case: Missing required fields
   *
   * Scenario:
   * Identifier and/or password are missing or empty.
   *
   * Expected behavior:
   * - Request is rejected
   * - Status code: 400
   * - AuthService.login() is not called
   */
  it("should return 400 if identifier or password is missing", async () => {
    const mockAuthService = {
      register: mock(),
      login: mock(),
      checkAvailability: mock(),
    };

    const controller = new AuthController(mockAuthService as unknown as AuthService);

    const req = {
      body: {
        identifier: "",
        password: "",
      },
    } as Request;

    const res = createMockResponse();

    await controller.login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Email or username and password are required",
    });
    expect(mockAuthService.login).not.toHaveBeenCalled();
  });

  /**
   * Test case: Whitespace-only identifier
   *
   * Scenario:
   * Identifier contains only whitespace characters.
   *
   * Expected behavior:
   * - Input is trimmed and considered invalid
   * - Status code: 400
   * - AuthService.login() is not called
   */
  it("should return 400 if identifier contains only whitespace", async () => {
    const mockAuthService = {
      register: mock(),
      login: mock(),
      checkAvailability: mock(),
    };

    const controller = new AuthController(mockAuthService as unknown as AuthService);

    const req = {
      body: {
        identifier: "   ",
        password: "Strong@Password123!",
      },
    } as Request;

    const res = createMockResponse();

    await controller.login(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Email or username and password are required",
    });
    expect(mockAuthService.login).not.toHaveBeenCalled();
  });

  /**
   * Test case: Invalid credentials
   *
   * Scenario:
   * AuthService.login() throws an "Invalid credentials" error.
   *
   * Expected behavior:
   * - Request is rejected
   * - Status code: 401
   * - Response contains authentication error message
   */
  it("should return 401 for invalid credentials", async () => {
    const mockAuthService = {
      register: mock(),
      login: mock(async () => {
        throw new Error("Invalid credentials");
      }),
      checkAvailability: mock(),
    };

    const controller = new AuthController(mockAuthService as unknown as AuthService);

    const req = {
      body: {
        identifier: "testuser",
        password: "wrong-password",
      },
    } as Request;

    const res = createMockResponse();

    await controller.login(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: "Invalid credentials",
    });
  });

  /**
   * Test case: Unexpected login error
   *
   * Scenario:
   * AuthService.login() throws an unexpected error.
   *
   * Expected behavior:
   * - Request is rejected
   * - Status code: 500
   * - Response contains generic login failure message
   */
  it("should return 500 for unexpected login errors", async () => {
    const mockAuthService = {
      register: mock(),
      login: mock(async () => {
        throw new Error("Unexpected failure");
      }),
      checkAvailability: mock(),
    };

    const controller = new AuthController(mockAuthService as unknown as AuthService);

    const req = {
      body: {
        identifier: "testuser",
        password: "Strong@Password123!",
      },
    } as Request;

    const res = createMockResponse();

    await controller.login(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: "Login failed",
    });
  });
});  

