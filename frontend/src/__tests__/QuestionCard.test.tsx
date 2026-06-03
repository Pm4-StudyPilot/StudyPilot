import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import QuestionCard from '../components/quizzes/QuestionCard';
import { QuestionWithAnswersDto } from '../types/dto';
import { QuestionFormState } from '../components/quizzes/types.ts';
import userEvent from '@testing-library/user-event';

const mockUpdateQuestion = vi.fn();
const mockDeleteQuestion = vi.fn();
const mockCreateAnswer = vi.fn();
const mockUpdateAnswer = vi.fn();
const mockDeleteAnswer = vi.fn();
const mockOnPlay = vi.fn();
const mockReorderQuestion = vi.fn();

const questionFixture: QuestionWithAnswersDto = {
  id: 'question-1',
  title: 'What is the capital of France?',
  description: 'Choose the correct capital city.',
  type: 'MULTIPLE_CHOICE',
  quizId: 'quiz-1',
  createdAt: '2026-05-01T12:00:00.000Z',
  updatedAt: '2026-05-01T12:00:00.000Z',
  answers: [
    {
      id: 'answer-1',
      content: 'Paris',
      isCorrect: true,
      questionId: 'question-1',
      createdAt: '2026-05-01T12:00:00.000Z',
      updatedAt: '2026-05-01T12:00:00.000Z',
    },
    {
      id: 'answer-2',
      content: 'Berlin',
      isCorrect: false,
      questionId: 'question-1',
      createdAt: '2026-05-01T12:00:00.000Z',
      updatedAt: '2026-05-01T12:00:00.000Z',
    },
  ],
};
const oneAnswerQuestionFixture: QuestionWithAnswersDto = {
  id: 'question-1',
  title: 'What is the capital of France?',
  description: 'Choose the correct capital city.',
  type: 'MULTIPLE_CHOICE',
  quizId: 'quiz-1',
  createdAt: '2026-05-01T12:00:00.000Z',
  updatedAt: '2026-05-01T12:00:00.000Z',
  answers: [
    {
      id: 'answer-2',
      content: 'Berlin',
      isCorrect: false,
      questionId: 'question-1',
      createdAt: '2026-05-01T12:00:00.000Z',
      updatedAt: '2026-05-01T12:00:00.000Z',
    },
  ],
};
const noAnswerQuestionFixture: QuestionWithAnswersDto = {
  id: 'question-1',
  title: 'What is the capital of France?',
  description: 'Choose the correct capital city.',
  type: 'MULTIPLE_CHOICE',
  quizId: 'quiz-1',
  createdAt: '2026-05-01T12:00:00.000Z',
  updatedAt: '2026-05-01T12:00:00.000Z',
  answers: [],
};
describe('QuestionCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the question title, description, and formatted type', () => {
    render(<QuestionCard question={questionFixture} />);

    expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();
    expect(screen.getByText('Choose the correct capital city.')).toBeInTheDocument();
    expect(screen.getByText('Multiple Choice')).toBeInTheDocument();
  });

  it('renders answer statistics correctly', () => {
    render(<QuestionCard question={questionFixture} />);

    expect(screen.getByText('2 answers')).toBeInTheDocument();
    expect(screen.getByText('1 correct answer')).toBeInTheDocument();
  });

  it('does not render description when missing', () => {
    render(
      <QuestionCard
        question={{
          ...questionFixture,
          description: null,
        }}
      />
    );

    expect(screen.queryByText('Choose the correct capital city.')).not.toBeInTheDocument();
  });
  it('renders edit mode UI and allows question update', async () => {
    render(
      <QuestionCard
        question={questionFixture}
        mode="edit"
        onUpdateQuestion={mockUpdateQuestion}
        onDeleteQuestion={mockDeleteQuestion}
        onCreateAnswer={mockCreateAnswer}
        onUpdateAnswer={mockUpdateAnswer}
        onDeleteAnswer={mockDeleteAnswer}
        onReorderQuestion={mockReorderQuestion}
        canMoveUp={true}
        canMoveDown={true}
      />
    );

    // title input exists
    expect(screen.getByDisplayValue('What is the capital of France?')).toBeInTheDocument();

    // trigger blur -> save
    fireEvent.blur(screen.getByDisplayValue('What is the capital of France?'));

    expect(mockUpdateQuestion).toHaveBeenCalled();
  });
  it('shows validation error when saving empty question title', async () => {
    render(
      <QuestionCard
        question={questionFixture}
        mode="edit"
        onDeleteQuestion={mockDeleteQuestion}
        onUpdateQuestion={mockUpdateQuestion}
        onCreateAnswer={mockCreateAnswer}
        onDeleteAnswer={mockDeleteAnswer}
        onUpdateAnswer={mockUpdateAnswer}
        onReorderQuestion={mockReorderQuestion}
        canMoveUp={true}
        canMoveDown={true}
      />
    );

    const input = screen.getByDisplayValue('What is the capital of France?');

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);

    expect(await screen.findByText('Question title is required')).toBeInTheDocument();
  });
  it('enables add answer button only when input has content', () => {
    render(
      <QuestionCard
        question={questionFixture}
        mode="edit"
        onDeleteQuestion={mockDeleteQuestion}
        onUpdateQuestion={mockUpdateQuestion}
        onCreateAnswer={mockCreateAnswer}
        onDeleteAnswer={mockDeleteAnswer}
        onUpdateAnswer={mockUpdateAnswer}
        onReorderQuestion={mockReorderQuestion}
        canMoveUp={true}
        canMoveDown={true}
      />
    );

    const input = screen.getByPlaceholderText('Add another possible answer');
    const button = screen.getByRole('button', { name: /add answer/i });

    expect(button).toBeDisabled();

    fireEvent.change(input, { target: { value: 'Paris' } });

    expect(button).toBeEnabled();
  });
  it('calls delete question handler', () => {
    render(
      <QuestionCard
        question={noAnswerQuestionFixture}
        mode="edit"
        onDeleteQuestion={mockDeleteQuestion}
        onUpdateQuestion={mockUpdateQuestion}
        onCreateAnswer={mockCreateAnswer}
        onDeleteAnswer={mockDeleteAnswer}
        onUpdateAnswer={mockUpdateAnswer}
        onReorderQuestion={mockReorderQuestion}
        canMoveUp={true}
        canMoveDown={true}
      />
    );

    fireEvent.click(screen.getByText('Delete'));

    expect(mockDeleteQuestion).toHaveBeenCalledWith('question-1');
  });
  it('renders play mode correctly', () => {
    render(<QuestionCard question={questionFixture} mode="play" onPlayed={mockOnPlay} />);

    expect(screen.getByText('Multiple Choice')).toBeInTheDocument();
    expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();
  });
  it('keeps add answer button disabled for whitespace-only input', () => {
    render(
      <QuestionCard
        question={questionFixture}
        mode="edit"
        onDeleteQuestion={mockDeleteQuestion}
        onUpdateQuestion={mockUpdateQuestion}
        onCreateAnswer={mockCreateAnswer}
        onDeleteAnswer={mockDeleteAnswer}
        onUpdateAnswer={mockUpdateAnswer}
        onReorderQuestion={mockReorderQuestion}
        canMoveUp={true}
        canMoveDown={true}
      />
    );

    const input = screen.getByPlaceholderText('Add another possible answer');
    const button = screen.getByRole('button', { name: /add answer/i });

    fireEvent.change(input, { target: { value: '   ' } });

    expect(button).toBeDisabled();
  });
  it('shows error when question update fails', async () => {
    const failingUpdate = vi.fn().mockRejectedValue(new Error('Some fail message'));

    render(
      <QuestionCard
        question={questionFixture}
        mode="edit"
        onDeleteQuestion={mockDeleteQuestion}
        onUpdateQuestion={failingUpdate}
        onCreateAnswer={mockCreateAnswer}
        onDeleteAnswer={mockDeleteAnswer}
        onUpdateAnswer={mockUpdateAnswer}
        onReorderQuestion={mockReorderQuestion}
        canMoveUp={true}
        canMoveDown={true}
      />
    );

    fireEvent.blur(screen.getByDisplayValue(questionFixture.title));

    expect(await screen.findByText('Some fail message')).toBeInTheDocument();
  });
  it('shows error when creating answer fails', async () => {
    const failingCreate = vi.fn().mockRejectedValue(new Error('fail'));

    render(
      <QuestionCard
        question={questionFixture}
        mode="edit"
        onDeleteQuestion={mockDeleteQuestion}
        onUpdateQuestion={mockUpdateQuestion}
        onCreateAnswer={failingCreate}
        onDeleteAnswer={mockDeleteAnswer}
        onUpdateAnswer={mockUpdateAnswer}
        onReorderQuestion={mockReorderQuestion}
        canMoveUp={true}
        canMoveDown={true}
      />
    );

    const input = screen.getByPlaceholderText('Add another possible answer');
    fireEvent.change(input, { target: { value: 'Rome' } });

    fireEvent.click(screen.getByText('Add answer'));

    expect(await screen.findByText('Failed to create question')).toBeInTheDocument();
  });
  it('shows saving indicator during question update', async () => {
    let resolve = () => {};
    const slowUpdate = new Promise<void>((res) => (resolve = res));

    const onUpdate = (questionId: string, data: QuestionFormState) => {
      data.title = 'test' + questionId;
      return slowUpdate;
    };

    render(
      <QuestionCard
        question={questionFixture}
        mode="edit"
        onDeleteQuestion={mockDeleteQuestion}
        onUpdateQuestion={onUpdate}
        onCreateAnswer={mockCreateAnswer}
        onDeleteAnswer={mockDeleteAnswer}
        onUpdateAnswer={mockUpdateAnswer}
        onReorderQuestion={mockReorderQuestion}
        canMoveUp={true}
        canMoveDown={true}
      />
    );

    fireEvent.blur(screen.getByDisplayValue(questionFixture.title));

    expect(screen.getByText('Saving...')).toBeInTheDocument();

    await act(async () => {
      resolve();
    });
  });
  it('toggles answers open and closed', () => {
    render(
      <QuestionCard
        question={questionFixture}
        onDeleteQuestion={mockDeleteQuestion}
        onUpdateQuestion={mockUpdateQuestion}
        onCreateAnswer={mockCreateAnswer}
        onDeleteAnswer={mockDeleteAnswer}
        onUpdateAnswer={mockUpdateAnswer}
        onReorderQuestion={mockReorderQuestion}
        canMoveUp={true}
        canMoveDown={true}
      />
    );

    const button = screen.getByRole('button', { name: /toggle answers/i });

    fireEvent.click(button);
    expect(screen.getByTestId('answer-list')).toBeInTheDocument();

    fireEvent.click(button);
    expect(screen.queryByTestId('answer-list')).not.toBeInTheDocument();
  });
  it('does not render AnswerList when no answers exist', () => {
    render(
      <QuestionCard
        question={{ ...questionFixture, answers: [] }}
        mode="edit"
        onDeleteQuestion={mockDeleteQuestion}
        onUpdateQuestion={mockUpdateQuestion}
        onCreateAnswer={mockCreateAnswer}
        onDeleteAnswer={mockDeleteAnswer}
        onUpdateAnswer={mockUpdateAnswer}
        onReorderQuestion={mockReorderQuestion}
        canMoveUp={true}
        canMoveDown={true}
      />
    );

    expect(screen.queryByTestId('answer-list')).not.toBeInTheDocument();
  });
  it('calls update question and clears saving state', async () => {
    const updateMock = vi.fn().mockResolvedValueOnce(undefined);

    render(
      <QuestionCard
        question={questionFixture}
        mode="edit"
        onDeleteQuestion={mockDeleteQuestion}
        onUpdateQuestion={updateMock}
        onCreateAnswer={mockCreateAnswer}
        onDeleteAnswer={mockDeleteAnswer}
        onUpdateAnswer={mockUpdateAnswer}
        onReorderQuestion={mockReorderQuestion}
        canMoveUp={true}
        canMoveDown={true}
      />
    );

    fireEvent.blur(screen.getByDisplayValue(questionFixture.title));

    expect(updateMock).toHaveBeenCalledWith(
      'question-1',
      expect.objectContaining({
        title: 'What is the capital of France?',
      })
    );

    // wait until saving indicator disappears
    await waitFor(() => {
      expect(screen.queryByText('Saving...')).not.toBeInTheDocument();
    });
  });
  it('creates answer and clears input field', async () => {
    const createMock = vi.fn().mockResolvedValueOnce(undefined);

    render(
      <QuestionCard
        question={questionFixture}
        mode="edit"
        onDeleteQuestion={mockDeleteQuestion}
        onUpdateQuestion={mockUpdateQuestion}
        onCreateAnswer={createMock}
        onDeleteAnswer={mockDeleteAnswer}
        onUpdateAnswer={mockUpdateAnswer}
        onReorderQuestion={mockReorderQuestion}
        canMoveUp={true}
        canMoveDown={true}
      />
    );

    const input = screen.getByPlaceholderText('Add another possible answer');

    fireEvent.change(input, { target: { value: 'Rome' } });
    fireEvent.click(screen.getByText('Add answer'));

    expect(createMock).toHaveBeenCalledWith('question-1', {
      content: 'Rome',
      isCorrect: false,
    });

    await waitFor(() => {
      expect(input).toHaveValue('');
    });
  });
  it('prevents saving answer with whitespace content', async () => {
    render(
      <QuestionCard
        question={questionFixture}
        mode="edit"
        onDeleteQuestion={mockDeleteQuestion}
        onUpdateQuestion={mockUpdateQuestion}
        onCreateAnswer={mockCreateAnswer}
        onDeleteAnswer={mockDeleteAnswer}
        onUpdateAnswer={mockUpdateAnswer}
        onReorderQuestion={mockReorderQuestion}
        canMoveUp={true}
        canMoveDown={true}
      />
    );

    const answerContent = screen.getByDisplayValue('Berlin');

    await act(async () => {
      await userEvent.clear(answerContent);
      fireEvent.blur(answerContent);
    });

    expect(screen.getByText('Answer content is required')).toBeInTheDocument();
  });
  it('saves a questions description and type', async () => {
    render(
      <QuestionCard
        question={noAnswerQuestionFixture}
        mode="edit"
        onDeleteQuestion={mockDeleteQuestion}
        onUpdateQuestion={mockUpdateQuestion}
        onCreateAnswer={mockCreateAnswer}
        onDeleteAnswer={mockDeleteAnswer}
        onUpdateAnswer={mockUpdateAnswer}
        onReorderQuestion={mockReorderQuestion}
        canMoveUp={true}
        canMoveDown={true}
      />
    );
    const questionDescription = screen.getByDisplayValue('Choose the correct capital city.');

    await act(async () => {
      await userEvent.clear(questionDescription);
      await userEvent.type(questionDescription, 'New description');
      fireEvent.blur(questionDescription);
    });

    expect(mockUpdateQuestion).toHaveBeenCalledWith(noAnswerQuestionFixture.id, {
      title: noAnswerQuestionFixture.title.trim(),
      description: 'New description',
      type: noAnswerQuestionFixture.type,
    });

    const questionType = screen.getByRole('combobox');

    await act(async () => {
      await userEvent.selectOptions(questionType, 'CARD');
      fireEvent.blur(questionType);
    });

    expect(mockUpdateQuestion).toHaveBeenCalledWith(noAnswerQuestionFixture.id, {
      title: noAnswerQuestionFixture.title.trim(),
      description: 'New description',
      type: 'CARD',
    });
  });
  it('saves an answers description and correctness', async () => {
    render(
      <QuestionCard
        question={oneAnswerQuestionFixture}
        mode="edit"
        onDeleteQuestion={mockDeleteQuestion}
        onUpdateQuestion={mockUpdateQuestion}
        onCreateAnswer={mockCreateAnswer}
        onDeleteAnswer={mockDeleteAnswer}
        onUpdateAnswer={mockUpdateAnswer}
        onReorderQuestion={mockReorderQuestion}
        canMoveUp={true}
        canMoveDown={true}
      />
    );

    const answerContent = screen.getByDisplayValue('Berlin');

    await act(async () => {
      await userEvent.clear(answerContent);
      await userEvent.type(answerContent, 'Zurich');
      fireEvent.blur(answerContent);
    });

    expect(mockUpdateAnswer).toHaveBeenCalledWith(
      questionFixture.id,
      questionFixture.answers[1].id,
      {
        content: 'Zurich',
        isCorrect: false,
      }
    );

    const checkboxes = screen.getAllByRole('checkbox');

    await act(async () => {
      await userEvent.click(checkboxes[0]);
    });

    expect(mockUpdateAnswer).toHaveBeenCalledWith(
      questionFixture.id,
      questionFixture.answers[1].id,
      {
        content: 'Zurich',
        isCorrect: true,
      }
    );
  });
  it('indicates when saveAnswer failed', async () => {
    const failingUpdate = vi.fn().mockRejectedValue(new Error('Some fail message'));

    render(
      <QuestionCard
        question={oneAnswerQuestionFixture}
        mode="edit"
        onDeleteQuestion={mockDeleteQuestion}
        onUpdateQuestion={mockUpdateQuestion}
        onCreateAnswer={mockCreateAnswer}
        onDeleteAnswer={mockDeleteAnswer}
        onUpdateAnswer={failingUpdate}
        onReorderQuestion={mockReorderQuestion}
        canMoveUp={true}
        canMoveDown={true}
      />
    );

    const answerContent = screen.getByDisplayValue('Berlin');

    await act(async () => {
      await userEvent.clear(answerContent);
      await userEvent.type(answerContent, 'Zurich');
      fireEvent.blur(answerContent);
    });

    expect(await screen.findByText('Some fail message')).toBeInTheDocument();
  });
  it('toggles answers open and closed in view mode', () => {
    render(<QuestionCard question={questionFixture} />);

    const button = screen.getByRole('button', { name: /toggle answers/i });

    fireEvent.click(button);
    expect(screen.queryByTestId('answer-list')).toBeInTheDocument();

    fireEvent.click(button);
    expect(screen.queryByTestId('answer-list')).not.toBeInTheDocument();
  });
  it('shows a score when a score is provided', async () => {
    render(<QuestionCard question={oneAnswerQuestionFixture} mode="view" score={2} />);

    expect(screen.getByText('2 Points')).toBeInTheDocument();

    render(<QuestionCard question={oneAnswerQuestionFixture} mode="view" score={1} />);
    expect(screen.getByText('1 Point')).toBeInTheDocument();
  });
  it('shows questions in view mode if revealed is true', async () => {
    render(
      <QuestionCard
        question={oneAnswerQuestionFixture}
        mode="view"
        revealed={true}
        selectedAnswers={[oneAnswerQuestionFixture.answers[0]]}
      />
    );

    expect(screen.getByText('Berlin')).toBeInTheDocument();
  });
  it('highlights the selected answers when selected answers are provided in view mode', async () => {
    render(
      <QuestionCard
        question={oneAnswerQuestionFixture}
        mode="view"
        revealed={true}
        selectedAnswers={[oneAnswerQuestionFixture.answers[0]]}
      />
    );

    expect(screen.getByText('Berlin').closest('.answer-card--selected')).not.toBeNull();
  });
  it('highlights the selected answers when selected answers are provided in play mode', async () => {
    render(
      <QuestionCard
        question={oneAnswerQuestionFixture}
        mode="play"
        revealed={true}
        selectedAnswers={[oneAnswerQuestionFixture.answers[0]]}
        onPlayed={() => {}}
      />
    );

    expect(screen.getByText('Berlin').closest('.answer-card--selected')).not.toBeNull();
  });
  it('allows to update a question to have an empty description', async () => {
    render(
      <QuestionCard
        question={questionFixture}
        mode="edit"
        onDeleteQuestion={mockDeleteQuestion}
        onUpdateQuestion={mockUpdateQuestion}
        onCreateAnswer={mockCreateAnswer}
        onDeleteAnswer={mockDeleteAnswer}
        onUpdateAnswer={mockUpdateAnswer}
        onReorderQuestion={mockReorderQuestion}
        canMoveUp={true}
        canMoveDown={true}
      />
    );

    const questionDescription = screen.getByDisplayValue('Choose the correct capital city.');

    await act(async () => {
      await userEvent.clear(questionDescription);
      fireEvent.blur(questionDescription);
    });

    expect(mockUpdateQuestion).toHaveBeenCalledWith(questionFixture.id, {
      title: questionFixture.title.trim(),
      description: '',
      type: questionFixture.type,
    });
  });
  it('calls reorder handler with up direction', async () => {
    render(
      <QuestionCard
        question={questionFixture}
        mode="edit"
        onUpdateQuestion={mockUpdateQuestion}
        onDeleteQuestion={mockDeleteQuestion}
        onCreateAnswer={mockCreateAnswer}
        onUpdateAnswer={mockUpdateAnswer}
        onDeleteAnswer={mockDeleteAnswer}
        onReorderQuestion={mockReorderQuestion}
        canMoveUp={true}
        canMoveDown={true}
      />
    );

    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /Move question up/i }));
    });

    expect(mockReorderQuestion).toHaveBeenCalledWith(questionFixture.id, 'up');
  });
  it('calls reorder handler with down direction', async () => {
    render(
      <QuestionCard
        question={questionFixture}
        mode="edit"
        onUpdateQuestion={mockUpdateQuestion}
        onDeleteQuestion={mockDeleteQuestion}
        onCreateAnswer={mockCreateAnswer}
        onUpdateAnswer={mockUpdateAnswer}
        onDeleteAnswer={mockDeleteAnswer}
        onReorderQuestion={mockReorderQuestion}
        canMoveUp={true}
        canMoveDown={true}
      />
    );

    await act(async () => {
      await userEvent.click(screen.getByRole('button', { name: /Move question down/i }));
    });

    expect(mockReorderQuestion).toHaveBeenCalledWith(questionFixture.id, 'down');
  });
  it('disables a move button if it is specified to not be moveable in that direction', async () => {
    render(
      <QuestionCard
        question={questionFixture}
        mode="edit"
        onUpdateQuestion={mockUpdateQuestion}
        onDeleteQuestion={mockDeleteQuestion}
        onCreateAnswer={mockCreateAnswer}
        onUpdateAnswer={mockUpdateAnswer}
        onDeleteAnswer={mockDeleteAnswer}
        onReorderQuestion={mockReorderQuestion}
        canMoveUp={false}
        canMoveDown={false}
      />
    );

    expect(screen.getByRole('button', { name: /Move question down/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Move question up/i })).toBeDisabled();
  });
});
