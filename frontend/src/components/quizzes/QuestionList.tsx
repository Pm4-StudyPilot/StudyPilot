import { useState } from 'react';
import { QuestionWithAnswersDto } from '../../types/dto';
import QuestionCard from './QuestionCard.tsx';
import InputField from '../shared/form/InputField';
import TextAreaField from '../shared/form/TextAreaField';
import SelectField from '../shared/form/SelectField';
import { questionTypeOptions } from './types';

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

/**
 * QuestionList
 *
 * Displays all questions for a quiz.
 *
 * Responsibilities:
 * - Render questions using QuestionCard
 * - Display an empty state when no questions exist
 * - Render an add-question area when edit mode is enabled
 */
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
  const [newQuestion, setNewQuestion] = useState<NewQuestionFormState>({
    title: '',
    description: '',
    type: 'SINGLE_CHOICE',
  });
  const [saving, setSaving] = useState(false);

  async function handleCreateQuestion() {
    if (!newQuestion.title.trim()) return;

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
          <h3>No questions yet</h3>
          <p className="mb-0">Once questions are added, they will appear here.</p>
        </div>
      )}

      {questions.length === 0 && editable && (
        <div className="question-list__empty question-list__empty--editable">
          <h3>No questions yet</h3>
          <p className="mb-0">Create the first question below.</p>
        </div>
      )}

      {questions.map((question) => (
        <QuestionCard
          key={question.id}
          question={question}
          mode={editable ? 'edit' : 'view'}
          onUpdateQuestion={onUpdateQuestion}
          onDeleteQuestion={onDeleteQuestion}
          onCreateAnswer={onCreateAnswer}
          onUpdateAnswer={onUpdateAnswer}
          onDeleteAnswer={onDeleteAnswer}
        />
      ))}

      {editable && (
        <section className="question-list__new-question">
          <div className="question-list__new-question-header">
            <h3>Add a new question</h3>
          </div>

          <div className="question-editor__fields">
            <InputField
              label="Question title"
              name="title"
              value={newQuestion.title}
              onChange={(event) =>
                setNewQuestion((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              placeholder="e.g. What is the capital of France?"
            />

            <TextAreaField
              className="form-control"
              label="Description"
              value={newQuestion.description}
              onChange={(event) =>
                setNewQuestion((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Additional explanation or hint"
              rows={3}
            />

            <SelectField
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
          >
            <i className="fa-solid fa-plus" />
            {saving ? 'Adding...' : 'Add question'}
          </button>
        </section>
      )}
    </div>
  );
}
