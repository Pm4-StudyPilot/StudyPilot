import { AnswerDto, QuestionWithAnswersDto } from '../../types/dto.ts';
import { arrayMove } from '@dnd-kit/sortable';
import { UniqueIdentifier } from '@dnd-kit/core';

export const questionTypes = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'CARD'] as const;
export type QuestionTypeValue = (typeof questionTypes)[number];

export interface QuestionFormState {
  title: string;
  description: string;
  type: QuestionWithAnswersDto['type'];
}

export interface AnswerFormState {
  content: string;
  isCorrect: boolean;
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
