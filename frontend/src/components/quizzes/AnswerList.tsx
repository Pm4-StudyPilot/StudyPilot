import { QuestionWithAnswersDto } from '../../types/dto';
import CheckField from '../shared/form/CheckField';

interface AnswerListProps {
  question: QuestionWithAnswersDto;
  mode?: 'view' | 'edit' | 'play';
  revealed?: boolean;
  draftAnswers?: Record<string, { content: string; isCorrect: boolean }>;
  setDraftAnswers?: (draftAnswers: Record<string, { content: string; isCorrect: boolean }>) => void;
  handleSaveAnswer?: (answerId: string) => void;
  onDeleteAnswer?: (questionId: string, answerId: string) => void;
  onPlay?: (answerId?: string) => void;
}

export default function AnswerList({
  mode = 'view',
  question,
  draftAnswers,
  setDraftAnswers,
  handleSaveAnswer,
  onDeleteAnswer,
  onPlay,
  revealed = false,
}: AnswerListProps) {
  if (mode === 'edit') {
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

  if (mode === 'play') {
    const isChoiceQuestion =
      question.type === 'SINGLE_CHOICE' || question.type === 'MULTIPLE_CHOICE';

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

    let answerStateClass = '';

    if (revealed) {
      answerStateClass = answer.isCorrect ? 'answer-card--correct' : 'answer-card--incorrect';
    }

    return (
      <>
        {question.answers.map((answer) => (
          <button
            key={answer.id}
            type="button"
            className={`answer-card answer-card--play ${answerStateClass}`}
            onClick={() => onPlay?.(answer.id)}
            disabled={revealed}
          >
            <p className="answer-card__content">{answer.content}</p>

            {revealed && (
              <span className="answer-card__badge">
                {answer.isCorrect ? 'Correct' : 'Incorrect'}
              </span>
            )}
          </button>
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

          <span className="answer-card__badge">{answer.isCorrect ? 'Correct' : 'Incorrect'}</span>
        </div>
      ))}
    </>
  );
}
