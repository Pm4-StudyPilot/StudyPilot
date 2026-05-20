import { QuestionWithAnswersDto } from '../../types/dto';

interface QuestionCardProps {
  question: QuestionWithAnswersDto;
  index: number;
}

function formatQuestionType(type: QuestionWithAnswersDto['type']) {
  return type
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function QuestionCard({ question, index }: QuestionCardProps) {
  const correctAnswers = question.answers.filter((answer) => answer.isCorrect).length;

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
