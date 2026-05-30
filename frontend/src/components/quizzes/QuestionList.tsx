import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QuestionWithAnswersDto } from '../../types/dto';
import QuestionCard from './QuestionCard.tsx';
import InputField from '../shared/form/InputField';
import TextAreaField from '../shared/form/TextareaField';
import SelectField from '../shared/form/SelectField';
import { questionTypes, type QuestionTypeValue } from './types';

interface NewQuestionFormState {
  title: string;
  description: string;
  type: QuestionWithAnswersDto['type'];
}

interface QuestionListProps {
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
}

export default function QuestionList({
  questions,
  editable = false,
  onCreateQuestion,
  onUpdateQuestion,
  onDeleteQuestion,
  onCreateAnswer,
  onUpdateAnswer,
  onDeleteAnswer,
}: QuestionListProps) {
  const { t } = useTranslation();
  const [newQuestion, setNewQuestion] = useState<NewQuestionFormState>({
    title: '',
    description: '',
    type: 'SINGLE_CHOICE',
  });
  const [saving, setSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const questionTypeOptions = useMemo(
    () =>
      questionTypes.map((value: QuestionTypeValue) => ({
        value,
        label: t(`quizzes.questions.typeOptions.${value}`),
      })),
    [t]
  );

  async function handleCreateQuestion() {
    setCreateError(null);
    if (!newQuestion.title.trim()) {
      setCreateError(t('validation.questionTitleRequired'));
      return;
    }

    setSaving(true);

    try {
      await onCreateQuestion?.({
        title: newQuestion.title.trim(),
        description: newQuestion.description.trim(),
        type: newQuestion.type,
      });

      setNewQuestion({
        title: '',
        description: '',
        type: 'SINGLE_CHOICE',
      });
    } catch {
      setCreateError(t('validation.failedToCreateQuestion'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="question-list">
      {questions.length === 0 && !editable && (
        <div className="question-list__empty">
          <div className="question-list__empty-icon">
            <i className="fa-regular fa-circle-question" />
          </div>
          <h3>{t('quizzes.questions.noneViewTitle')}</h3>
          <p className="mb-0">{t('quizzes.questions.noneViewHint')}</p>
        </div>
      )}

      {questions.length === 0 && editable && (
        <div className="question-list__empty question-list__empty--editable">
          <h3>{t('quizzes.questions.noneEditTitle')}</h3>
          <p className="mb-0">{t('quizzes.questions.noneEditHint')}</p>
        </div>
      )}

      {questions.map((question) => {
        if (editable) {
          return (
            <QuestionCard
              mode="edit"
              question={question}
              onUpdateQuestion={onUpdateQuestion!}
              onDeleteQuestion={onDeleteQuestion!}
              onCreateAnswer={onCreateAnswer!}
              onUpdateAnswer={onUpdateAnswer!}
              onDeleteAnswer={onDeleteAnswer!}
              key={question.id}
            />
          );
        }
        return <QuestionCard mode="view" question={question} />;
      })}

      {editable && (
        <section className="question-list__new-question" data-testid="new-question-form">
          <div className="question-list__new-question-header">
            <h3>{t('quizzes.questions.addHeading')}</h3>
          </div>

          <div className="question-editor__fields">
            <InputField
              label={t('quizzes.questions.titleLabel')}
              name="title"
              value={newQuestion.title}
              onChange={(event) =>
                setNewQuestion((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder={t('quizzes.questions.titlePlaceholder')}
            />

            <TextAreaField
              className="form-control"
              label={t('quizzes.questions.descriptionLabel')}
              value={newQuestion.description}
              onChange={(event) =>
                setNewQuestion((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder={t('quizzes.questions.descriptionPlaceholder')}
              rows={3}
            />

            <SelectField
              label={t('quizzes.questions.typeLabel')}
              className="form-select"
              value={newQuestion.type}
              onChange={(event) =>
                setNewQuestion((current) => ({
                  ...current,
                  type: event.target.value as QuestionWithAnswersDto['type'],
                }))
              }
              options={questionTypeOptions}
            />
          </div>

          <button
            type="button"
            className="btn btn-primary question-list__create-button"
            disabled={!newQuestion.title.trim() || saving}
            onClick={handleCreateQuestion}
            data-testid="add-question-button"
          >
            <i className="fa-solid fa-plus" />
            {saving ? t('quizzes.questions.adding') : t('quizzes.questions.addButton')}
          </button>
          {createError && <div className="text-danger">{createError}</div>}
        </section>
      )}
    </div>
  );
}
