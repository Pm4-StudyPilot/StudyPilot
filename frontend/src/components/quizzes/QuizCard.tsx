import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { QuizDto } from '../../types/dto';
import { formatDate } from '../../utils/formatDate';

interface QuizCardProps {
  quiz: QuizDto;
}

export default function QuizCard({ quiz }: QuizCardProps) {
  const { t } = useTranslation();
  const formattedDate = formatDate(quiz.createdAt);

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
              {quiz.description ?? t('quizzes.card.noDescription')}
            </p>
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <span className="quiz-card__meta">
                <i className="fa-regular fa-calendar me-1" />
                {t('quizzes.card.added', { date: formattedDate })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
