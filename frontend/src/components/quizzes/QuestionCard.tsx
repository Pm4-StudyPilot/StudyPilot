import { useState } from 'react';
import { AnswerDto, QuestionWithAnswersDto } from '../../types/dto';
import { AnswerFormState, QuestionFormState, questionTypeOptions } from './types';
import InputField from '../shared/form/InputField';
import TextareaField from '../shared/form/TextareaField';
import SelectField from '../shared/form/SelectField';
import AnswerList from './AnswerList';
import CheckField from '../shared/form/CheckField';

type BaseProps = {
  question: QuestionWithAnswersDto;
  mode?: 'view' | 'edit' | 'play';
};

type ViewProps = BaseProps & {
  mode?: 'view';
  revealed?: boolean;
  score?: number;
  selectedAnswers?: AnswerDto[];
};

type EditProps = BaseProps & {
  mode: 'edit';
  onUpdateQuestion: (questionId: string, data: QuestionFormState) => Promise<void> | void;
  onDeleteQuestion: (questionId: string) => Promise<void> | void;
  onCreateAnswer: (questionId: string, data: AnswerFormState) => Promise<void> | void;
  onUpdateAnswer: (
    questionId: string,
    answerId: string,
    data: AnswerFormState
  ) => Promise<void> | void;
  onDeleteAnswer: (questionId: string, answerId: string) => void;
};

type PlayProps = BaseProps & {
  mode: 'play';
  revealed?: boolean;
  onPlayed: (answerId?: string) => void;
  selectedAnswers?: AnswerDto[];
};

type QuestionCardProps = ViewProps | EditProps | PlayProps;

function formatQuestionType(type: QuestionWithAnswersDto['type']) {
  return type
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function ViewQuestionCard({ question, revealed = false, score, selectedAnswers = [] }: ViewProps) {
  const correctAnswers = question.answers.filter((answer) => answer.isCorrect).length;
  const [expanded, setExpanded] = useState(false);
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
        {typeof score === 'number' && (
          <div className="question-card__score">
            {score} Point{score === 1 ? '' : 's'}{' '}
          </div>
        )}
      </header>

      {!revealed && (
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
      )}

      {(revealed || expanded) && (
        <div className="answer-list" data-testid="answer-list">
          <AnswerList question={question} mode="view" selectedAnswers={selectedAnswers} />
        </div>
      )}
    </article>
  );
}

function EditQuestionCard({
  question,
  onUpdateQuestion,
  onDeleteQuestion,
  onCreateAnswer,
  onUpdateAnswer,
  onDeleteAnswer,
}: EditProps) {
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
        <InputField
          label="New answer"
          className="answer-editor__content form-control"
          value={newAnswer.content}
          onChange={(event) =>
            setNewAnswer((current) => ({
              ...current,
              content: event.target.value,
            }))
          }
          placeholder="Add another possible answer"
        />

        <CheckField
          label="Correct"
          type="checkbox"
          checked={newAnswer.isCorrect}
          onChange={(event) =>
            setNewAnswer((current) => ({
              ...current,
              isCorrect: event.target.checked,
            }))
          }
          className="answer-editor__check"
        />

        <button
          type="button"
          className="btn btn-primary btn-sm answer-editor__add-button mb-3"
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

function PlayQuestionCard({
  question,
  revealed = false,
  onPlayed,
  selectedAnswers = [],
}: PlayProps) {
  return (
    <article className="question-card question-card--play">
      <header className="question-card__header">
        <div className="question-card__title-group">
          <div className="question-card__meta">
            <span className="question-card__type">{formatQuestionType(question.type)}</span>
          </div>

          <h3 className="question-card__title">{question.title}</h3>

          {question.description && (
            <p className="question-card__description">{question.description}</p>
          )}
        </div>
      </header>

      <div className="answer-list">
        <AnswerList
          question={question}
          mode="play"
          revealed={revealed}
          onPlay={onPlayed}
          selectedAnswers={selectedAnswers}
        />
      </div>

      {question.type !== 'SINGLE_CHOICE' && !revealed && (
        <button type="button" className="btn btn-outline-primary mt-4" onClick={() => onPlayed?.()}>
          Reveal answer
        </button>
      )}
    </article>
  );
}

export default function QuestionCard(props: QuestionCardProps) {
  switch (props.mode) {
    case 'edit':
      return <EditQuestionCard {...props} />;

    case 'play':
      return <PlayQuestionCard {...props} />;

    default:
      return <ViewQuestionCard {...props} />;
  }
}
