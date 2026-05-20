import { useState } from 'react';
import { QuestionWithAnswersDto } from '../../types/dto';

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
  index: number;
  editable?: boolean;
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
  index,
  editable = false,
  onUpdateQuestion,
  onDeleteQuestion,
  onCreateAnswer,
  onUpdateAnswer,
  onDeleteAnswer,
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
          isCorrect: answer.isCorrect,
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

  async function handleSaveQuestion() {
    if (!draftQuestion.title.trim()) return;

    setSavingQuestion(true);

    try {
      await onUpdateQuestion?.(question.id, {
        title: draftQuestion.title.trim(),
        description: draftQuestion.description.trim(),
        type: draftQuestion.type,
      });
    } finally {
      setSavingQuestion(false);
    }
  }

  async function handleSaveAnswer(answerId: string) {
    const draft = draftAnswers[answerId];
    if (!draft?.content.trim()) return;

    setSavingAnswerId(answerId);

    try {
      await onUpdateAnswer?.(question.id, answerId, {
        content: draft.content.trim(),
        isCorrect: draft.isCorrect,
      });
    } finally {
      setSavingAnswerId(null);
    }
  }

  async function handleCreateAnswer() {
    if (!newAnswer.content.trim()) return;

    setAddingAnswer(true);

    try {
      await onCreateAnswer?.(question.id, {
        content: newAnswer.content.trim(),
        isCorrect: newAnswer.isCorrect,
      });

      setNewAnswer({
        content: '',
        isCorrect: false,
      });
    } finally {
      setAddingAnswer(false);
    }
  }

  if (editable) {
    return (
      <article className="question-card question-card--editable">
        <header className="question-card__header">
          <div className="question-card__number" aria-hidden="true">
            {index}
          </div>

          <div className="question-card__title-group question-editor">
            <div className="question-editor__fields">
              <label className="question-editor__field">
                <span>Question title</span>
                <input
                  className="form-control"
                  value={draftQuestion.title}
                  onChange={(event) =>
                    setDraftQuestion((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="question-editor__field">
                <span>Description</span>
                <textarea
                  className="form-control"
                  value={draftQuestion.description}
                  onChange={(event) =>
                    setDraftQuestion((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  rows={3}
                />
              </label>

              <label className="question-editor__field">
                <span>Question type</span>
                <select
                  className="form-select"
                  value={draftQuestion.type}
                  onChange={(event) =>
                    setDraftQuestion((current) => ({
                      ...current,
                      type: event.target.value as QuestionWithAnswersDto['type'],
                    }))
                  }
                >
                  <option value="SINGLE_CHOICE">Single choice</option>
                  <option value="MULTIPLE_CHOICE">Multiple choice</option>
                  <option value="CARD">Card</option>
                </select>
              </label>
            </div>

            <div className="question-editor__actions">
              <button
                type="button"
                className="btn btn-primary question-editor__save-button"
                disabled={!draftQuestion.title.trim() || savingQuestion}
                onClick={handleSaveQuestion}
              >
                <i className="fa-solid fa-floppy-disk" />
                {savingQuestion ? 'Saving...' : 'Save question'}
              </button>
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                onClick={() => onDeleteQuestion?.(question.id)}
              >
                <i className="fa-solid fa-trash me-1" />
                Delete
              </button>
            </div>
          </div>
        </header>

        <div className="answer-list answer-list--editable">
          {question.answers.map((answer) => {
            const draft = draftAnswers[answer.id] ?? {
              content: answer.content,
              isCorrect: answer.isCorrect,
            };

            return (
              <div key={answer.id} className="answer-editor">
                <label className="answer-editor__content">
                  <span>Answer</span>
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
                  />
                </label>

                <label className="answer-editor__check">
                  <input
                    type="checkbox"
                    checked={draft.isCorrect}
                    onChange={(event) =>
                      setDraftAnswers((current) => ({
                        ...current,
                        [answer.id]: {
                          ...draft,
                          isCorrect: event.target.checked,
                        },
                      }))
                    }
                  />
                  Correct
                </label>

                <div className="answer-editor__actions">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    disabled={!draft.content.trim() || savingAnswerId === answer.id}
                    onClick={() => handleSaveAnswer(answer.id)}
                  >
                    <i className="fa-solid fa-floppy-disk me-1" />
                    {savingAnswerId === answer.id ? 'Saving...' : 'Save'}
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => onDeleteAnswer?.(question.id, answer.id)}
                  >
                    <i className="fa-solid fa-trash  me-1" />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}

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
        </div>
      </article>
    );
  }

  return (
    <article className="question-card">
      <header className="question-card__header">
        <div className="question-card__number" aria-hidden="true">
          {index}
        </div>

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
        {question.answers.map((answer) => (
          <div
            key={answer.id}
            className={`answer-card ${answer.isCorrect ? 'answer-card--correct' : 'answer-card--incorrect'}`}
          >
            <div className="answer-card__icon" aria-hidden="true">
              <i
                className={`fa-solid ${answer.isCorrect ? 'fa-circle-check' : 'fa-circle-xmark'}`}
              />
            </div>

            <p className="answer-card__content">{answer.content}</p>

            <span className="answer-card__badge">{answer.isCorrect ? 'Correct' : 'Incorrect'}</span>
          </div>
        ))}
      </div>
    </article>
  );
}
