import { Link } from 'react-router-dom';
import { QuizDto } from '../../types/dto';

interface QuizCardProps {
  quiz: QuizDto;
}

export default function QuizCard({ quiz }: QuizCardProps) {
  const formattedDate = new Date(quiz.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <Link
      to={`/courses/${quiz.courseId}/quizzes/${quiz.id}`}
      className="quiz-card text-decoration-none"
    >
      <div>
        <div className="d-flex align-items-center gap-3">
          <div className="flex-grow-1">
            <h4 className="quiz-card__title">{quiz.title}</h4>
            <p className="quiz-card__description">
              {quiz.description ?? 'No description provided.'}
            </p>
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <span className="quiz-card__meta">
                <i className="fa-regular fa-calendar me-1" />
                Added {formattedDate}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
