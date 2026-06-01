import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnswerDto, QuestionWithAnswersDto } from '../../types/dto';
import { AnswerFormState, QuestionFormState, questionTypes, type QuestionTypeValue } from './types';
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
  onReorderQuestion: (questionId: string, direction: 'up' | 'down') => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onReorderAnswers: (questionId: string, reorderedAnswers: AnswerDto[]) => Promise<void>;
};

type PlayProps = BaseProps & {
  mode: 'play';
  revealed?: boolean;
  onPlayed: (answerId?: string) => void;
  selectedAnswers?: AnswerDto[];
};

type QuestionCardProps = ViewProps | EditProps | PlayProps;

function ViewQuestionCard({ question, revealed = false, score, selectedAnswers = [] }: ViewProps) {
  const { t } = useTranslation();
  const correctAnswers = question.answers.filter((answer) => answer.isCorrect).length;
  const [expanded, setExpanded] = useState(false);
  function handleToggle() {
    setExpanded((prev) => !prev);
  }
  return (
    <article className="question-card">
      <header className="question-card__header">
        <div className="question-card__title-group">
          <div className="question-card__meta">
            <span className="question-card__type">
              {t(`quizzes.questions.typeOptions.${question.type}`)}
            </span>
            <span>
              {t(
                question.answers.length === 1
                  ? 'quizzes.questions.card.answersCount'
                  : 'quizzes.questions.card.answersCount_other',
                { count: question.answers.length }
              )}
            </span>
            <span>
              {t(
                correctAnswers === 1
                  ? 'quizzes.questions.card.correctCount'
                  : 'quizzes.questions.card.correctCount_other',
                { count: correctAnswers }
              )}
            </span>
          </div>

          <h3 className="question-card__title">{question.title}</h3>

          {question.description && (
            <p className="question-card__description">{question.description}</p>
          )}
        </div>
        {typeof score === 'number' && (
          <div className="question-card__score">
            {t(
              score === 1
                ? 'quizzes.questions.card.scorePoints'
                : 'quizzes.questions.card.scorePoints_other',
              { count: score }
            )}{' '}
          </div>
        )}
      </header>

      {!revealed && (
        <button
          className="question-card__toggle btn btn-sm btn-link text-secondary p-0"
          onClick={handleToggle}
          aria-label={t('quizzes.questions.card.toggleAria')}
          aria-expanded={expanded}
        >
          {t('quizzes.questions.card.viewAnswers')}
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
  onReorderQuestion,
  canMoveUp,
  canMoveDown,
  onReorderAnswers,
}: EditProps) {
  console.log(canMoveUp);
  const { t } = useTranslation();
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

  const questionTypeOptions = useMemo(
    () =>
      questionTypes.map((value: QuestionTypeValue) => ({
        value,
        label: t(`quizzes.questions.typeOptions.${value}`),
      })),
    [t]
  );

  async function handleSaveQuestion() {
    setQuestionError(null);
    if (!draftQuestion.title.trim()) {
      setQuestionError(t('validation.questionTitleRequired'));
      return;
    }

    setSavingQuestion(true);

    try {
      await onUpdateQuestion?.(question.id, {
        title: draftQuestion.title.trim(),
        description: draftQuestion.description.trim(),
        type: draftQuestion.type,
      });
    } catch (e: unknown) {
      if (e instanceof Error) {
        setQuestionError(e.message);
      } else {
        setQuestionError(t('validation.failedToSaveQuestion'));
      }
    } finally {
      setSavingQuestion(false);
    }
  }

  async function handleSaveAnswer(answerId: string, overrideDraft?: AnswerFormState) {
    const draft = overrideDraft ?? draftAnswers[answerId];
    setQuestionError(null);
    if (!draft?.content.trim()) {
      setQuestionError(t('validation.answerContentRequired'));
      return;
    }

    setSavingAnswerId(answerId);

    try {
      await onUpdateAnswer?.(question.id, answerId, {
        content: draft.content.trim(),
        isCorrect: draft.isCorrect,
      });
    } catch (e: unknown) {
      if (e instanceof Error) {
        setQuestionError(e.message);
      } else {
        setQuestionError(t('validation.failedToSaveAnswer'));
      }
    } finally {
      setSavingAnswerId(null);
    }
  }

  async function handleCreateAnswer() {
    setQuestionError(null);
    if (!newAnswer.content.trim()) {
      setQuestionError(t('validation.answerContentRequired'));
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
      setQuestionError(t('validation.failedToCreateQuestion'));
    } finally {
      setAddingAnswer(false);
    }
  }

  return (
    <article
      className="question-card question-card--editable"
      data-testid="question-editor-card"
      data-question-title={question.title}
    >
      <header className="question-card__header">
        <div className="question-card__title-group question-editor">
          <div className="question-editor__fields">
            <InputField
              label={t('quizzes.questions.titleLabel')}
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
              label={t('quizzes.questions.descriptionLabel')}
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
              label={t('quizzes.questions.typeLabel')}
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

      <span className="question-editor__field">{t('quizzes.questions.card.answersHeading')}</span>

      {!!question.answers.length && (
        <div className="answer-list answer-list--editable">
          <AnswerList
            mode="edit"
            question={question}
            draftAnswers={draftAnswers}
            handleSaveAnswer={handleSaveAnswer}
            setDraftAnswers={setDraftAnswers}
            onDeleteAnswer={onDeleteAnswer}
            onReorderAnswers={onReorderAnswers}
          />
        </div>
      )}

      <div className="answer-editor answer-editor--new">
        <InputField
          label={t('quizzes.answers.newLabel')}
          className="answer-editor__content form-control"
          value={newAnswer.content}
          onChange={(event) =>
            setNewAnswer((current) => ({
              ...current,
              content: event.target.value,
            }))
          }
          placeholder={t('quizzes.answers.newPlaceholder')}
          data-testid="answer-content-input"
        />

        <CheckField
          label={t('quizzes.answers.correctCheckbox')}
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
          data-testid="add-answer-button"
        >
          <i className="fa-solid fa-plus" />
          {addingAnswer ? t('quizzes.answers.addingButton') : t('quizzes.answers.addButton')}
        </button>
      </div>
      <div className="question-editor__actions w-100">
        <button
          type="button"
          className="btn btn-outline-danger btn-sm"
          onClick={() => onDeleteQuestion?.(question.id)}
          aria-label={t('quiz.questions.card.delete')}
        >
          <i className="fa-solid fa-trash me-1" />
          {t('quizzes.questions.card.delete')}
        </button>
        {(savingAnswerId || savingQuestion) && <>{t('common.saving')}</>}
        {questionError && <div className="text-danger">{questionError}</div>}
        <button
          type="button"
          className="btn btn-outline-primary btn-sm ms-auto"
          disabled={!canMoveDown}
          onClick={() => onReorderQuestion?.(question.id, 'down')}
          aria-label={t('quizzes.questions.card.moveDown')}
        >
          <i className="fa-solid fa-chevron-down" />
        </button>
        <button
          type="button"
          className="btn btn-outline-primary btn-sm"
          disabled={!canMoveUp}
          onClick={() => onReorderQuestion?.(question.id, 'up')}
          aria-label={t('quizzes.questions.card.moveUp')}
        >
          <i className="fa-solid fa-chevron-up" />
        </button>
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
  const { t } = useTranslation();
  return (
    <article className="question-card question-card--play">
      <header className="question-card__header">
        <div className="question-card__title-group">
          <div className="question-card__meta">
            <span className="question-card__type">
              {t(`quizzes.questions.typeOptions.${question.type}`)}
            </span>
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
          onPlayed={onPlayed}
          selectedAnswers={selectedAnswers}
        />
      </div>

      {question.type !== 'SINGLE_CHOICE' && !revealed && (
        <button type="button" className="btn btn-outline-primary mt-4" onClick={() => onPlayed?.()}>
          {t('quizzes.questions.card.revealAnswer')}
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
