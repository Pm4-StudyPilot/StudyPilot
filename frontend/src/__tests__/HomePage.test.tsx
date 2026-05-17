import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

vi.mock('../context/useAuth', () => ({
  useAuth: () => ({
    user: { username: 'testuser', email: 'test@example.com' },
    logout: vi.fn(),
  }),
}));

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('loads the course list and calendar in the existing dashboard layout', async () => {
    vi.mocked(api.get).mockImplementation((endpoint: string) => {
      if (endpoint === '/courses') {
        return Promise.resolve([
          {
            id: 'course-1',
            name: 'Computer Science',
            color: '#6C63FF',
            ownerId: 'user-1',
            createdAt: '2026-05-01T10:00:00.000Z',
            updatedAt: '2026-05-01T10:00:00.000Z',
          },
        ]);
      }

      if (endpoint === '/courses/course-1/tasks') {
        return Promise.resolve([
          {
            id: 'task-1',
            title: 'Read chapter 5',
            description: 'Review the compiler chapter before class.',
            dueDate: '2026-05-12T00:00:00.000Z',
            priority: 'HIGH',
            status: 'OPEN',
            position: 0,
            completed: false,
            courseId: 'course-1',
            createdAt: '2026-05-01T10:00:00.000Z',
            updatedAt: '2026-05-01T10:00:00.000Z',
          },
        ]);
      }

      return Promise.reject(new Error(`Unexpected endpoint: ${endpoint}`));
    });

    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(screen.getByText('My Courses')).toBeInTheDocument();
    expect(screen.getByText('Deadline Calendar')).toBeInTheDocument();
    expect((await screen.findAllByText('Computer Science')).length).toBeGreaterThan(0);
    expect(await screen.findByText('Read chapter 5', {}, { timeout: 3000 })).toBeInTheDocument();
  });
});
