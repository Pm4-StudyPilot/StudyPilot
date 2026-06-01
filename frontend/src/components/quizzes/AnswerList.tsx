import React from 'react';
import { useTranslation } from 'react-i18next';
import { AnswerDto, QuestionWithAnswersDto } from '../../types/dto';
import CheckField from '../shared/form/CheckField';
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';

import {
  SortableContext,
  useSortable,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { reorderAnswers } from './types.ts';
import { t } from 'i18next';

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
  onReorderAnswers: (questionId: string, reorderedAnswers: AnswerDto[]) => Promise<void>;
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

function SortableAnswerItem({
  answer,
  children,
}: {
  answer: AnswerDto;
  children: React.ReactNode;
}) {
  const { setNodeRef, transform, transition, attributes, listeners, isDragging } = useSortable({
    id: answer.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="answer-card__drag">
      <span
        {...attributes}
        {...listeners}
        className="answer-card__drag-handle text-secondary"
        aria-label={t('quizzes.answers.dragHandleAria')}
        data-testid="task-drag-handle"
      >
        <i className="fa-solid fa-grip-vertical" />
      </span>

      {children}
    </div>
  );
}

function EditAnswerList({
  question,
  draftAnswers,
  setDraftAnswers,
  handleSaveAnswer,
  onDeleteAnswer,
  onReorderAnswers,
}: EditProps) {
  const { t } = useTranslation();
  const orderedAnswers = question.answers.slice();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const reordered = reorderAnswers(question.answers, active.id, over.id);

    onReorderAnswers(question.id, reordered);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={orderedAnswers.map((a) => a.id)}
        strategy={verticalListSortingStrategy}
      >
        {orderedAnswers.map((answer) => {
          const draft = draftAnswers[answer.id] ?? {
            content: answer.content,
            isCorrect: answer.isCorrect ?? false,
          };

          return (
            <SortableAnswerItem key={answer.id} answer={answer}>
              <div className="answer-editor">
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
                    <i className="fa-solid fa-trash me-1" />
                    {t('quizzes.answers.deleteButton')}
                  </button>
                </div>
              </div>
            </SortableAnswerItem>
          );
        })}
      </SortableContext>
    </DndContext>
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
