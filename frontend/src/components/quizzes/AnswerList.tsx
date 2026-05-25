import React from 'react';
import { useTranslation } from 'react-i18next';
import { AnswerDto, QuestionWithAnswersDto } from '../../types/dto';
import CheckField from '../shared/form/CheckField';

type BaseProps = {
  question: QuestionWithAnswersDto;
  mode?: string;
};

type ViewProps = BaseProps & {
  mode?: 'view';
  selectedAnswers?: AnswerDto[];
};

type EditProps = BaseProps & {
  mode: 'edit';
  draftAnswers: Record<string, { content: string; isCorrect: boolean }>;
  setDraftAnswers: React.Dispatch<
    React.SetStateAction<Record<string, { content: string; isCorrect: boolean }>>
  >;
  handleSaveAnswer: (
    answerId: string,
    updatedDraft?: { content: string; isCorrect: boolean }
  ) => void;
  onDeleteAnswer: (questionId: string, answerId: string) => void;
};

type PlayProps = BaseProps & {
  mode: 'play';
  revealed?: boolean;
  onPlayed: (answerId?: string) => void;
  selectedAnswers?: AnswerDto[];
};

type AnswerListProps = ViewProps | EditProps | PlayProps;

export default function AnswerList(props: AnswerListProps) {
  switch (props.mode) {
    case 'edit':
      return <EditAnswerList {...props} />;

    case 'play':
      return <PlayAnswerList {...props} />;

    default:
      return <ViewAnswerList {...props} />;
  }
}

function EditAnswerList({
  question,
  draftAnswers,
  setDraftAnswers,
  handleSaveAnswer,
  onDeleteAnswer,
}: EditProps) {
  const { t } = useTranslation();
  return (
    <>
      {question.answers.map((answer) => {
        const draft = draftAnswers[answer.id] ?? {
          content: answer.content,
          isCorrect: answer.isCorrect ?? false,
        };

        return (
          <div className="answer-editor" key={answer.id}>
            <label className="answer-editor__content">
              <input
                className="form-control"
                value={draft.content}
                onChange={(event) =>
                  setDraftAnswers((current) => ({
                    ...current,
                    [answer.id]: {
                      ...draft,
                      content: event.target.value,
                    },
                  }))
                }
                onBlur={() => handleSaveAnswer(answer.id)}
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

                setDraftAnswers((current) => ({
                  ...current,
                  [answer.id]: updatedDraft,
                }));

                void handleSaveAnswer(answer.id, updatedDraft);
              }}
            />

            <div className="answer-editor__actions">
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                onClick={() => onDeleteAnswer(question.id, answer.id)}
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

function PlayAnswerList({ question, revealed = false, onPlayed, selectedAnswers = [] }: PlayProps) {
  const isChoiceQuestion = question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_CHOICE';
  const { t } = useTranslation();

  if (!isChoiceQuestion) {
    return (
      <>
        {revealed &&
          question.answers.map((answer) => (
            <div
              className={
                'answer-card answer-card--correct' +
                (selectedAnswers.find((a) => a.id === answer.id) ? ' answer-card--selected' : '')
              }
              key={answer.id}
            >
              <div className="answer-card__icon">
                <i className="fa-solid fa-circle-check" />
              </div>

              <p className="answer-card__content">{answer.content}</p>
            </div>
          ))}
      </>
    );
  }

  return (
    <>
      {question.answers.map((answer) => {
        let answerStateClass = '';

        if (revealed) {
          answerStateClass = answer.isCorrect ? 'answer-card--correct' : 'answer-card--incorrect';
        }
        return (
          <button
            key={answer.id}
            type="button"
            className={`answer-card answer-card--play ${answerStateClass} ${selectedAnswers.find((a) => a.id === answer.id) ? ' answer-card--selected' : ''}`}
            onClick={() => onPlayed?.(answer.id)}
            disabled={revealed}
          >
            {revealed && (
              <div className="answer-card__icon" aria-hidden="true">
                <i
                  className={`fa-solid ${answer.isCorrect ? 'fa-circle-check' : 'fa-circle-xmark'}`}
                />
              </div>
            )}
            <p className="answer-card__content">{answer.content}</p>

            {revealed && (
              <span className="answer-card__badge">
                {answer.isCorrect ? t('quizzes.answers.correct') : t('quizzes.answers.incorrect')}
              </span>
            )}
          </button>
        );
      })}
    </>
  );
}

function ViewAnswerList({ question, selectedAnswers = [] }: ViewProps) {
  const { t } = useTranslation();
  return (
    <>
      {question.answers.map((answer) => (
        <div
          key={answer.id}
          className={`answer-card ${answer.isCorrect ? 'answer-card--correct' : 'answer-card--incorrect'} ${selectedAnswers.find((a) => a.id === answer.id) ? ' answer-card--selected' : ''}`}
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
