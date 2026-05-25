export const questionTypes = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'CARD'] as const;
export type QuestionTypeValue = (typeof questionTypes)[number];
