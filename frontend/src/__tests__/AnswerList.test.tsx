import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AnswerList from '../components/quizzes/AnswerList';
import { AnswerDto, QuestionWithAnswersDto } from '../types/dto';
import React, { InputHTMLAttributes } from 'react';
import userEvent from '@testing-library/user-event';

vi.mock('../components/shared/form/CheckField', () => ({
  default: ({
    label,
    checked,
    onChange,
  }: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
    label: string;
    type: 'checkbox' | 'radio';
    labelPosition?: 'left' | 'right';
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
  const cardQuestion = {
    id: 'q1',
    type: 'CARD',
    answers: [
      {
        id: 'a1',
        content: 'Answer 1',
        isCorrect: true,
        questionId: 'q1',
        createdAt: '',
        updatedAt: '',
      },
    ] as AnswerDto[],
  };
  const choiceQuestion = {
    id: 'q1',
    type: 'MULTIPLE_CHOICE',
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

  let setDraftAnswers: React.Dispatch<
    React.SetStateAction<Record<string, { content: string; isCorrect: boolean }>>
  >;
  let handleSaveAnswer: (answerId: string) => void;
  let onDeleteAnswer: (questionId: string, answerId: string) => void;
  let onPlay: (answerId?: string) => void;

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

  it('renders answers in view mode with correct classes and labels', () => {
    render(<AnswerList mode="view" question={choiceQuestion as QuestionWithAnswersDto} />);

    expect(screen.getByText('Answer 1')).toBeInTheDocument();
    expect(screen.getByText('Answer 2')).toBeInTheDocument();

    expect(screen.getAllByText('Correct')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Incorrect')[0]).toBeInTheDocument();

    // icon presence
    expect(document.querySelector('.fa-circle-check')).toBeInTheDocument();
    expect(document.querySelector('.fa-circle-xmark')).toBeInTheDocument();
  });

  it('renders edit mode with inputs and uses draft fallback', () => {
    render(
      <AnswerList
        mode="edit"
        question={choiceQuestion as QuestionWithAnswersDto}
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
        question={choiceQuestion as QuestionWithAnswersDto}
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
        question={choiceQuestion as QuestionWithAnswersDto}
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
        question={choiceQuestion as QuestionWithAnswersDto}
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
        question={choiceQuestion as QuestionWithAnswersDto}
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

  it('renders play mode with clickable answers', async () => {
    render(
      <AnswerList
        mode="play"
        question={choiceQuestion as QuestionWithAnswersDto}
        revealed={false}
        onPlay={onPlay}
      />
    );

    expect(screen.getByText('Answer 1')).toBeInTheDocument();
    expect(screen.getByText('Answer 2')).toBeInTheDocument();

    const answer1 = screen.getByText('Answer 1');

    await userEvent.click(answer1);

    await waitFor(() => {
      expect(onPlay).toHaveBeenCalled();
    });
  });

  it('renders nothing in play when the question type is card and the question is not revealed yet', async () => {
    render(
      <AnswerList
        mode="play"
        question={cardQuestion as QuestionWithAnswersDto}
        revealed={false}
        onPlay={onPlay}
      />
    );

    expect(screen.queryByText('Answer 1')).not.toBeInTheDocument();
  });

  it('renders play when the question type is card and the question was revealed', async () => {
    render(
      <AnswerList
        mode="play"
        question={cardQuestion as QuestionWithAnswersDto}
        revealed={true}
        onPlay={onPlay}
      />
    );

    expect(screen.getByText('Answer 1')).toBeInTheDocument();
  });

  it('renders play when the question type is card and the question was revealed', async () => {
    render(
      <AnswerList
        mode="play"
        question={cardQuestion as QuestionWithAnswersDto}
        revealed={true}
        onPlay={onPlay}
      />
    );

    expect(screen.queryByText('Answer 1')).toBeInTheDocument();
    expect(screen.queryByText('Answer 2')).toBeInTheDocument();
  });

  it('defaults to view mode when mode is not provided', () => {
    render(<AnswerList question={choiceQuestion as QuestionWithAnswersDto} />);

    expect(screen.getByText('Answer 1')).toBeInTheDocument();
    expect(screen.getByText('Answer 2')).toBeInTheDocument();
  });
});
