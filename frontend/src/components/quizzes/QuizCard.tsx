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
      className="text-decoration-none"
      style={{ display: 'block' }}
    >
      <div
        className="quiz-card rounded p-3 mb-2"
        style={{
          background: 'var(--color-panel, #1e1e2e)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="d-flex align-items-center gap-3">
          <div className="flex-grow-1">
            <h4 className="text-white fw-semibold mb-1">{quiz.title}</h4>
            <p className="mb-2 text-secondary" style={{ fontSize: '0.92rem' }}>
              {quiz.description ?? 'No description provided.'}
            </p>
            <div className="d-flex flex-wrap gap-2 align-items-center">
              <span className="text-secondary" style={{ fontSize: '0.85rem' }}>
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
