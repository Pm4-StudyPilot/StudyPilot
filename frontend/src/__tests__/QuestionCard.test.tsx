import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import QuestionCard from '../components/quizzes/QuestionCard';
import { AnswerDto, QuestionWithAnswersDto } from '../types/dto';

const mockUpdateQuestion = vi.fn();
const mockDeleteQuestion = vi.fn();
const mockCreateAnswer = vi.fn();
const mockUpdateAnswer = vi.fn();
const mockDeleteAnswer = vi.fn();
/**
 * Mock AnswerList so tests are not dependent on its internal implementation.
 * We simply render the answers passed via props.
 */
vi.mock('../components/quizzes/AnswerList', () => ({
  default: (props: {
    mode?: 'view' | 'edit' | 'play';
    answers: AnswerDto[];
    draftAnswers?: Record<string, { content: string; isCorrect: boolean }>;
    handleSaveAnswer?: (answerId: string) => void;
    setDraftAnswers?: (
      draftAnswers: Record<string, { content: string; isCorrect: boolean }>
    ) => void;
    onDeleteAnswer?: (questionId: string, answerId: string) => void;
    onPlay?: (questionId: string) => void;
  }) => {
    const answers = props.question?.answers ?? [];

    return (
      <div data-testid="answer-list">
        {answers.map((a: QuestionWithAnswersDto) => (
          <div key={a.id}>
            <span>{a.content}</span>

            {/* trigger save from test */}
            <button
              data-testid={`save-${a.id}`}
              onClick={() =>
                props.handleSaveAnswer?.(a.id, {
                  content: '   ', // whitespace input
                  isCorrect: false,
                })
              }
            >
              save
            </button>
          </div>
        ))}
      </div>
    );
  },
}));
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
      />
    );

    // title input exists
    expect(screen.getByDisplayValue('What is the capital of France?')).toBeInTheDocument();

    // trigger blur -> save
    fireEvent.blur(screen.getByDisplayValue('What is the capital of France?'));

    expect(mockUpdateQuestion).toHaveBeenCalled();
  });
  it('shows validation error when saving empty question title', async () => {
    render(<QuestionCard question={questionFixture} mode="edit" />);

    const input = screen.getByDisplayValue('What is the capital of France?');

    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);

    expect(await screen.findByText('Question title is required')).toBeInTheDocument();
  });
  it('enables add answer button only when input has content', () => {
    render(<QuestionCard question={questionFixture} mode="edit" />);

    const input = screen.getByPlaceholderText('Add another possible answer');
    const button = screen.getByRole('button', { name: /add answer/i });

    expect(button).toBeDisabled();

    fireEvent.change(input, { target: { value: 'Paris' } });

    expect(button).toBeEnabled();
  });
  it('calls delete question handler', () => {
    render(
      <QuestionCard question={questionFixture} mode="edit" onDeleteQuestion={mockDeleteQuestion} />
    );

    fireEvent.click(screen.getByText('Delete'));

    expect(mockDeleteQuestion).toHaveBeenCalledWith('question-1');
  });
  it('renders play mode correctly', () => {
    render(<QuestionCard question={questionFixture} mode="play" />);

    expect(screen.getByText('Multiple Choice')).toBeInTheDocument();
    expect(screen.getByText('What is the capital of France?')).toBeInTheDocument();
  });
  it('keeps add answer button disabled for whitespace-only input', () => {
    render(<QuestionCard question={questionFixture} mode="edit" />);

    const input = screen.getByPlaceholderText('Add another possible answer');
    const button = screen.getByRole('button', { name: /add answer/i });

    fireEvent.change(input, { target: { value: '   ' } });

    expect(button).toBeDisabled();
  });
  it('prevents saving answer with whitespace content', async () => {
    render(
      <QuestionCard question={questionFixture} mode="edit" onUpdateAnswer={mockUpdateAnswer} />
    );

    // trigger save from mocked AnswerList
    const saveButton = screen.getByTestId('save-answer-1');

    await act(async () => {
      fireEvent.click(saveButton);
    });

    // validation should block update call
    expect(mockUpdateAnswer).not.toHaveBeenCalled();

    // error message should be shown
    expect(screen.getByText('Answer content is required')).toBeInTheDocument();
  });
  it('shows error when question update fails', async () => {
    const failingUpdate = vi.fn().mockRejectedValue(new Error('fail'));

    render(
      <QuestionCard question={questionFixture} mode="edit" onUpdateQuestion={failingUpdate} />
    );

    fireEvent.blur(screen.getByDisplayValue(questionFixture.title));

    expect(await screen.findByText('Failed to save question')).toBeInTheDocument();
  });
  it('shows error when creating answer fails', async () => {
    const failingCreate = vi.fn().mockRejectedValue(new Error('fail'));

    render(<QuestionCard question={questionFixture} mode="edit" onCreateAnswer={failingCreate} />);

    const input = screen.getByPlaceholderText('Add another possible answer');
    fireEvent.change(input, { target: { value: 'Rome' } });

    fireEvent.click(screen.getByText('Add answer'));

    expect(await screen.findByText('Failed to create question')).toBeInTheDocument();
  });
  it('shows saving indicator during question update', async () => {
    let resolve: (unknown) => void;
    const slowUpdate = new Promise((res) => (resolve = res));

    const onUpdate = vi.fn(() => slowUpdate);

    render(<QuestionCard question={questionFixture} mode="edit" onUpdateQuestion={onUpdate} />);

    fireEvent.blur(screen.getByDisplayValue(questionFixture.title));

    expect(screen.getByText('Saving...')).toBeInTheDocument();

    resolve();
  });
  it('toggles answers open and closed', () => {
    render(<QuestionCard question={questionFixture} />);

    const button = screen.getByRole('button', { name: /toggle answers/i });

    fireEvent.click(button);
    expect(screen.getByTestId('answer-list')).toBeInTheDocument();

    fireEvent.click(button);
    expect(screen.queryByTestId('answer-list')).not.toBeInTheDocument();
  });
  it('does not render AnswerList when no answers exist', () => {
    render(<QuestionCard question={{ ...questionFixture, answers: [] }} mode="edit" />);

    expect(screen.queryByTestId('answer-list')).not.toBeInTheDocument();
  });
  it('calls update question and clears saving state', async () => {
    const updateMock = vi.fn().mockResolvedValueOnce(undefined);

    render(<QuestionCard question={questionFixture} mode="edit" onUpdateQuestion={updateMock} />);

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

    render(<QuestionCard question={questionFixture} mode="edit" onCreateAnswer={createMock} />);

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
  it('toggles answers open and closed', () => {
    render(<QuestionCard question={questionFixture} />);

    const button = screen.getByRole('button', { name: /toggle answers/i });

    fireEvent.click(button);
    expect(screen.getByTestId('answer-list')).toBeInTheDocument();

    fireEvent.click(button);
    expect(screen.queryByTestId('answer-list')).not.toBeInTheDocument();
  });
});
