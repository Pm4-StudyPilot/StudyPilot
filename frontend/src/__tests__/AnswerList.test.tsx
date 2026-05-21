import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AnswerList from '../components/quizzes/AnswerList';
import { AnswerDto, QuestionWithAnswersDto } from '../types/dto';

vi.mock('../components/shared/form/CheckField', () => ({
  default: ({
    label,
    checked,
    onChange,
  }: {
    label: string;
    type: 'checkbox' | 'radio';
    error?: string;
    className?: string;
  }) => (
    <label>
      {label}
      <input type="checkbox" checked={checked} onChange={onChange} data-testid="checkfield" />
    </label>
  ),
}));

describe('AnswerList', () => {
  const question = {
    id: 'q1',
    answers: [
      {
        id: 'a1',
        content: 'Answer 1',
        isCorrect: true,
        questionId: 'q1',
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'a2',
        content: 'Answer 2',
        isCorrect: false,
        questionId: 'q1',
        createdAt: '',
        updatedAt: '',
      },
    ] as AnswerDto[],
  };

  let setDraftAnswers: (
    draftAnswers: Record<string, { content: string; isCorrect: boolean }>
  ) => void;
  let handleSaveAnswer: (answerId: string) => void;
  let onDeleteAnswer: (questionId: string, answerId: string) => void;
  let onPlay: (questionId: string) => void;

  beforeEach(() => {
    setDraftAnswers = vi.fn((updater) => {
      if (typeof updater === 'function') {
        updater({});
      }
    });

    handleSaveAnswer = vi.fn();
    onDeleteAnswer = vi.fn();
    onPlay = vi.fn();
  });

  // -------------------------
  // VIEW MODE
  // -------------------------
  it('renders answers in view mode with correct classes and labels', () => {
    render(<AnswerList mode="view" question={question as QuestionWithAnswersDto} />);

    expect(screen.getByText('Answer 1')).toBeInTheDocument();
    expect(screen.getByText('Answer 2')).toBeInTheDocument();

    expect(screen.getAllByText('Correct')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Incorrect')[0]).toBeInTheDocument();

    // icon presence
    expect(document.querySelector('.fa-circle-check')).toBeInTheDocument();
    expect(document.querySelector('.fa-circle-xmark')).toBeInTheDocument();
  });

  // -------------------------
  // EDIT MODE
  // -------------------------
  it('renders edit mode with inputs and uses draft fallback', () => {
    render(
      <AnswerList
        mode="edit"
        question={question as QuestionWithAnswersDto}
        draftAnswers={{}}
        setDraftAnswers={setDraftAnswers}
        handleSaveAnswer={handleSaveAnswer}
        onDeleteAnswer={onDeleteAnswer}
      />
    );

    const inputs = screen.getAllByDisplayValue(/Answer/);
    expect(inputs).toHaveLength(2);
  });

  it('updates draftAnswers on input change', () => {
    render(
      <AnswerList
        mode="edit"
        question={question as QuestionWithAnswersDto}
        draftAnswers={{}}
        setDraftAnswers={setDraftAnswers}
        handleSaveAnswer={handleSaveAnswer}
        onDeleteAnswer={onDeleteAnswer}
      />
    );

    const input = screen.getByDisplayValue('Answer 1');
    fireEvent.change(input, { target: { value: 'Updated Answer' } });

    expect(setDraftAnswers).toHaveBeenCalled();
  });

  it('calls handleSaveAnswer on blur', () => {
    render(
      <AnswerList
        mode="edit"
        question={question as QuestionWithAnswersDto}
        draftAnswers={{}}
        setDraftAnswers={setDraftAnswers}
        handleSaveAnswer={handleSaveAnswer}
        onDeleteAnswer={onDeleteAnswer}
      />
    );

    const input = screen.getByDisplayValue('Answer 1');
    fireEvent.blur(input);

    expect(handleSaveAnswer).toHaveBeenCalledWith('a1');
  });

  it('toggles checkbox and saves updated draft', () => {
    render(
      <AnswerList
        mode="edit"
        question={question as QuestionWithAnswersDto}
        draftAnswers={{}}
        setDraftAnswers={setDraftAnswers}
        handleSaveAnswer={handleSaveAnswer}
        onDeleteAnswer={onDeleteAnswer}
      />
    );

    const checkboxes = screen.getAllByTestId('checkfield');
    fireEvent.click(checkboxes[1]);

    expect(setDraftAnswers).toHaveBeenCalled();
    expect(handleSaveAnswer).toHaveBeenCalled();
  });

  it('calls onDeleteAnswer when delete button clicked', () => {
    render(
      <AnswerList
        mode="edit"
        question={question as QuestionWithAnswersDto}
        draftAnswers={{}}
        setDraftAnswers={setDraftAnswers}
        handleSaveAnswer={handleSaveAnswer}
        onDeleteAnswer={onDeleteAnswer}
      />
    );

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);

    expect(onDeleteAnswer).toHaveBeenCalledWith('q1', 'a1');
  });

  it('renders play mode with clickable answers', () => {
    render(
      <AnswerList mode="play" question={question as QuestionWithAnswersDto} onPlay={onPlay} />
    );

    expect(screen.getByText('Answer 1')).toBeInTheDocument();
    expect(screen.getByText('Answer 2')).toBeInTheDocument();
  });

  it('defaults to view mode when mode is not provided', () => {
    render(<AnswerList question={question as QuestionWithAnswersDto} />);

    expect(screen.getByText('Answer 1')).toBeInTheDocument();
    expect(screen.getByText('Answer 2')).toBeInTheDocument();
  });
});
