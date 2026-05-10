import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/shared/layout/Navbar';

export default function QuizDetailPage() {
  const { courseId, quizId } = useParams<{ courseId: string; quizId: string }>();

  return (
    <>
      <Navbar />
      <div className="container mt-4">
        <Link
          to={courseId ? `/courses/${courseId}` : '/'}
          className="course-detail__back-link text-secondary text-decoration-none d-inline-flex align-items-center gap-2 mb-4"
        >
          <i className="fa-solid fa-chevron-left" />
          Back to course
        </Link>

        <div className="course-panel rounded p-4">
          <h2 className="text-white fw-bold mb-3">Quiz Detail</h2>
          <p className="text-secondary mb-2">Quiz ID: {quizId}</p>
          <p className="text-secondary">This page is empty for now.</p>
        </div>
      </div>
    </>
  );
}
