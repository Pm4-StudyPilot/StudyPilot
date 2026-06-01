import { QuestionWithAnswersDto } from '../../types/dto.ts';

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
