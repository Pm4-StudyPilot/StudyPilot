import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import DeleteTaskModal from '../components/tasks/DeleteTaskModal';
import { api } from '../services/api';

/**
 * Mock API service.
 *
 * Prevents real HTTP requests and allows controlled responses
 * for task delete requests.
 */
vi.mock('../services/api', () => ({
  api: {
    delete: vi.fn(),
  },
}));

const mockTask = {
  id: 't1',
  title: 'Write lab report',
  description: null,
  dueDate: null,
  priority: 'MEDIUM' as const,
  status: 'OPEN' as const,
  position: 0,
  completed: false,
  courseId: 'c1',
  createdAt: '2026-04-15T12:00:00.000Z',
  updatedAt: '2026-04-15T12:00:00.000Z',
};

/**
 * DeleteTaskModal component tests.
 *
 * Covered scenarios:
 * - task title is shown in the confirmation message
 * - successful delete notifies parent with the task id
 * - onClose is called when cancel is clicked
 * - server error is displayed when the request fails
 */
describe('DeleteTaskModal', () => {
  const mockOnClose = vi.fn();
  const mockOnDeleted = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Test case: Task title in confirmation message
   *
   * Scenario:
   * The modal is opened for an existing task.
   *
   * Expected behavior:
   * - The task title is visible in the confirmation message
   */
  it('displays the task title in the confirmation message', () => {
    render(<DeleteTaskModal task={mockTask} onClose={mockOnClose} onDeleted={mockOnDeleted} />);

    expect(screen.getByText(/write lab report/i)).toBeInTheDocument();
  });

  /**
   * Test case: Successful delete
   *
   * Scenario:
   * The user clicks the Delete button and the backend responds with success.
   *
   * Expected behavior:
   * - API is called with the correct course and task id
   * - onDeleted is called with the task id
   */
  it('calls onDeleted with the task id on successful deletion', async () => {
    vi.mocked(api.delete).mockResolvedValueOnce(undefined);

    render(<DeleteTaskModal task={mockTask} onClose={mockOnClose} onDeleted={mockOnDeleted} />);

    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/courses/c1/tasks/t1');
      expect(mockOnDeleted).toHaveBeenCalledWith('t1');
    });
  });

  /**
   * Test case: Cancel button
   *
   * Scenario:
   * The user clicks the Cancel button.
   *
   * Expected behavior:
   * - onClose is called
   * - API is not called
   */
  it('calls onClose when cancel is clicked', () => {
    render(<DeleteTaskModal task={mockTask} onClose={mockOnClose} onDeleted={mockOnDeleted} />);

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(mockOnClose).toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  /**
   * Test case: Server error
   *
   * Scenario:
   * The backend rejects the delete request.
   *
   * Expected behavior:
   * - Error message is displayed
   * - onDeleted is not called
   */
  it('shows an error message when the request fails', async () => {
    vi.mocked(api.delete).mockRejectedValueOnce(new Error('Failed to delete task'));

    render(<DeleteTaskModal task={mockTask} onClose={mockOnClose} onDeleted={mockOnDeleted} />);

    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(screen.getByText(/failed to delete task/i)).toBeInTheDocument();
    });

    expect(mockOnDeleted).not.toHaveBeenCalled();
  });
});
