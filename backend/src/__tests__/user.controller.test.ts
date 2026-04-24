import { describe, it, expect, mock } from 'bun:test';
import type { Request, Response } from 'express';
import { UserController } from '../controllers/user.controller';
import type { UserService } from '../services/user.service';

/**
 * Creates a mock Express response object.
 *
 * The status() method returns the response object itself
 * so chained calls like res.status(404).json(...) can be tested.
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
 * Test cases for UserController.me
 */
describe('UserController.me', () => {
  /**
   * Test case: Successful fetch
   *
   * Scenario:
   * Authenticated user exists in the database.
   *
   * Expected behavior:
   * - UserService.findById() is called with the authenticated user's ID
   * - User DTO is returned as JSON (200)
   */
  it('should return 200 and the user DTO on success', async () => {
    const userDto = {
      id: 'user-1',
      email: 'test@students.zhaw.ch',
      username: 'testuser',
      role: 'USER',
    };

    const mockUserService = {
      findById: mock(async () => userDto),
      changePassword: mock(),
      updateProfile: mock(),
    };

    const controller = new UserController(mockUserService as unknown as UserService);

    const req = {
      user: { id: 'user-1', email: 'test@students.zhaw.ch', username: 'testuser', role: 'USER' },
    } as unknown as Request;

    const res = createMockResponse();

    await controller.me(req, res);

    expect(mockUserService.findById).toHaveBeenCalledWith('user-1');
    expect(res.json).toHaveBeenCalledWith(userDto);
  });

  /**
   * Test case: User not found
   *
   * Scenario:
   * The JWT resolves to a user ID that no longer exists in the database.
   *
   * Expected behavior:
   * - Status code: 404
   * - Response contains not-found message
   */
  it('should return 404 when user is not found', async () => {
    const mockUserService = {
      findById: mock(async () => null),
      changePassword: mock(),
      updateProfile: mock(),
    };

    const controller = new UserController(mockUserService as unknown as UserService);

    const req = {
      user: { id: 'ghost-id', email: 'ghost@students.zhaw.ch', username: 'ghost', role: 'USER' },
    } as unknown as Request;

    const res = createMockResponse();

    await controller.me(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
  });

  /**
   * Test case: Unexpected error
   *
   * Scenario:
   * UserService.findById() throws an unexpected error.
   *
   * Expected behavior:
   * - Status code: 500
   * - Response contains generic failure message
   */
  it('should return 500 on unexpected error', async () => {
    const mockUserService = {
      findById: mock(async () => {
        throw new Error('DB down');
      }),
      changePassword: mock(),
      updateProfile: mock(),
    };

    const controller = new UserController(mockUserService as unknown as UserService);

    const req = {
      user: { id: 'user-1', email: 'test@students.zhaw.ch', username: 'testuser', role: 'USER' },
    } as unknown as Request;

    const res = createMockResponse();

    await controller.me(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Failed to fetch user' });
  });
});

/**
 * Test cases for UserController.changePassword
 */
describe('UserController.changePassword', () => {
  /**
   * Test case: Successful password change
   *
   * Scenario:
   * Valid current password and new password meeting all requirements.
   *
   * Expected behavior:
   * - UserService.changePassword() is called with correct arguments
   * - Response contains success message (200)
   */
  it('should return 200 with success message on valid request', async () => {
    const mockUserService = {
      findById: mock(),
      changePassword: mock(async () => {}),
      updateProfile: mock(),
    };

    const controller = new UserController(mockUserService as unknown as UserService);

    const req = {
      user: { id: 'user-1', email: 'test@students.zhaw.ch', username: 'testuser', role: 'USER' },
      body: {
        currentPassword: 'CurrentPass@123!',
        newPassword: 'NewPass@123456!',
      },
    } as unknown as Request;

    const res = createMockResponse();

    await controller.changePassword(req, res);

    expect(mockUserService.changePassword).toHaveBeenCalledWith(
      'user-1',
      'CurrentPass@123!',
      'NewPass@123456!'
    );
    expect(res.json).toHaveBeenCalledWith({ message: 'Password changed successfully' });
  });

  /**
   * Test case: Missing required fields
   *
   * Scenario:
   * One or both password fields are empty.
   *
   * Expected behavior:
   * - Status code: 400
   * - UserService.changePassword() is not called
   */
  it('should return 400 if required fields are missing', async () => {
    const mockUserService = {
      findById: mock(),
      changePassword: mock(),
      updateProfile: mock(),
    };

    const controller = new UserController(mockUserService as unknown as UserService);

    const req = {
      user: { id: 'user-1', email: 'test@students.zhaw.ch', username: 'testuser', role: 'USER' },
      body: { currentPassword: '', newPassword: '' },
    } as unknown as Request;

    const res = createMockResponse();

    await controller.changePassword(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Current password and new password are required',
    });
    expect(mockUserService.changePassword).not.toHaveBeenCalled();
  });

  /**
   * Test case: New password fails security requirements
   *
   * Scenario:
   * The new password is too short / does not meet complexity rules.
   *
   * Expected behavior:
   * - Status code: 400
   * - UserService.changePassword() is not called
   */
  it('should return 400 if new password does not meet security requirements', async () => {
    const mockUserService = {
      findById: mock(),
      changePassword: mock(),
      updateProfile: mock(),
    };

    const controller = new UserController(mockUserService as unknown as UserService);

    const req = {
      user: { id: 'user-1', email: 'test@students.zhaw.ch', username: 'testuser', role: 'USER' },
      body: {
        currentPassword: 'CurrentPass@123!',
        newPassword: 'weak',
      },
    } as unknown as Request;

    const res = createMockResponse();

    await controller.changePassword(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Password does not meet security requirements',
    });
    expect(mockUserService.changePassword).not.toHaveBeenCalled();
  });

  /**
   * Test case: Incorrect current password
   *
   * Scenario:
   * UserService throws "Current password is incorrect".
   *
   * Expected behavior:
   * - Status code: 401
   * - Response contains the error message
   */
  it('should return 401 when current password is incorrect', async () => {
    const mockUserService = {
      findById: mock(),
      changePassword: mock(async () => {
        throw new Error('Current password is incorrect');
      }),
      updateProfile: mock(),
    };

    const controller = new UserController(mockUserService as unknown as UserService);

    const req = {
      user: { id: 'user-1', email: 'test@students.zhaw.ch', username: 'testuser', role: 'USER' },
      body: {
        currentPassword: 'WrongPass@123!',
        newPassword: 'NewPass@123456!',
      },
    } as unknown as Request;

    const res = createMockResponse();

    await controller.changePassword(req, res);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ message: 'Current password is incorrect' });
  });

  /**
   * Test case: Unexpected error
   *
   * Scenario:
   * UserService.changePassword() throws an unexpected error.
   *
   * Expected behavior:
   * - Status code: 500
   * - Response contains generic failure message
   */
  it('should return 500 on unexpected error', async () => {
    const mockUserService = {
      findById: mock(),
      changePassword: mock(async () => {
        throw new Error('DB connection lost');
      }),
      updateProfile: mock(),
    };

    const controller = new UserController(mockUserService as unknown as UserService);

    const req = {
      user: { id: 'user-1', email: 'test@students.zhaw.ch', username: 'testuser', role: 'USER' },
      body: {
        currentPassword: 'CurrentPass@123!',
        newPassword: 'NewPass@123456!',
      },
    } as unknown as Request;

    const res = createMockResponse();

    await controller.changePassword(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Failed to change password' });
  });

  /**
   * Test case: Whitespace-only fields treated as missing
   *
   * Scenario:
   * Both password fields contain only whitespace.
   *
   * Expected behavior:
   * - Status code: 400
   * - UserService.changePassword() is not called
   */
  it('should return 400 if fields contain only whitespace', async () => {
    const mockUserService = {
      findById: mock(),
      changePassword: mock(),
      updateProfile: mock(),
    };

    const controller = new UserController(mockUserService as unknown as UserService);

    const req = {
      user: { id: 'user-1', email: 'test@students.zhaw.ch', username: 'testuser', role: 'USER' },
      body: { currentPassword: '   ', newPassword: '   ' },
    } as unknown as Request;

    const res = createMockResponse();

    await controller.changePassword(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Current password and new password are required',
    });
    expect(mockUserService.changePassword).not.toHaveBeenCalled();
  });
});

/**
 * Test cases for UserController.updateProfile
 */
describe('UserController.updateProfile', () => {
  it('should return the updated user on valid request', async () => {
    const updatedUser = {
      id: 'user-1',
      email: 'new@students.zhaw.ch',
      username: 'newuser',
      role: 'USER',
    };

    const mockUserService = {
      findById: mock(),
      changePassword: mock(),
      updateProfile: mock(async () => updatedUser),
    };

    const controller = new UserController(mockUserService as unknown as UserService);

    const req = {
      user: { id: 'user-1', email: 'test@students.zhaw.ch', username: 'testuser', role: 'USER' },
      body: {
        email: ' NEW@students.zhaw.ch ',
        username: ' newuser ',
      },
    } as unknown as Request;

    const res = createMockResponse();

    await controller.updateProfile(req, res);

    expect(mockUserService.updateProfile).toHaveBeenCalledWith('user-1', {
      email: 'new@students.zhaw.ch',
      username: 'newuser',
    });
    expect(res.json).toHaveBeenCalledWith(updatedUser);
  });

  it('should return 400 when email or username is missing', async () => {
    const mockUserService = {
      findById: mock(),
      changePassword: mock(),
      updateProfile: mock(),
    };

    const controller = new UserController(mockUserService as unknown as UserService);

    const req = {
      user: { id: 'user-1', email: 'test@students.zhaw.ch', username: 'testuser', role: 'USER' },
      body: { email: '', username: '' },
    } as unknown as Request;

    const res = createMockResponse();

    await controller.updateProfile(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: 'Email and username are required' });
    expect(mockUserService.updateProfile).not.toHaveBeenCalled();
  });

  it('should return 409 when email or username is already used', async () => {
    const mockUserService = {
      findById: mock(),
      changePassword: mock(),
      updateProfile: mock(async () => {
        throw new Error('Email is already in use');
      }),
    };

    const controller = new UserController(mockUserService as unknown as UserService);

    const req = {
      user: { id: 'user-1', email: 'test@students.zhaw.ch', username: 'testuser', role: 'USER' },
      body: {
        email: 'taken@students.zhaw.ch',
        username: 'testuser',
      },
    } as unknown as Request;

    const res = createMockResponse();

    await controller.updateProfile(req, res);

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith({ message: 'Email is already in use' });
  });
});

/**
 * Test cases for UserController.deleteAccount
 */
describe('UserController.deleteAccount', () => {
  it('should delete the authenticated user and return a success message', async () => {
    const userDto = {
      id: 'user-1',
      email: 'test@students.zhaw.ch',
      username: 'testuser',
      role: 'USER',
    };

    const mockUserService = {
      findById: mock(async () => userDto),
      changePassword: mock(),
      updateProfile: mock(),
      deleteAccount: mock(async () => userDto),
    };

    const controller = new UserController(mockUserService as unknown as UserService);

    const req = {
      user: { id: 'user-1', email: 'test@students.zhaw.ch', username: 'testuser', role: 'USER' },
    } as unknown as Request;

    const res = createMockResponse();

    await controller.deleteAccount(req, res);

    expect(mockUserService.findById).toHaveBeenCalledWith('user-1');
    expect(mockUserService.deleteAccount).toHaveBeenCalledWith('user-1');
    expect(res.json).toHaveBeenCalledWith({
      message: 'User was deleted successfully',
      id: 'user-1',
    });
  });

  it('should return 404 when the authenticated user no longer exists', async () => {
    const mockUserService = {
      findById: mock(async () => null),
      changePassword: mock(),
      updateProfile: mock(),
      deleteAccount: mock(),
    };

    const controller = new UserController(mockUserService as unknown as UserService);

    const req = {
      user: { id: 'ghost-id', email: 'ghost@students.zhaw.ch', username: 'ghost', role: 'USER' },
    } as unknown as Request;

    const res = createMockResponse();

    await controller.deleteAccount(req, res);

    expect(mockUserService.findById).toHaveBeenCalledWith('ghost-id');
    expect(mockUserService.deleteAccount).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: 'User not found' });
  });

  it('should return 500 on unexpected error', async () => {
    const userDto = {
      id: 'user-1',
      email: 'test@students.zhaw.ch',
      username: 'testuser',
      role: 'USER',
    };

    const mockUserService = {
      findById: mock(async () => userDto),
      changePassword: mock(),
      updateProfile: mock(),
      deleteAccount: mock(async () => {
        throw new Error('DB connection lost');
      }),
    };

    const controller = new UserController(mockUserService as unknown as UserService);

    const req = {
      user: { id: 'user-1', email: 'test@students.zhaw.ch', username: 'testuser', role: 'USER' },
    } as unknown as Request;

    const res = createMockResponse();

    await controller.deleteAccount(req, res);

    expect(mockUserService.deleteAccount).toHaveBeenCalledWith('user-1');
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'Failed to delete user' });
  });
});
