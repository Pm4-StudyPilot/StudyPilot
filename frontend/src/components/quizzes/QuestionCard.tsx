import { useState } from 'react';
import { QuestionWithAnswersDto } from '../../types/dto';
import { questionTypeOptions } from './types';
import InputField from '../shared/form/InputField';
import TextareaField from '../shared/form/TextareaField';
import SelectField from '../shared/form/SelectField';
import AnswerList from './AnswerList';

interface QuestionFormState {
  title: string;
  description: string;
  type: QuestionWithAnswersDto['type'];
}

interface AnswerFormState {
  content: string;
  isCorrect: boolean;
}

interface QuestionCardProps {
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
}

function formatQuestionType(type: QuestionWithAnswersDto['type']) {
  return type
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function QuestionCard({
  question,
  mode = 'view',
  onUpdateQuestion,
  onDeleteQuestion,
  onCreateAnswer,
  onUpdateAnswer,
  onDeleteAnswer,
  onPlayed,
}: QuestionCardProps) {
  const correctAnswers = question.answers.filter((answer) => answer.isCorrect).length;
  const [draftQuestion, setDraftQuestion] = useState<QuestionFormState>({
    title: question.title,
    description: question.description ?? '',
    type: question.type,
  });
  const [draftAnswers, setDraftAnswers] = useState<Record<string, AnswerFormState>>(() =>
    Object.fromEntries(
      question.answers.map((answer) => [
        answer.id,
        {
          content: answer.content,
          isCorrect: answer.isCorrect ?? false,
        },
      ])
    )
  );
  const [newAnswer, setNewAnswer] = useState<AnswerFormState>({
    content: '',
    isCorrect: false,
  });
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [savingAnswerId, setSavingAnswerId] = useState<string | null>(null);
  const [addingAnswer, setAddingAnswer] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [questionError, setQuestionError] = useState<string | null>(null);

  async function handleSaveQuestion() {
    setQuestionError(null);
    if (!draftQuestion.title.trim()) {
      setQuestionError('Question title is required');
      return;
    }

    setSavingQuestion(true);

    try {
      await onUpdateQuestion?.(question.id, {
        title: draftQuestion.title.trim(),
        description: draftQuestion.description.trim(),
        type: draftQuestion.type,
      });
    } catch {
      setQuestionError('Failed to save question');
    } finally {
      setSavingQuestion(false);
    }
  }

  async function handleSaveAnswer(answerId: string, overrideDraft?: AnswerFormState) {
    const draft = overrideDraft ?? draftAnswers[answerId];
    setQuestionError(null);
    if (!draft?.content.trim()) {
      setQuestionError('Answer content is required');
      return;
    }

    setSavingAnswerId(answerId);

    try {
      await onUpdateAnswer?.(question.id, answerId, {
        content: draft.content.trim(),
        isCorrect: draft.isCorrect,
      });
    } catch {
      setQuestionError('Failed to save answer');
    } finally {
      setSavingAnswerId(null);
    }
  }

  async function handleCreateAnswer() {
    setQuestionError(null);
    if (!newAnswer.content.trim()) {
      setQuestionError('Answer content is required');
      return;
    }

    setAddingAnswer(true);

    try {
      await onCreateAnswer?.(question.id, {
        content: newAnswer.content.trim(),
        isCorrect: newAnswer.isCorrect ?? false,
      });

      setNewAnswer({
        content: '',
        isCorrect: false,
      });
    } catch {
      setQuestionError('Failed to create question');
    } finally {
      setAddingAnswer(false);
    }
  }

  if (mode === 'edit') {
    return (
      <article className="question-card question-card--editable">
        <header className="question-card__header">
          <div className="question-card__title-group question-editor">
            <div className="question-editor__fields">
              <InputField
                label="Question title"
                className="form-control"
                value={draftQuestion.title}
                onChange={(event) =>
                  setDraftQuestion((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                onBlur={handleSaveQuestion}
              />

              <TextareaField
                label="Description"
                className="form-control"
                value={draftQuestion.description}
                onChange={(event) =>
                  setDraftQuestion((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={3}
                onBlur={handleSaveQuestion}
              />

              <SelectField
                label="Question type"
                className="form-select"
                value={draftQuestion.type}
                onChange={(event) =>
                  setDraftQuestion((current) => ({
                    ...current,
                    type: event.target.value as QuestionWithAnswersDto['type'],
                  }))
                }
                options={questionTypeOptions}
                onBlur={handleSaveQuestion}
              />
            </div>
          </div>
        </header>

        <span className="question-editor__field">Answers</span>

        {!!question.answers.length && (
          <div className="answer-list answer-list--editable">
            <AnswerList
              mode="edit"
              question={question}
              draftAnswers={draftAnswers}
              handleSaveAnswer={handleSaveAnswer}
              setDraftAnswers={setDraftAnswers}
              onDeleteAnswer={onDeleteAnswer}
            />
          </div>
        )}

        <div className="answer-editor answer-editor--new">
          <label className="answer-editor__content">
            <span>New answer</span>
            <input
              className="form-control"
              value={newAnswer.content}
              onChange={(event) =>
                setNewAnswer((current) => ({
                  ...current,
                  content: event.target.value,
                }))
              }
              placeholder="Add another possible answer"
            />
          </label>

          <label className="answer-editor__check">
            <input
              type="checkbox"
              checked={newAnswer.isCorrect}
              onChange={(event) =>
                setNewAnswer((current) => ({
                  ...current,
                  isCorrect: event.target.checked,
                }))
              }
            />
            Correct
          </label>

          <button
            type="button"
            className="btn btn-primary btn-sm answer-editor__add-button"
            disabled={!newAnswer.content.trim() || addingAnswer}
            onClick={handleCreateAnswer}
          >
            <i className="fa-solid fa-plus" />
            {addingAnswer ? 'Adding...' : 'Add answer'}
          </button>
        </div>
        <div className="question-editor__actions">
          <button
            type="button"
            className="btn btn-outline-danger btn-sm"
            onClick={() => onDeleteQuestion?.(question.id)}
          >
            <i className="fa-solid fa-trash me-1" />
            Delete
          </button>
          {(savingAnswerId || savingQuestion) && <>Saving...</>}
          {questionError && <div className="text-danger">{questionError}</div>}
        </div>
      </article>
    );
  }

  if (mode === 'play') {
    return (
      <article className="question-card">
        <header className="question-card__header">
          <div className="question-card__title-group">
            <div className="question-card__meta">
              <span className="question-card__type">{formatQuestionType(question.type)}</span>
              <span>
                {question.answers.length} answer{question.answers.length !== 1 ? 's' : ''}
              </span>
              <span>
                {correctAnswers} correct answer{correctAnswers !== 1 ? 's' : ''}
              </span>
            </div>

            <h3 className="question-card__title">{question.title}</h3>

            {question.description && (
              <p className="question-card__description">{question.description}</p>
            )}
          </div>
        </header>

        <div className="answer-list">
          <AnswerList question={question} mode="play" onPlay={onPlayed} />
        </div>
      </article>
    );
  }

  function handleToggle() {
    setExpanded((prev) => {
      return !prev;
    });
  }

  return (
    <article className="question-card">
      <header className="question-card__header">
        <div className="question-card__title-group">
          <div className="question-card__meta">
            <span className="question-card__type">{formatQuestionType(question.type)}</span>
            <span>
              {question.answers.length} answer{question.answers.length !== 1 ? 's' : ''}
            </span>
            <span>
              {correctAnswers} correct answer{correctAnswers !== 1 ? 's' : ''}
            </span>
          </div>

          <h3 className="question-card__title">{question.title}</h3>

          {question.description && (
            <p className="question-card__description">{question.description}</p>
          )}
        </div>
      </header>

      <button
        className="question-card__toggle btn btn-sm btn-link text-secondary p-0"
        onClick={handleToggle}
        aria-label="Toggle answers"
        aria-expanded={expanded}
      >
        View Answers
        <i
          className={`question-card__chevron fa-solid fa-chevron-${expanded ? 'down' : 'right'}`}
        />
      </button>

      {expanded && (
        <div className="answer-list">
          <AnswerList question={question} mode="view" />
        </div>
      )}
    </article>
  );
}
