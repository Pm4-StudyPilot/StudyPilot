import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import EditCourseModal from '../components/courses/EditCourseModal';
import { api } from '../services/api';

/**
 * Mock API service.
 *
 * Prevents real HTTP requests and allows controlled responses
 * for course update requests.
 */
vi.mock('../services/api', () => ({
  api: {
    patch: vi.fn(),
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
 * EditCourseModal component tests.
 *
 * Covered scenarios:
 * - the input is pre-filled with the current course name
 * - successful edit notifies parent with the updated course
 * - validation blocks submission when name is empty
 * - server error is displayed when the request fails
 */
describe('EditCourseModal', () => {
  const mockOnClose = vi.fn();
  const mockOnUpdated = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  /**
   * Test case: Pre-filled input
   *
   * Scenario:
   * The modal is opened for an existing course.
   *
   * Expected behavior:
   * - The input is pre-filled with the current course name
   */
  it('pre-fills the input with the current course name', () => {
    render(<EditCourseModal course={mockCourse} onClose={mockOnClose} onUpdated={mockOnUpdated} />);

    expect(screen.getByLabelText(/course name/i)).toHaveValue('Machine Learning');
  });

  /**
   * Test case: Successful edit
   *
   * Scenario:
   * The user changes the name and submits the form.
   *
   * Expected behavior:
   * - API is called with the updated name
   * - onUpdated is called with the returned course
   */
  it('calls onUpdated with the updated course on successful submission', async () => {
    const updatedCourse = { ...mockCourse, name: 'Advanced Machine Learning' };
    vi.mocked(api.patch).mockResolvedValueOnce(updatedCourse);

    render(<EditCourseModal course={mockCourse} onClose={mockOnClose} onUpdated={mockOnUpdated} />);

    fireEvent.change(screen.getByLabelText(/course name/i), {
      target: { value: 'Advanced Machine Learning' },
    });

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledWith('/courses/c1', { name: 'Advanced Machine Learning' });
      expect(mockOnUpdated).toHaveBeenCalledWith(updatedCourse);
    });
  });

  /**
   * Test case: Empty name validation
   *
   * Scenario:
   * The user clears the name and submits the form.
   *
   * Expected behavior:
   * - Client-side validation blocks the submission
   * - API is not called
   * - Validation error message is displayed
   */
  it('shows a validation error when name is empty', async () => {
    render(<EditCourseModal course={mockCourse} onClose={mockOnClose} onUpdated={mockOnUpdated} />);

    fireEvent.change(screen.getByLabelText(/course name/i), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByText(/course name is required/i)).toBeInTheDocument();
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
    vi.mocked(api.patch).mockRejectedValueOnce(new Error('Failed to update course'));

    render(<EditCourseModal course={mockCourse} onClose={mockOnClose} onUpdated={mockOnUpdated} />);

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(screen.getByText(/failed to update course/i)).toBeInTheDocument();
    });

    expect(mockOnUpdated).not.toHaveBeenCalled();
  });
});
