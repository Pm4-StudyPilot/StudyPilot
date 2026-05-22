import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup, within, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import QuizDetailPage from '../pages/QuizDetailPage';
import { api } from '../services/api';
import { QuestionWithAnswersDto } from '../types/dto';

/**
 * Mock API service
 */
vi.mock('../services/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

/**
 * Mock AuthContext (used by DashboardLayout)
 */
vi.mock('../context/useAuth', () => ({
  useAuth: () => ({
    user: { username: 'testuser', email: 'test@example.com' },
    logout: vi.fn(),
  }),
}));

/**
 * Mock DeleteQuizModal — isolates QuizDetailPage from the modal internals.
 *
 * Exposes two buttons:
 * - "Confirm delete in modal" → triggers onDeleted (success path)
 * - "Close modal" → triggers onClose (cancel path)
 *
 * Visibility of these buttons in the rendered tree is the proof that the
 * modal is open.
 */
vi.mock('../components/quizzes/DeleteQuizModal.tsx', () => ({
  default: ({
    quiz,
    onClose,
    onDeleted,
  }: {
    quiz: { id: string; courseId: string; title: string };
    onClose: () => void;
    onDeleted: (id: string) => void;
  }) => (
    <div data-testid="delete-quiz-modal">
      <span>About to delete: {quiz.title}</span>
      <button onClick={() => onDeleted(quiz.id)}>Confirm delete in modal</button>
      <button onClick={onClose}>Close modal</button>
    </div>
  ),
}));

/**
 * Mock QuestionList (IMPORTANT: isolates QuizDetailPage behavior)
 *
 * Behavior:
 * - Always shows question titles
 * - Shows answers ONLY in edit mode
 * - Shows empty state when no questions exist
 */
vi.mock('../components/quizzes/QuestionList.tsx', () => ({
  default: ({
    questions,
    editable,
    onCreateQuestion,
    onUpdateQuestion,
    onDeleteQuestion,
    onCreateAnswer,
    onUpdateAnswer,
    onDeleteAnswer,
  }: {
    questions: QuestionWithAnswersDto[];
    editable?: boolean;
    onCreateQuestion?: (data: NewQuestionFormState) => Promise<void> | void;
    onUpdateQuestion?: (questionId: string, data: NewQuestionFormState) => Promise<void> | void;
    onDeleteQuestion?: (questionId: string) => Promise<void> | void;
    onCreateAnswer?: (
      questionId: string,
      data: { content: string; isCorrect: boolean }
    ) => Promise<void> | void;
    onUpdateAnswer?: (
      questionId: string,
      answerId: string,
      data: { content: string; isCorrect: boolean }
    ) => Promise<void> | void;
    onDeleteAnswer?: (questionId: string, answerId: string) => Promise<void> | void;
  }) => {
    return (
      <div>
        <button
          onClick={() =>
            onCreateQuestion?.({
              title: 'New Question',
              description: 'New Desc',
              type: 'SINGLE_CHOICE',
            })
          }
        >
          Add Question
        </button>

        {questions?.length === 0 && <div>No questions yet</div>}

        {questions?.map((q: QuestionWithAnswersDto) => (
          <div key={q.id}>
            <div>{q.title}</div>

            <button
              onClick={() =>
                onUpdateQuestion?.(q.id, {
                  title: q.title + ' (updated)',
                  description: q.description || '',
                  type: q.type,
                })
              }
            >
              Update Question
            </button>

            <button onClick={() => onDeleteQuestion?.(q.id)}>Delete Question</button>

            {editable && (
              <div>
                <button
                  onClick={() =>
                    onCreateAnswer?.(q.id, {
                      content: 'New Answer',
                      isCorrect: false,
                    })
                  }
                >
                  Add Answer
                </button>

                {q.answers?.map((a: QuestionWithAnswersDto) => (
                  <div key={a.id}>
                    {a.content}

                    <button
                      onClick={() =>
                        onUpdateAnswer?.(q.id, a.id, {
                          content: a.content + ' (updated)',
                          isCorrect: a.isCorrect,
                        })
                      }
                    >
                      Update Answer
                    </button>

                    <button onClick={() => onDeleteAnswer?.(q.id, a.id)}>Delete Answer</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  },
}));

const quizFixture = {
  id: 'quiz-1',
  title: 'European Capitals',
  description: 'Practice capital cities across Europe.',
  isOrderRandom: true,
  courseId: 'course-1',
  createdAt: '2026-05-01T12:00:00.000Z',
  updatedAt: '2026-05-02T12:00:00.000Z',
};

const questionFixtures = [
  {
    id: 'question-1',
    title: 'What is the capital of France?',
    description: 'Choose the correct capital city.',
    type: 'SINGLE_CHOICE',
    quizId: 'quiz-1',
    createdAt: '2026-05-01T12:00:00.000Z',
    updatedAt: '2026-05-01T12:00:00.000Z',
    answers: [
      { id: 'answer-1', content: 'Paris', isCorrect: true },
      { id: 'answer-2', content: 'Berlin', isCorrect: false },
    ],
  },
  {
    id: 'question-2',
    title: 'What is the capital of Spain?',
    description: null,
    type: 'SINGLE_CHOICE',
    quizId: 'quiz-1',
    createdAt: '2026-05-01T12:00:00.000Z',
    updatedAt: '2026-05-01T12:00:00.000Z',
    answers: [{ id: 'answer-3', content: 'Madrid', isCorrect: true }],
  },
];

function renderWithRoute(courseId = 'course-1', quizId = 'quiz-1') {
  return render(
    <MemoryRouter initialEntries={[`/courses/${courseId}/quizzes/${quizId}`]}>
      <Routes>
        <Route path="/courses/:courseId/quizzes/:quizId" element={<QuizDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
}

function mockQuizDetailApi({
  quiz = quizFixture,
  questions = questionFixtures,
}: {
  quiz?: typeof quizFixture;
  questions?: typeof questionFixtures;
} = {}) {
  vi.mocked(api.get).mockImplementation((url: string) => {
    if (url === '/courses/course-1/quizzes/quiz-1') {
      return Promise.resolve(quiz);
    }

    if (url === '/courses/course-1/quizzes/quiz-1/questions') {
      return Promise.resolve(questions);
    }

    return Promise.resolve([]);
  });
}

describe('QuizDetailPage', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it('shows a loading spinner while fetching', () => {
    vi.mocked(api.get).mockReturnValue(new Promise(() => {}));
    renderWithRoute();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders quiz details after a successful fetch', async () => {
    mockQuizDetailApi();
    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText('European Capitals')).toBeInTheDocument();
      expect(screen.getByText('Practice capital cities across Europe.')).toBeInTheDocument();
      expect(screen.getByText('Randomized question order')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
    expect(screen.getByText(/Updated May 2, 2026/i)).toBeInTheDocument();
  });

  it('renders calculated quiz stats', async () => {
    mockQuizDetailApi();
    renderWithRoute();

    const summary = await screen.findByLabelText('Quiz summary');

    const questionStat = within(summary).getByText('Questions').closest('.quiz-detail__stat');
    const answerStat = within(summary).getByText('Answers').closest('.quiz-detail__stat');
    const correctStat = within(summary).getByText('Correct').closest('.quiz-detail__stat');

    expect(within(questionStat!).getByText('2')).toBeInTheDocument();
    expect(within(answerStat!).getByText('3')).toBeInTheDocument();
    expect(within(correctStat!).getByText('2')).toBeInTheDocument();
  });

  it('renders questions in view mode WITHOUT showing answers', async () => {
    mockQuizDetailApi();
    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();
      expect(screen.getByText('What is the capital of Spain?')).toBeInTheDocument();
    });

    // answers must NOT be visible in view mode
    expect(screen.queryByText('Paris')).not.toBeInTheDocument();
    expect(screen.queryByText('Berlin')).not.toBeInTheDocument();
    expect(screen.queryByText('Madrid')).not.toBeInTheDocument();
  });

  it('toggles edit mode and shows answers', async () => {
    mockQuizDetailApi();
    renderWithRoute();

    const editButton = await screen.findByRole('button', { name: /edit/i });

    fireEvent.click(editButton);

    expect(await screen.findByText('Paris')).toBeInTheDocument();
    expect(screen.getByText('Berlin')).toBeInTheDocument();
    expect(screen.getByText('Madrid')).toBeInTheDocument();
  });

  it('renders empty question state', async () => {
    mockQuizDetailApi({ questions: [] });
    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText('No questions yet')).toBeInTheDocument();
    });

    expect(screen.getByText('0 items')).toBeInTheDocument();
  });

  it('shows error when quiz fetch fails', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/courses/course-1/quizzes/quiz-1') {
        return Promise.reject(new Error('Failed to load quiz'));
      }
      return Promise.resolve(questionFixtures);
    });

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText('Failed to load quiz')).toBeInTheDocument();
    });
  });

  it('shows fallback error for non-error rejection', async () => {
    vi.mocked(api.get).mockImplementation((url: string) => {
      if (url === '/courses/course-1/quizzes/quiz-1') {
        return Promise.reject('Unexpected failure');
      }
      return Promise.resolve(questionFixtures);
    });

    renderWithRoute();

    await waitFor(() => {
      expect(screen.getByText('Failed to load quiz')).toBeInTheDocument();
    });
  });

  it('links back to course page', async () => {
    mockQuizDetailApi();
    renderWithRoute();

    const backLink = screen.getByRole('link', { name: /back to course/i });

    expect(backLink).toHaveAttribute('href', '/courses/course-1');
  });
  it('creates a new question', async () => {
    mockQuizDetailApi();

    vi.mocked(api.post).mockResolvedValue({
      id: 'question-new',
      title: 'New Question',
      description: 'New Desc',
      type: 'SINGLE_CHOICE',
      answers: [],
    });

    renderWithRoute();

    const addBtn = await screen.findByText('Add Question');
    addBtn.click();

    await waitFor(() => {
      expect(api.post).toHaveBeenCalled();
      expect(screen.getByText('New Question')).toBeInTheDocument();
    });
  });
  it('updates a question', async () => {
    mockQuizDetailApi();

    vi.mocked(api.patch).mockResolvedValue({
      id: 'question-1',
      title: 'Updated Title',
      description: 'Choose the correct capital city.',
      type: 'SINGLE_CHOICE',
      answers: questionFixtures[0].answers,
    });

    renderWithRoute();

    const updateBtn = await screen.findAllByText('Update Question');
    updateBtn[0].click();

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalled();
      expect(screen.getByText('Updated Title')).toBeInTheDocument();
    });
  });
  it('deletes a question', async () => {
    mockQuizDetailApi();

    vi.mocked(api.delete).mockResolvedValue(undefined);

    renderWithRoute();

    const deleteBtn = await screen.findAllByText('Delete Question');
    deleteBtn[0].click();

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalled();
    });
  });
  it('creates an answer for a question', async () => {
    mockQuizDetailApi();

    vi.mocked(api.post).mockResolvedValue({
      id: 'answer-new',
      content: 'New Answer',
      isCorrect: false,
    });

    renderWithRoute();

    const editBtn = await screen.findByRole('button', { name: /edit/i });
    editBtn.click();

    const addAnswerBtn = await screen.findAllByText('Add Answer');
    addAnswerBtn[0].click();

    await waitFor(() => {
      expect(api.post).toHaveBeenCalled();
      expect(screen.getByText('New Answer')).toBeInTheDocument();
    });
  });
  it('updates an answer', async () => {
    mockQuizDetailApi();

    vi.mocked(api.patch).mockResolvedValue({
      id: 'answer-1',
      content: 'Paris (updated)',
      isCorrect: true,
    });

    renderWithRoute();

    const editBtn = await screen.findByRole('button', { name: /edit/i });
    editBtn.click();

    const updateBtns = await screen.findAllByText('Update Answer');
    updateBtns[0].click();

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalled();
      expect(screen.getByText('Paris (updated)')).toBeInTheDocument();
    });
  });
  it('deletes an answer', async () => {
    mockQuizDetailApi();

    vi.mocked(api.delete).mockResolvedValue(undefined);

    renderWithRoute();

    const editBtn = await screen.findByRole('button', { name: /edit/i });
    editBtn.click();

    const deleteBtns = await screen.findAllByText('Delete Answer');
    deleteBtns[0].click();

    await waitFor(() => {
      expect(api.delete).toHaveBeenCalled();
    });
  });

  /**
   * Edit Quiz (KAN-149) tests
   *
   * Covers the inline editor for the quiz-level fields (title, description,
   * isOrderRandom) that appears when edit mode is toggled on. Editing uses
   * auto-save: text fields persist on blur, the checkbox persists on change.
   */
  describe('edit quiz', () => {
    it('pre-fills the editor with the loaded quiz when entering edit mode', async () => {
      mockQuizDetailApi();
      renderWithRoute();

      const editBtn = await screen.findByRole('button', { name: /edit/i });
      fireEvent.click(editBtn);

      const titleInput = await screen.findByLabelText('Quiz title');
      const descriptionInput = screen.getByLabelText('Quiz description');
      const randomCheckbox = screen.getByLabelText(/randomize question order/i);

      expect(titleInput).toHaveValue(quizFixture.title);
      expect(descriptionInput).toHaveValue(quizFixture.description);
      expect(randomCheckbox).toBeChecked();
    });

    it('saves the title on blur when it changes', async () => {
      mockQuizDetailApi();
      vi.mocked(api.patch).mockResolvedValue({
        ...quizFixture,
        title: 'Updated Quiz Title',
      });

      renderWithRoute();

      const editBtn = await screen.findByRole('button', { name: /edit/i });
      fireEvent.click(editBtn);

      const titleInput = await screen.findByLabelText('Quiz title');
      fireEvent.change(titleInput, { target: { value: 'Updated Quiz Title' } });
      fireEvent.blur(titleInput);

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith('/courses/course-1/quizzes/quiz-1', {
          title: 'Updated Quiz Title',
        });
      });
    });

    it('does not call the API on blur when the title is unchanged', async () => {
      mockQuizDetailApi();
      renderWithRoute();

      const editBtn = await screen.findByRole('button', { name: /edit/i });
      fireEvent.click(editBtn);

      const titleInput = await screen.findByLabelText('Quiz title');
      fireEvent.blur(titleInput);

      // Patch should not have been called — value unchanged, so no save needed
      expect(api.patch).not.toHaveBeenCalled();
    });

    it('shows an error and skips the API when the title is emptied', async () => {
      mockQuizDetailApi();
      renderWithRoute();

      const editBtn = await screen.findByRole('button', { name: /edit/i });
      fireEvent.click(editBtn);

      const titleInput = await screen.findByLabelText('Quiz title');
      fireEvent.change(titleInput, { target: { value: '   ' } });
      fireEvent.blur(titleInput);

      expect(await screen.findByText(/quiz title is required/i)).toBeInTheDocument();
      expect(api.patch).not.toHaveBeenCalled();
    });

    it('saves the description on blur when it changes', async () => {
      mockQuizDetailApi();
      vi.mocked(api.patch).mockResolvedValue({
        ...quizFixture,
        description: 'A new description.',
      });

      renderWithRoute();

      const editBtn = await screen.findByRole('button', { name: /edit/i });
      fireEvent.click(editBtn);

      const descriptionInput = await screen.findByLabelText('Quiz description');
      fireEvent.change(descriptionInput, { target: { value: 'A new description.' } });
      fireEvent.blur(descriptionInput);

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith('/courses/course-1/quizzes/quiz-1', {
          description: 'A new description.',
        });
      });
    });

    it('persists the randomize-order toggle immediately on change', async () => {
      mockQuizDetailApi();
      vi.mocked(api.patch).mockResolvedValue({
        ...quizFixture,
        isOrderRandom: false,
      });

      renderWithRoute();

      const editBtn = await screen.findByRole('button', { name: /edit/i });
      fireEvent.click(editBtn);

      const randomCheckbox = await screen.findByLabelText(/randomize question order/i);
      fireEvent.click(randomCheckbox);

      await waitFor(() => {
        expect(api.patch).toHaveBeenCalledWith('/courses/course-1/quizzes/quiz-1', {
          isOrderRandom: false,
        });
      });
    });

    it('shows a server error when the save fails', async () => {
      mockQuizDetailApi();
      vi.mocked(api.patch).mockRejectedValueOnce(
        new Error('You do not have permission to edit this quiz.')
      );

      renderWithRoute();

      const editBtn = await screen.findByRole('button', { name: /edit/i });
      fireEvent.click(editBtn);

      const titleInput = await screen.findByLabelText('Quiz title');
      fireEvent.change(titleInput, { target: { value: 'New Title' } });
      fireEvent.blur(titleInput);

      expect(
        await screen.findByText(/you do not have permission to edit this quiz/i)
      ).toBeInTheDocument();
    });

    it('disables the play button while in edit mode', async () => {
      mockQuizDetailApi();
      renderWithRoute();

      const playBeforeEdit = await screen.findByRole('button', { name: /play/i });
      expect(playBeforeEdit).not.toBeDisabled();

      const editBtn = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editBtn);

      expect(screen.getByRole('button', { name: /play/i })).toBeDisabled();
    });
  });

  /**
   * Delete Quiz (KAN-150) tests
   *
   * Covers the integration between the Delete button, the confirmation
   * modal (mocked above), and the post-delete navigation back to the
   * parent course page.
   */
  describe('delete quiz', () => {
    it('does not render the delete modal until the Delete button is clicked', async () => {
      mockQuizDetailApi();
      renderWithRoute();

      await screen.findByRole('button', { name: /delete quiz/i });
      expect(screen.queryByTestId('delete-quiz-modal')).not.toBeInTheDocument();
    });

    it('opens the delete modal when the Delete button is clicked', async () => {
      mockQuizDetailApi();
      renderWithRoute();

      const deleteBtn = await screen.findByRole('button', { name: /delete quiz/i });
      fireEvent.click(deleteBtn);

      expect(screen.getByTestId('delete-quiz-modal')).toBeInTheDocument();
      expect(screen.getByText(/About to delete: European Capitals/)).toBeInTheDocument();
    });

    it('closes the modal when the user cancels', async () => {
      mockQuizDetailApi();
      renderWithRoute();

      const deleteBtn = await screen.findByRole('button', { name: /delete quiz/i });
      fireEvent.click(deleteBtn);

      fireEvent.click(screen.getByText('Close modal'));

      expect(screen.queryByTestId('delete-quiz-modal')).not.toBeInTheDocument();
    });

    it('navigates back to the course page after a successful delete', async () => {
      mockQuizDetailApi();

      // Render with a sibling route so we can assert navigation happened
      render(
        <MemoryRouter initialEntries={['/courses/course-1/quizzes/quiz-1']}>
          <Routes>
            <Route path="/courses/:courseId/quizzes/:quizId" element={<QuizDetailPage />} />
            <Route
              path="/courses/:courseId"
              element={<div data-testid="course-page">Course page</div>}
            />
          </Routes>
        </MemoryRouter>
      );

      const deleteBtn = await screen.findByRole('button', { name: /delete quiz/i });
      fireEvent.click(deleteBtn);

      fireEvent.click(screen.getByText('Confirm delete in modal'));

      await waitFor(() => {
        expect(screen.getByTestId('course-page')).toBeInTheDocument();
      });
    });
  });
});
