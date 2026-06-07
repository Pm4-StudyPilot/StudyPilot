import { DragEndEvent, UniqueIdentifier } from '@dnd-kit/core';
import { AnswerDto, QuestionWithAnswersDto } from '../../types/dto.ts';
import { arrayMove } from '@dnd-kit/sortable';

export function handleDragEnd(
  event: DragEndEvent,
  question: QuestionWithAnswersDto,
  onReorderAnswers: (questionId: string, answers: AnswerDto[]) => void
) {
  const { active, over } = event;

  if (!over || active.id === over.id) return;

  const reordered = reorderAnswers(question.answers, active.id, over.id);

  onReorderAnswers(question.id, reordered);
}

export function reorderAnswers(
  answers: AnswerDto[],
  activeId: UniqueIdentifier,
  overId: UniqueIdentifier
) {
  const oldIndex = answers.findIndex((a) => a.id === activeId);
  const newIndex = answers.findIndex((a) => a.id === overId);

  return arrayMove(answers, oldIndex, newIndex);
}
