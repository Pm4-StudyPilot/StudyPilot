import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QuestionWithAnswersDto } from '../../types/dto';
import { questionTypes, type QuestionTypeValue } from './types';
import InputField from '../shared/form/InputField';
import TextareaField from '../shared/form/TextareaField';
import SelectField from '../shared/form/SelectField';
import AnswerList from './AnswerList';
import CheckField from '../shared/form/CheckField';

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
  onPlayed?: (answerId: string) => void;
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
  const { t } = useTranslation();
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
    } catch {
      setQuestionError(t('validation.failedToSaveQuestion'));
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
    } catch {
      setQuestionError(t('validation.failedToSaveAnswer'));
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

  if (mode === 'edit') {
    return (
      <article className="question-card question-card--editable">
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
          >
            <i className="fa-solid fa-plus" />
            {addingAnswer ? t('quizzes.answers.addingButton') : t('quizzes.answers.addButton')}
          </button>
        </div>
        <div className="question-editor__actions">
          <button
            type="button"
            className="btn btn-outline-danger btn-sm"
            onClick={() => onDeleteQuestion?.(question.id)}
          >
            <i className="fa-solid fa-trash me-1" />
            {t('quizzes.questions.card.delete')}
          </button>
          {(savingAnswerId || savingQuestion) && <>{t('common.saving')}</>}
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
      </header>

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

      {expanded && (
        <div className="answer-list">
          <AnswerList question={question} mode="view" />
        </div>
      )}
    </article>
  );
}
