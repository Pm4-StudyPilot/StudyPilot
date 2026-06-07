import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import DeleteQuizModal from '../components/quizzes/DeleteQuizModal';
import { api } from '../services/api';

vi.mock('../services/api', () => ({
  api: {
    delete: vi.fn(),
  },
}));

const mockQuiz = {
  id: 'quiz-1',
  courseId: 'course-1',
  title: 'European Capitals',
};

/**
 * DeleteQuizModal tests
 *
 * Covered scenarios:
 * - Quiz title is shown in the confirmation message
 * - Successful delete notifies the parent with the quiz id and hits the
 *   correct nested endpoint
 * - Cancel calls onClose and does NOT call the API
 * - A server error is surfaced and onDeleted is not called
 */
describe('DeleteQuizModal', () => {
  const mockOnClose = vi.fn();
  const mockOnDeleted = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('displays the quiz title in the confirmation message', () => {
    render(<DeleteQuizModal quiz={mockQuiz} onClose={mockOnClose} onDeleted={mockOnDeleted} />);

    expect(screen.getByText(/European Capitals/)).toBeInTheDocument();
  });

  it('calls api.delete with the nested course path and onDeleted with the quiz id on success', async () => {
    vi.mocked(api.delete).mockResolvedValueOnce(undefined);

    render(<DeleteQuizModal quiz={mockQuiz} onClose={mockOnClose} onDeleted={mockOnDeleted} />);

    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalledWith('/courses/course-1/quizzes/quiz-1');
      expect(mockOnDeleted).toHaveBeenCalledWith('quiz-1');
    });
  });

  it('calls onClose when cancel is clicked and does not call the API', () => {
    render(<DeleteQuizModal quiz={mockQuiz} onClose={mockOnClose} onDeleted={mockOnDeleted} />);

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(mockOnClose).toHaveBeenCalled();
    expect(api.delete).not.toHaveBeenCalled();
  });

  it('shows an error message and does not notify the parent when the request fails', async () => {
    vi.mocked(api.delete).mockRejectedValueOnce(new Error('Failed to delete quiz'));

    render(<DeleteQuizModal quiz={mockQuiz} onClose={mockOnClose} onDeleted={mockOnDeleted} />);

    fireEvent.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(screen.getByText(/failed to delete quiz/i)).toBeInTheDocument();
    });

    expect(mockOnDeleted).not.toHaveBeenCalled();
  });
});
