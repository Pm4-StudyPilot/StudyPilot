import { Link, useParams, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../components/shared/layout/DashboardLayout';
import QuestionCard from '../components/quizzes/QuestionCard';
import { api } from '../services/api';
import { QuestionWithAnswersDto, QuizDto } from '../types/dto';

export default function PlayQuizPage() {
  const { courseId, quizId } = useParams<{
    courseId: string;
    quizId: string;
  }>();

  const [quiz, setQuiz] = useState<QuizDto | null>(null);
  const [questions, setQuestions] = useState<QuestionWithAnswersDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!courseId || !quizId) return;

    Promise.all([
      api.get<QuizDto>(`/courses/${courseId}/quizzes/${quizId}`),
      api.get<QuestionWithAnswersDto[]>(`/courses/${courseId}/quizzes/${quizId}/questions`),
    ])
      .then(([quizResponse, questionResponse]) => {
        let loadedQuestions = [...questionResponse];

        if (quizResponse.isOrderRandom) {
          loadedQuestions = loadedQuestions.sort(() => Math.random() - 0.5);
        }

        setQuiz(quizResponse);
        setQuestions(loadedQuestions);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load quiz');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [courseId, quizId]);

  const currentQuestion = questions[currentQuestionIndex];

  const isLastQuestion = useMemo(() => {
    return currentQuestionIndex >= questions.length - 1;
  }, [currentQuestionIndex, questions.length]);

  function handlePlay() {
    setRevealed(true);
  }

  const navigate = useNavigate();

  function handleNextQuestion() {
    if (isLastQuestion) {
      navigate(`/courses/${courseId}/quizzes/${quizId}`);
      return;
    }

    setCurrentQuestionIndex((prev) => prev + 1);
    setRevealed(false);
  }

  if (loading) {
    return (
      <DashboardLayout activeNav="courses" showSearch={false}>
        <div className="dashboard-state panel p-4">
          <div className="spinner-border text-secondary" role="status" />
        </div>
      </DashboardLayout>
    );
  }

  if (error || !quiz || !currentQuestion) {
    return (
      <DashboardLayout activeNav="courses" showSearch={false}>
        <div className="dashboard-state panel dashboard-state--error">
          {error || 'Quiz not found'}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeNav="courses" showSearch={false}>
      <section className="dashboard-page-stack">
        <Link
          to={`/courses/${courseId}/quizzes/${quizId}`}
          className="course-detail__back-link text-secondary text-decoration-none d-inline-flex align-items-center gap-2"
        >
          <i className="fa-solid fa-chevron-left" />
          Back to quiz
        </Link>

        <section className="panel play-quiz">
          <div className="play-quiz__header">
            <div>
              <span className="play-quiz__progress">
                Question {currentQuestionIndex + 1} / {questions.length}
              </span>

              <h1 className="play-quiz__title">{quiz.title}</h1>
            </div>
          </div>

          <QuestionCard
            question={currentQuestion}
            mode="play"
            revealed={revealed}
            onPlayed={handlePlay}
          />

          <div className="play-quiz__footer">
            {!revealed ? (
              <p className="text-secondary mb-0">Select an answer or reveal the solution.</p>
            ) : (
              <button
                type="button"
                className="btn btn-primary play-quiz__next-button"
                onClick={handleNextQuestion}
              >
                <i className="fa-solid fa-arrow-right" />
                {isLastQuestion ? 'Quiz finished' : 'Next question'}
              </button>
            )}
          </div>
        </section>
      </section>
    </DashboardLayout>
  );
}
