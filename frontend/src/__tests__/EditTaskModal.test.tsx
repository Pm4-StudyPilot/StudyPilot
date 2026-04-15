import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import EditTaskModal from '../components/tasks/EditTaskModal';
import { api } from '../services/api';

/**
 * Mock API service.
 *
 * Prevents real HTTP requests and allows controlled responses
 * for task update requests.
 */
vi.mock('../services/api', () => ({
  api: {
    patch: vi.fn(),
  },
}));

const mockTask = {
  id: 't1',
  title: 'Write lab report',
  description: 'Cover chapters 3 and 4',
  dueDate: '2026-04-20T00:00:00.000Z',
  priority: 'MEDIUM' as const,
  status: 'OPEN' as const,
  position: 0,
  completed: false,
  courseId: 'c1',
  createdAt: '2026-04-15T12:00:00.000Z',
  updatedAt: '2026-04-15T12:00:00.000Z',
};

/**
 * EditTaskModal component tests.
 *
 * Covered scenarios:
 * - all fields are pre-filled with the current task data
 * - successful edit notifies parent with the updated task
 * - validation blocks submission when title is empty
 * - server error is displayed when the request fails
 */
describe('EditTaskModal', () => {
  const mockOnClose = vi.fn();
  const mockOnUpdated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Test case: Pre-filled fields
   *
   * Scenario:
   * The modal is opened for an existing task.
   *
   * Expected behavior:
   * - All fields are pre-filled with the current task values
   */
  it('pre-fills all fields with the current task data', () => {
    render(<EditTaskModal task={mockTask} onClose={mockOnClose} onUpdated={mockOnUpdated} />);

    expect(screen.getByLabelText(/title/i)).toHaveValue('Write lab report');
    expect(screen.getByLabelText(/description/i)).toHaveValue('Cover chapters 3 and 4');
    expect(screen.getByLabelText(/priority/i)).toHaveValue('MEDIUM');
    expect(screen.getByLabelText(/status/i)).toHaveValue('OPEN');
  });

  /**
   * Test case: Successful edit
   *
   * Scenario:
   * The user updates the title and submits the form.
   *
   * Expected behavior:
   * - API is called with the correct endpoint and updated data
   * - onUpdated is called with the returned task
   */
  it('calls onUpdated with the updated task on successful submission', async () => {
    const updatedTask = { ...mockTask, title: 'Write final lab report' };
    vi.mocked(api.patch).mockResolvedValueOnce(updatedTask);

    render(<EditTaskModal task={mockTask} onClose={mockOnClose} onUpdated={mockOnUpdated} />);

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: 'Write final lab report' },
    });

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith(
        '/courses/c1/tasks/t1',
        expect.objectContaining({ title: 'Write final lab report' })
      );
      expect(mockOnUpdated).toHaveBeenCalledWith(updatedTask);
    });
  });

  /**
   * Test case: Empty title validation
   *
   * Scenario:
   * The user clears the title and submits the form.
   *
   * Expected behavior:
   * - Client-side validation blocks the submission
   * - API is not called
   * - Validation error message is displayed
   */
  it('shows a validation error when title is empty', async () => {
    render(<EditTaskModal task={mockTask} onClose={mockOnClose} onUpdated={mockOnUpdated} />);

    fireEvent.change(screen.getByLabelText(/title/i), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByText(/task title is required/i)).toBeInTheDocument();
    });

    expect(api.patch).not.toHaveBeenCalled();
  });

  /**
   * Test case: Server error
   *
   * Scenario:
   * The backend rejects the update request.
   *
   * Expected behavior:
   * - Error message is displayed
   * - onUpdated is not called
   */
  it('shows an error message when the request fails', async () => {
    vi.mocked(api.patch).mockRejectedValueOnce(new Error('Failed to update task'));

    render(<EditTaskModal task={mockTask} onClose={mockOnClose} onUpdated={mockOnUpdated} />);

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByText(/failed to update task/i)).toBeInTheDocument();
    });

    expect(mockOnUpdated).not.toHaveBeenCalled();
  });
});
