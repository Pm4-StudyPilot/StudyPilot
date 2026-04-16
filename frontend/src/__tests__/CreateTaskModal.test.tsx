import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import CreateTaskModal from '../components/tasks/CreateTaskModal';
import { api } from '../services/api';

/**
 * Mock API service.
 *
 * Prevents real HTTP requests and allows controlled responses
 * for task creation requests.
 */
vi.mock('../services/api', () => ({
  api: {
    post: vi.fn(),
  },
}));

/**
 * CreateTaskModal component tests.
 *
 * Covered scenarios:
 * - form fields and submit button are rendered
 * - successful task creation notifies parent and closes modal
 * - validation blocks submission when title is empty
 * - server error is displayed when the request fails
 */
describe('CreateTaskModal', () => {
  const mockOnClose = vi.fn();
  const mockOnCreated = vi.fn();
  const courseId = 'c1';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Test case: Render form fields
   *
   * Scenario:
   * The modal is opened.
   *
   * Expected behavior:
   * - Title, description, due date, and priority inputs are displayed
   * - Submit button is displayed
   */
  it('renders all form fields and the submit button', () => {
    render(<CreateTaskModal courseId={courseId} onClose={mockOnClose} onCreated={mockOnCreated} />);

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/due date/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/priority/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create task/i })).toBeInTheDocument();
  });

  /**
   * Test case: Successful creation
   *
   * Scenario:
   * A valid task title is entered and the backend returns the created task.
   *
   * Expected behavior:
   * - API is called with the correct course id and task data
   * - onCreated is called with the returned task
   */
  it('calls onCreated with the new task on successful submission', async () => {
    const newTask = {
      id: 't1',
      title: 'Write lab report',
      description: null,
      dueDate: null,
      priority: 'MEDIUM',
      status: 'OPEN',
      position: 0,
      completed: false,
      courseId: 'c1',
      createdAt: '2026-04-15T12:00:00.000Z',
      updatedAt: '2026-04-15T12:00:00.000Z',
    };

    vi.mocked(api.post).mockResolvedValueOnce(newTask);

    render(<CreateTaskModal courseId={courseId} onClose={mockOnClose} onCreated={mockOnCreated} />);

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: 'Write lab report' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create task/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/courses/c1/tasks',
        expect.objectContaining({ title: 'Write lab report' })
      );
      expect(mockOnCreated).toHaveBeenCalledWith(newTask);
    });
  });

  /**
   * Test case: Empty title validation
   *
   * Scenario:
   * The submit button is clicked without entering a task title.
   *
   * Expected behavior:
   * - Client-side validation blocks the submission
   * - API is not called
   * - Validation error message is displayed
   */
  it('shows a validation error when title is empty', async () => {
    render(<CreateTaskModal courseId={courseId} onClose={mockOnClose} onCreated={mockOnCreated} />);

    fireEvent.click(screen.getByRole('button', { name: /create task/i }));

    await waitFor(() => {
      expect(screen.getByText(/task title is required/i)).toBeInTheDocument();
    });

    expect(api.post).not.toHaveBeenCalled();
  });

  /**
   * Test case: Server error
   *
   * Scenario:
   * The backend rejects the create request.
   *
   * Expected behavior:
   * - Error message is displayed
   * - onCreated is not called
   */
  it('shows an error message when the request fails', async () => {
    vi.mocked(api.post).mockRejectedValueOnce(new Error('Failed to create task'));

    render(<CreateTaskModal courseId={courseId} onClose={mockOnClose} onCreated={mockOnCreated} />);

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: 'Study for exam' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create task/i }));

    await waitFor(() => {
      expect(screen.getByText(/failed to create task/i)).toBeInTheDocument();
    });

    expect(mockOnCreated).not.toHaveBeenCalled();
  });
});
