import { QuestionWithAnswersDto } from '../../types/dto';
import QuestionCard from './QuestionCard.tsx';

interface QuestionListProps {
  questions: QuestionWithAnswersDto[];
}

/**
 * QuestionList
 *
 * Displays all questions for a quiz.
 *
 * Responsibilities:
 * - Render questions using QuestionCard
 * - Display an empty state when no questions exist
 */
export default function QuestionList({ questions }: QuestionListProps) {
  if (questions.length === 0) {
    return (
      <div className="question-list__empty">
        <div className="question-list__empty-icon">
          <i className="fa-regular fa-circle-question" />
        </div>
        <h3>No questions yet</h3>
        <p className="mb-0">Once questions are added, they will appear here.</p>
      </div>
    );
  }

  return (
    <div className="question-list">
      {questions.map((question, index) => (
        <QuestionCard key={question.id} question={question} index={index + 1} />
      ))}
    </div>
  );
}
