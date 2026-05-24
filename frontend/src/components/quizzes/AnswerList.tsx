import { QuestionWithAnswersDto } from '../../types/dto';
import CheckField from '../shared/form/CheckField';
import React from 'react';

type BaseProps = {
  question: QuestionWithAnswersDto;
  mode?: string;
};

type ViewProps = BaseProps & {
  mode?: 'view';
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
  onPlay: (answerId?: string) => void;
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
  return (
    <>
      {question.answers.map((answer) => {
        const draft = draftAnswers[answer.id] ?? {
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
              label="Correct"
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
                Delete
              </button>
            </div>
          </div>
        );
      })}
    </>
  );
}

function PlayAnswerList({ question, revealed = false, onPlay }: PlayProps) {
  const isChoiceQuestion = question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_CHOICE';

  if (!isChoiceQuestion) {
    return (
      <>
        {revealed &&
          question.answers
            .filter((answer) => answer.isCorrect)
            .map((answer) => (
              <div key={answer.id} className="answer-card answer-card--correct">
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
            className={`answer-card answer-card--play ${answerStateClass}`}
            onClick={() => onPlay?.(answer.id)}
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
                {answer.isCorrect ? 'Correct' : 'Incorrect'}
              </span>
            )}
          </button>
        );
      })}
    </>
  );
}

function ViewAnswerList({ question }: ViewProps) {
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

          <span className="answer-card__badge">{answer.isCorrect ? 'Correct' : 'Incorrect'}</span>
        </div>
      ))}
    </>
  );
}
