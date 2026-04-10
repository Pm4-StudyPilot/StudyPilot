import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import DeleteCourseModal from '../components/courses/DeleteCourseModal';
import { api } from '../services/api';

/**
 * Mock API service.
 *
 * Prevents real HTTP requests and allows controlled responses
 * for course delete requests.
 */
vi.mock('../services/api', () => ({
  api: {
    delete: vi.fn(),
  },
}));

const mockCourse = {
  id: 'c1',
  name: 'Machine Learning',
  ownerId: 'u1',
  createdAt: '2026-03-26T12:00:00.000Z',
  updatedAt: '2026-03-26T12:00:00.000Z',
};

/**
 * DeleteCourseModal component tests.
 *
 * Covered scenarios:
 * - course name is shown in the confirmation message
 * - successful delete notifies parent with the course id
 * - onClose is called when cancel is clicked
 * - server error is displayed when the request fails
 */
describe('DeleteCourseModal', () => {
  const mockOnClose = vi.fn();
  const mockOnDeleted = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Test case: Course name in confirmation message
   *
   * Scenario:
   * The modal is opened for an existing course.
   *
   * Expected behavior:
   * - The course name is visible in the confirmation message
   */
  it('displays the course name in the confirmation message', () => {
    render(
      <DeleteCourseModal course={mockCourse} onClose={mockOnClose} onDeleted={mockOnDeleted} />
    );

    expect(screen.getByText(/machine learning/i)).toBeInTheDocument();
  });

  /**
   * Test case: Successful delete
   *
   * Scenario:
   * The user clicks the Delete button and the backend responds with success.
   *
   * Expected behavior:
   * - API is called with the correct course id
   * - onDeleted is called with the course id
   */
  it('calls onDeleted with the course id on successful deletion', async () => {
    vi.mocked(api.delete).mockResolvedValueOnce(undefined);

    render(
      <DeleteCourseModal course={mockCourse} onClose={mockOnClose} onDeleted={mockOnDeleted} />
    );

    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/courses/c1');
      expect(mockOnDeleted).toHaveBeenCalledWith('c1');
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
    render(
      <DeleteCourseModal course={mockCourse} onClose={mockOnClose} onDeleted={mockOnDeleted} />
    );

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
    vi.mocked(api.delete).mockRejectedValueOnce(new Error('Failed to delete course'));

    render(
      <DeleteCourseModal course={mockCourse} onClose={mockOnClose} onDeleted={mockOnDeleted} />
    );

    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(screen.getByText(/failed to delete course/i)).toBeInTheDocument();
    });

    expect(mockOnDeleted).not.toHaveBeenCalled();
  });
});
