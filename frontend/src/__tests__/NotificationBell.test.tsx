import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter } from 'react-router-dom';
import NotificationBell from '../components/shared/layout/NotificationBell';
import { api } from '../services/api';

const navigateMock = vi.fn();

vi.mock('../services/api', () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn(),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

const unreadNotification = {
  id: 'notification-1',
  userId: 'user-1',
  type: 'COURSE_SHARED' as const,
  title: 'Course shared',
  message: 'owner shared "Biology" with you.',
  data: {
    courseName: 'Biology',
    sharedByUsername: 'owner',
  },
  courseId: 'course-1',
  readAt: null,
  createdAt: '2026-06-06T10:00:00.000Z',
};

function renderBell() {
  return render(
    <MemoryRouter>
      <NotificationBell />
    </MemoryRouter>
  );
}

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.get).mockResolvedValue([unreadNotification]);
    vi.mocked(api.patch).mockResolvedValue({
      ...unreadNotification,
      readAt: '2026-06-06T10:01:00.000Z',
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('shows unread notifications and navigates to the shared course when clicked', async () => {
    renderBell();

    const trigger = await screen.findByRole('button', { name: /notifications, 1 unread/i });
    expect(trigger).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();

    fireEvent.click(trigger);

    expect(screen.getByText('Course shared')).toBeInTheDocument();
    expect(screen.getByText(/owner shared/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('menuitem', { name: /course shared/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/notifications/notification-1/read', {});
      expect(navigateMock).toHaveBeenCalledWith('/courses/course-1');
    });
  });

  it('shows an empty state when there are no notifications', async () => {
    vi.mocked(api.get).mockResolvedValueOnce([]);

    renderBell();

    fireEvent.click(await screen.findByRole('button', { name: /notifications, 0 unread/i }));

    expect(screen.getByText(/no notifications yet/i)).toBeInTheDocument();
  });
});
