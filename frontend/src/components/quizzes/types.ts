import { QuestionWithAnswersDto } from '../../types/dto.ts';

export const questionTypeOptions = [
  { label: 'Single Choice', value: 'SINGLE_CHOICE' },
  { label: 'Multiple Choice', value: 'MULTIPLE_CHOICE' },
  { label: 'Card', value: 'CARD' },
];
export interface QuestionFormState {
  title: string;
  description: string;
  type: QuestionWithAnswersDto['type'];
}

export interface AnswerFormState {
  content: string;
  isCorrect: boolean;
}
