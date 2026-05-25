import { Dispatch, SetStateAction } from 'react';
import { useTranslation } from 'react-i18next';
import CheckField from '../shared/form/CheckField';
import { QuestionWithAnswersDto } from '../../types/dto';

type AnswerDraft = { content: string; isCorrect: boolean };

interface AnswerListProps {
  mode?: 'view' | 'edit' | 'play';
  question: QuestionWithAnswersDto;
  draftAnswers?: Record<string, AnswerDraft>;
  handleSaveAnswer?: (answerId: string, draft?: AnswerDraft) => void;
  setDraftAnswers?: Dispatch<SetStateAction<Record<string, AnswerDraft>>>;
  onDeleteAnswer?: (questionId: string, answerId: string) => void;
  onPlay?: (answerId: string) => void;
}

export default function AnswerList({
  mode = 'view',
  question,
  draftAnswers,
  setDraftAnswers,
  handleSaveAnswer,
  onDeleteAnswer,
  onPlay,
}: AnswerListProps) {
  const { t } = useTranslation();
  if (mode === 'edit') {
    const drafts = draftAnswers ?? {};
    return (
      <>
        {question.answers.map((answer) => {
          const draft = drafts[answer.id] ?? {
            content: answer.content,
            isCorrect: answer.isCorrect ?? false,
          };

          return (
            <div key={answer.id} className="answer-editor">
              <label className="answer-editor__content">
                <input
                  className="form-control"
                  value={draft.content}
                  onChange={(event) =>
                    setDraftAnswers?.((current) => ({
                      ...current,
                      [answer.id]: {
                        ...draft,
                        content: event.target.value,
                      },
                    }))
                  }
                  onBlur={() => handleSaveAnswer?.(answer.id)}
                />
              </label>

              <CheckField
                className="inline-form-check"
                label={t('quizzes.answers.correctCheckbox')}
                type="checkbox"
                checked={draft.isCorrect ?? false}
                onChange={(event) => {
                  const updatedDraft = {
                    ...draft,
                    isCorrect: event.target.checked,
                  };

                  setDraftAnswers?.((current) => ({
                    ...current,
                    [answer.id]: updatedDraft,
                  }));

                  void handleSaveAnswer?.(answer.id, updatedDraft);
                }}
              />

              <div className="answer-editor__actions">
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => onDeleteAnswer?.(question.id, answer.id)}
                >
                  <i className="fa-solid fa-trash  me-1" />
                  {t('quizzes.answers.deleteButton')}
                </button>
              </div>
            </div>
          );
        })}
      </>
    );
  }

  if (mode === 'play') {
    return (
      <>
        {question.answers.map((answer) => (
          <div
            key={answer.id}
            className={`answer-card ${answer.isCorrect ? 'answer-card' : 'answer-card'}`}
            onClick={() => onPlay?.(answer.id)}
          >
            <p className="answer-card__content">{answer.content}</p>

            <span className="answer-card__badge">
              {answer.isCorrect ? t('quizzes.answers.correct') : t('quizzes.answers.incorrect')}
            </span>
          </div>
        ))}
      </>
    );
  }

  return (
    <>
      {question.answers.map((answer) => (
        <div
          key={answer.id}
          className={`answer-card ${answer.isCorrect ? 'answer-card--correct' : 'answer-card--incorrect'}`}
        >
          <div className="answer-card__icon" aria-hidden="true">
            <i className={`fa-solid ${answer.isCorrect ? 'fa-circle-check' : 'fa-circle-xmark'}`} />
          </div>

          <p className="answer-card__content">{answer.content}</p>

          <span className="answer-card__badge">
            {answer.isCorrect ? t('quizzes.answers.correct') : t('quizzes.answers.incorrect')}
          </span>
        </div>
      ))}
    </>
  );
}
