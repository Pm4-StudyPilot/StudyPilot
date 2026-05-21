import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import CreateQuizModal from '../components/quizzes/CreateQuizModal';
import { api } from '../services/api';

/**
 * Mock API service.
 *
 * Prevents real HTTP requests and allows controlled responses
 * for quiz creation requests.
 */
vi.mock('../services/api', () => ({
  api: {
    post: vi.fn(),
  },
}));

/**
 * CreateQuizModal component tests.
 *
 * Covered scenarios:
 * - form fields and submit button are rendered
 * - successful quiz creation notifies parent and closes modal
 * - validation blocks submission when title is empty
 * - server error is displayed when the request fails
 */
describe('CreateQuizModal', () => {
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
   * - Title, description and isOrderRandom inputs are displayed
   * - Submit button is displayed
   */
  it('renders all form fields and the submit button', () => {
    render(<CreateQuizModal courseId={courseId} onClose={mockOnClose} onCreated={mockOnCreated} />);

    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/random question order/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create quiz/i })).toBeInTheDocument();
  });

  /**
   * Test case: Successful creation
   *
   * Scenario:
   * A valid quiz title is entered and the backend returns the created quiz.
   *
   * Expected behavior:
   * - API is called with the correct course id and quiz data
   * - onCreated is called with the returned quiz
   */
  it('calls onCreated with the new quiz on successful submission', async () => {
    const newQuiz = {
      id: 'q1',
      title: 'Math quiz',
      description: null,
      isOrderRandom: false,
      courseId: 'c1',
      createdAt: '2026-04-15T12:00:00.000Z',
      updatedAt: '2026-04-15T12:00:00.000Z',
    };

    vi.mocked(api.post).mockResolvedValueOnce(newQuiz);

    render(<CreateQuizModal courseId={courseId} onClose={mockOnClose} onCreated={mockOnCreated} />);

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: 'Math Quiz' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create quiz/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/courses/c1/quizzes',
        expect.objectContaining({ title: 'Math Quiz' })
      );
      expect(mockOnCreated).toHaveBeenCalledWith(newQuiz);
    });
  });

  /**
   * Test case: Empty title validation
   *
   * Scenario:
   * The submit button is clicked without entering a quiz title.
   *
   * Expected behavior:
   * - Client-side validation blocks the submission
   * - API is not called
   * - Validation error message is displayed
   */
  it('shows a validation error when title is empty', async () => {
    render(<CreateQuizModal courseId={courseId} onClose={mockOnClose} onCreated={mockOnCreated} />);

    fireEvent.click(screen.getByRole('button', { name: /create quiz/i }));

    await waitFor(() => {
      expect(screen.getByText(/quiz title is required/i)).toBeInTheDocument();
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
    vi.mocked(api.post).mockRejectedValueOnce(new Error('Failed to create quiz'));

    render(<CreateQuizModal courseId={courseId} onClose={mockOnClose} onCreated={mockOnCreated} />);

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: 'Advanced Math Quiz' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create quiz/i }));

    await waitFor(() => {
      expect(screen.getByText(/failed to create quiz/i)).toBeInTheDocument();
    });

    expect(mockOnCreated).not.toHaveBeenCalled();
  });
  /**
   * Test case: Description and random order payload
   *
   * Scenario:
   * The user enters a description and enables random question order.
   *
   * Expected behavior:
   * - API payload includes trimmed description
   * - API payload includes isOrderRandom = true
   */
  it('submits description and random question order correctly', async () => {
    const newQuiz = {
      id: 'q2',
      title: 'Science Quiz',
      description: 'Physics questions',
      isOrderRandom: true,
      courseId: 'c1',
      createdAt: '2026-04-15T12:00:00.000Z',
      updatedAt: '2026-04-15T12:00:00.000Z',
    };

    vi.mocked(api.post).mockResolvedValueOnce(newQuiz);

    render(<CreateQuizModal courseId={courseId} onClose={mockOnClose} onCreated={mockOnCreated} />);

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: 'Science Quiz' },
    });

    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: '   Physics questions   ' },
    });

    fireEvent.click(screen.getByLabelText(/random question order/i));

    fireEvent.click(screen.getByRole('button', { name: /create quiz/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/courses/c1/quizzes', {
        title: 'Science Quiz',
        description: 'Physics questions',
        isOrderRandom: true,
      });
    });
  });

  /**
   * Test case: Empty description omission
   *
   * Scenario:
   * The description contains only whitespace.
   *
   * Expected behavior:
   * - API payload does not include description
   */
  it('omits description from payload when it is empty after trimming', async () => {
    const newQuiz = {
      id: 'q3',
      title: 'History Quiz',
      description: null,
      isOrderRandom: false,
      courseId: 'c1',
      createdAt: '2026-04-15T12:00:00.000Z',
      updatedAt: '2026-04-15T12:00:00.000Z',
    };

    vi.mocked(api.post).mockResolvedValueOnce(newQuiz);

    render(<CreateQuizModal courseId={courseId} onClose={mockOnClose} onCreated={mockOnCreated} />);

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: 'History Quiz' },
    });

    fireEvent.change(screen.getByLabelText(/description/i), {
      target: { value: '     ' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create quiz/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/courses/c1/quizzes', {
        title: 'History Quiz',
        isOrderRandom: false,
      });
    });
  });
});
