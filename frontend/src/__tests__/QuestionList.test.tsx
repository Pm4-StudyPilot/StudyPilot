import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import QuestionList from '../components/quizzes/QuestionList';
import { AnswerDto, QuestionWithAnswersDto } from '../types/dto';
import { Option } from '../components/shared/form/types';
import { AnswerFormState, QuestionFormState } from '../components/quizzes/types.ts';
import { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';

vi.mock('../components/quizzes/QuestionCard.tsx', () => ({
  default: ({
    question,
    onDeleteQuestion,
    onReorderQuestion,
    onReorderAnswers,
  }: {
    question: QuestionWithAnswersDto;
    mode?: 'view' | 'edit' | 'play';
    onUpdateQuestion?: (questionId: string, data: QuestionFormState) => Promise<void> | void;
    onDeleteQuestion?: (questionId: string) => Promise<void> | void;
    onCreateAnswer?: (questionId: string, data: AnswerFormState) => Promise<void> | void;
    onUpdateAnswer?: (
      questionId: string,
      answerId: string,
      data: AnswerFormState
    ) => Promise<void> | void;
    onDeleteAnswer?: (questionId: string, answerId: string) => Promise<void> | void;
    onReorderQuestion?: (id: string, dir: 'up' | 'down') => void;
    onReorderAnswers: (questionId: string, reorderedAnswers: AnswerDto[]) => Promise<void>;
  }) => (
    <div data-testid="question-card">
      <div>{question.id}</div>

      <button onClick={() => onDeleteQuestion?.(question.id)}>delete</button>

      <button onClick={() => onReorderQuestion?.(question.id, 'up')}>up</button>

      <button onClick={() => onReorderQuestion?.(question.id, 'down')}>down</button>

      <button onClick={() => onReorderAnswers?.(question.id, question.answers.reverse())}>
        reorder answers
      </button>
    </div>
  ),
}));

vi.mock('../components/shared/form/InputField', () => ({
  default: ({
    label,
    value,
    onChange,
    name,
  }: {
    label: string;
    error?: string;
  } & InputHTMLAttributes<HTMLInputElement>) => (
    <input data-testid={`input-${name}`} aria-label={label} value={value} onChange={onChange} />
  ),
}));

vi.mock('../components/shared/form/TextareaField', () => ({
  default: ({
    label,
    value,
    onChange,
  }: {
    label: string;
    error?: string;
  } & TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea
      data-testid="textarea-description"
      aria-label={label}
      value={value}
      onChange={onChange}
    />
  ),
}));

vi.mock('../components/shared/form/SelectField', () => ({
  default: ({
    value,
    onChange,
  }: {
    label: string;
    error?: string;
    options: Option[];
  } & SelectHTMLAttributes<HTMLSelectElement>) => (
    <select data-testid="select-type" value={value} onChange={onChange}>
      <option value="SINGLE_CHOICE">SINGLE_CHOICE</option>
      <option value="MULTIPLE_CHOICE">MULTIPLE_CHOICE</option>
      <option value="CARD">CARD</option>
    </select>
  ),
}));

vi.mock('../components/quizzes/types', () => ({
  questionTypes: ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'CARD'],
}));

const questionFixtures: QuestionWithAnswersDto[] = [
  {
    id: 'question-1',
    title: 'What is the capital of France?',
    description: 'Choose the correct capital city.',
    type: 'SINGLE_CHOICE',
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
    ],
  },
  {
    id: 'question-2',
    title: 'Which planet is known as the Red Planet?',
    description: null,
    type: 'MULTIPLE_CHOICE',
    quizId: 'quiz-1',
    createdAt: '2026-05-01T12:00:00.000Z',
    updatedAt: '2026-05-01T12:00:00.000Z',
    answers: [],
  },
];

function renderComponent(props: Record<string, unknown> = {}) {
  const defaultProps = {
    questions: [],
    editable: false,
  };

  return render(<QuestionList {...defaultProps} {...props} />);
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: T | PromiseLike<T>) => void;

  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

describe('QuestionList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows empty state when no questions and not editable', () => {
    renderComponent({ questions: [], editable: false });

    expect(screen.getByText('No questions yet')).toBeInTheDocument();
    expect(
      screen.getByText('Once questions are added, they will appear here.')
    ).toBeInTheDocument();
  });

  it('shows editable empty state when no questions and editable', () => {
    renderComponent({ questions: [], editable: true });

    expect(screen.getByText('Create the first question below.')).toBeInTheDocument();
  });

  it('renders questions using QuestionCard in view mode', () => {
    renderComponent({ questions: questionFixtures });

    const cards = screen.getAllByTestId('question-card');
    expect(cards).toHaveLength(2);
    expect(screen.getByText('question-1')).toBeInTheDocument();
    expect(screen.getByText('question-2')).toBeInTheDocument();
  });

  it('renders questions using QuestionCard in edit mode', () => {
    renderComponent({ questions: questionFixtures, editable: true });

    const cards = screen.getAllByTestId('question-card');
    expect(cards).toHaveLength(2);
    expect(screen.getByText('question-1')).toBeInTheDocument();
    expect(screen.getByText('question-2')).toBeInTheDocument();
  });

  it('disables create button when title is empty', () => {
    renderComponent({ editable: true });

    const button = screen.getByRole('button', { name: /add question/i });
    expect(button).toBeDisabled();
  });

  it('disables create button when title is empty and prevents submission', () => {
    const onCreateQuestion = vi.fn();

    renderComponent({ editable: true, onCreateQuestion });

    const button = screen.getByRole('button', { name: /add question/i });

    expect(button).toBeDisabled();

    fireEvent.click(button);

    expect(onCreateQuestion).not.toHaveBeenCalled();
  });

  it('calls onCreateQuestion and resets form on success', async () => {
    const onCreateQuestion = vi.fn().mockResolvedValue(undefined);

    renderComponent({ editable: true, onCreateQuestion });

    const input = screen.getByTestId('input-title');
    const button = screen.getByRole('button', { name: /add question/i });

    fireEvent.change(input, { target: { value: '  New Question  ' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(onCreateQuestion).toHaveBeenCalledWith({
        title: 'New Question',
        description: '',
        type: 'SINGLE_CHOICE',
      });
    });

    expect(input).toHaveValue('');
  });

  it('shows error when onCreateQuestion rejects', async () => {
    const onCreateQuestion = vi.fn().mockRejectedValue(new Error('fail'));

    renderComponent({ editable: true, onCreateQuestion });

    const input = screen.getByTestId('input-title');
    const button = screen.getByRole('button', { name: /add question/i });

    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(button);

    expect(await screen.findByText('Failed to create question')).toBeInTheDocument();
  });

  it('shows saving state while creating question', async () => {
    const d = deferred<void>();
    const onCreateQuestion = vi.fn(() => d.promise);

    renderComponent({ editable: true, onCreateQuestion });

    const input = screen.getByTestId('input-title');
    const button = screen.getByRole('button', { name: /add question/i });

    fireEvent.change(input, { target: { value: 'Test Question' } });
    fireEvent.click(button);

    expect(button).toHaveTextContent('Adding...');
    expect(button).toBeDisabled();

    d.resolve(undefined);

    await waitFor(() => {
      expect(button).toHaveTextContent('Add question');
    });
  });
  it('clears previous error when a new question is successfully created', async () => {
    const onCreateQuestion = vi
      .fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce(undefined);

    renderComponent({ editable: true, onCreateQuestion });

    const input = screen.getByTestId('input-title');
    const button = screen.getByRole('button', { name: /add question/i });

    // First attempt → fail → sets error
    fireEvent.change(input, { target: { value: 'First' } });
    fireEvent.click(button);

    expect(await screen.findByText('Failed to create question')).toBeInTheDocument();

    // Second attempt → success → should clear error
    fireEvent.change(input, { target: { value: 'Second Question' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(onCreateQuestion).toHaveBeenCalledTimes(2);
    });

    expect(screen.queryByText('Failed to create question')).not.toBeInTheDocument();
  });
  it('trims input values and resets form after successful creation', async () => {
    const onCreateQuestion = vi.fn().mockResolvedValue(undefined);

    renderComponent({ editable: true, onCreateQuestion });

    const titleInput = screen.getByTestId('input-title');
    const descriptionInput = screen.getByTestId('textarea-description');
    const typeSelect = screen.getByTestId('select-type');
    const button = screen.getByRole('button', { name: /add question/i });

    fireEvent.change(titleInput, { target: { value: '   My Question   ' } });
    fireEvent.change(descriptionInput, { target: { value: '   Some description   ' } });
    fireEvent.change(typeSelect, { target: { value: 'CARD' } });

    fireEvent.click(button);

    await waitFor(() => {
      expect(onCreateQuestion).toHaveBeenCalledWith({
        title: 'My Question',
        description: 'Some description',
        type: 'CARD',
      });
    });

    // form reset (covers setNewQuestion reset branch)
    expect(titleInput).toHaveValue('');
    expect(descriptionInput).toHaveValue('');
  });
  it('allows to make the question description empty', async () => {
    const onCreateQuestion = vi.fn().mockResolvedValue(undefined);

    renderComponent({ editable: true, onCreateQuestion });

    const titleInput = screen.getByTestId('input-title');
    const descriptionInput = screen.getByTestId('textarea-description');
    const button = screen.getByRole('button', { name: /add question/i });

    fireEvent.change(titleInput, { target: { value: 'Question title' } });
    fireEvent.change(descriptionInput, {
      target: { value: 'Temporary description' },
    });

    fireEvent.change(descriptionInput, { target: { value: '' } });

    fireEvent.click(button);

    await waitFor(() => {
      expect(onCreateQuestion).toHaveBeenCalledWith({
        title: 'Question title',
        description: '',
        type: 'SINGLE_CHOICE',
      });
    });

    expect(descriptionInput).toHaveValue('');
  });
  it('calls onDeleteQuestion when delete is triggered from QuestionCard', () => {
    const onDeleteQuestion = vi.fn();

    renderComponent({
      questions: questionFixtures,
      editable: true,
      onDeleteQuestion,
    });

    const deleteButtons = screen.getAllByText('delete');

    fireEvent.click(deleteButtons[0]);

    expect(onDeleteQuestion).toHaveBeenCalledWith('question-1');
  });
  it('calls onReorderQuestion with "up" direction', () => {
    const onReorderQuestion = vi.fn();

    renderComponent({
      questions: questionFixtures,
      editable: true,
      onReorderQuestion,
    });

    const upButtons = screen.getAllByText('up');

    fireEvent.click(upButtons[0]);

    expect(onReorderQuestion).toHaveBeenCalledWith('question-1', 'up');
  });
  it('calls onReorderQuestion with "down" direction', () => {
    const onReorderQuestion = vi.fn();

    renderComponent({
      questions: questionFixtures,
      editable: true,
      onReorderQuestion,
    });

    const downButtons = screen.getAllByText('down');

    fireEvent.click(downButtons[0]);

    expect(onReorderQuestion).toHaveBeenCalledWith('question-1', 'down');
  });
  it('calls onReorderAnswers', () => {
    const onReorderAnswers = vi.fn();

    renderComponent({
      questions: questionFixtures,
      editable: true,
      onReorderAnswers,
    });

    const upButtons = screen.getAllByText('reorder answers');

    fireEvent.click(upButtons[0]);

    expect(onReorderAnswers).toHaveBeenCalled();
  });
});
