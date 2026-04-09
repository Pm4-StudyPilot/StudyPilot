import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import CreateCourseModal from '../components/courses/CreateCourseModal';
import { api } from '../services/api';

/**
 * Mock API service.
 *
 * Prevents real HTTP requests and allows controlled responses
 * for course creation requests.
 */
vi.mock('../services/api', () => ({
  api: {
    post: vi.fn(),
  },
}));

/**
 * CreateCourseModal component tests.
 *
 * Covered scenarios:
 * - form fields and submit button are rendered
 * - successful course creation notifies parent and closes modal
 * - validation blocks submission when name is empty
 * - server error is displayed when the request fails
 */
describe('CreateCourseModal', () => {
  const mockOnClose = vi.fn();
  const mockOnCreated = vi.fn();

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
   * - Course name input is displayed
   * - Submit button is displayed
   */
  it('renders the course name input and submit button', () => {
    render(<CreateCourseModal onClose={mockOnClose} onCreated={mockOnCreated} />);

    expect(screen.getByLabelText(/course name/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create course/i })).toBeInTheDocument();
  });

  /**
   * Test case: Successful creation
   *
   * Scenario:
   * A valid course name is entered and the backend returns the created course.
   *
   * Expected behavior:
   * - API is called with the course name
   * - onCreated is called with the returned course
   */
  it('calls onCreated with the new course on successful submission', async () => {
    const newCourse = {
      id: 'c1',
      name: 'Machine Learning',
      ownerId: 'u1',
      createdAt: '2026-03-26T12:00:00.000Z',
      updatedAt: '2026-03-26T12:00:00.000Z',
    };

    vi.mocked(api.post).mockResolvedValueOnce(newCourse);

    render(<CreateCourseModal onClose={mockOnClose} onCreated={mockOnCreated} />);

    fireEvent.change(screen.getByLabelText(/course name/i), {
      target: { value: 'Machine Learning' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create course/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/courses', { name: 'Machine Learning' });
      expect(mockOnCreated).toHaveBeenCalledWith(newCourse);
    });
  });

  /**
   * Test case: Empty name validation
   *
   * Scenario:
   * The submit button is clicked without entering a course name.
   *
   * Expected behavior:
   * - Client-side validation blocks the submission
   * - API is not called
   * - Validation error message is displayed
   */
  it('shows a validation error when name is empty', async () => {
    render(<CreateCourseModal onClose={mockOnClose} onCreated={mockOnCreated} />);

    fireEvent.click(screen.getByRole('button', { name: /create course/i }));

    await waitFor(() => {
      expect(screen.getByText(/course name is required/i)).toBeInTheDocument();
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
    vi.mocked(api.post).mockRejectedValueOnce(new Error('Failed to create course'));

    render(<CreateCourseModal onClose={mockOnClose} onCreated={mockOnCreated} />);

    fireEvent.change(screen.getByLabelText(/course name/i), {
      target: { value: 'Biology' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create course/i }));

    await waitFor(() => {
      expect(screen.getByText(/failed to create course/i)).toBeInTheDocument();
    });

    expect(mockOnCreated).not.toHaveBeenCalled();
  });
});
