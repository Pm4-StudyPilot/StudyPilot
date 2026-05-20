import { useParams, Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { api } from '../services/api.ts';
import { QuestionWithAnswersDto, QuizDto } from '../types/dto.ts';
import QuestionList from '../components/quizzes/QuestionList.tsx';
import DashboardLayout from '../components/shared/layout/DashboardLayout.tsx';

export default function QuizDetailPage() {
  const { courseId, quizId } = useParams<{ courseId: string; quizId: string }>();
  const [quiz, setQuiz] = useState<QuizDto | null>(null);
  const [questions, setQuestions] = useState<QuestionWithAnswersDto[]>([]);
  const [questionsError, setQuestionsError] = useState('');
  const [questionsLoading, setQuestionsLoading] = useState(true);

  useEffect(() => {
    if (!courseId) return;
    if (!quizId) return;

    Promise.all([
      api.get<QuizDto>(`/courses/${courseId}/quizzes/${quizId}`),
      api.get<QuestionWithAnswersDto[]>(`/courses/${courseId}/quizzes/${quizId}/questions`),
    ])
      .then(([quizResponse, questionResponse]) => {
        setQuiz(quizResponse);
        setQuestions(questionResponse);
      })
      .catch((err) => {
        setQuestionsError(err instanceof Error ? err.message : 'Failed to load quiz');
      })
      .finally(() => setQuestionsLoading(false));
  }, [courseId, quizId]);

  const quizStats = useMemo(() => {
    const answerCount = questions.reduce((total, question) => total + question.answers.length, 0);
    const correctAnswerCount = questions.reduce(
      (total, question) => total + question.answers.filter((answer) => answer.isCorrect).length,
      0
    );

    return {
      answerCount,
      correctAnswerCount,
      questionCount: questions.length,
    };
  }, [questions]);

  const formattedUpdatedDate = quiz
    ? new Date(quiz.updatedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '';

  return (
    <DashboardLayout activeNav="courses" showSearch={false}>
      <section className="dashboard-page-stack">
        <Link
          to={courseId ? `/courses/${courseId}` : '/'}
          className="course-detail__back-link text-secondary text-decoration-none d-inline-flex align-items-center gap-2 mb-4"
        >
          <i className="fa-solid fa-chevron-left" />
          Back to course
        </Link>

        {questionsLoading && (
          <div className="dashboard-state panel dashboard-state--loading course-detail__section-card p-4">
            <div className="spinner-border text-secondary" role="status">
              <span className="visually-hidden">Loading quiz...</span>
            </div>
          </div>
        )}

        {!questionsLoading && questionsError && (
          <div className="dashboard-state panel dashboard-state--error course-detail__section-card">
            {questionsError}
          </div>
        )}

        {!questionsLoading && !questionsError && (
          <div className="quiz-detail__content">
            <section className="quiz-detail__hero">
              <div className="quiz-detail__hero-copy panel">
                <div className="quiz-detail__eyebrow">
                  <span className="quiz-detail__pill">
                    <i className="fa-solid fa-circle-question" />
                    Quiz
                  </span>
                  <span className="quiz-detail__meta-line">
                    {quiz?.isOrderRandom ? 'Randomized question order' : 'Fixed question order'}
                  </span>
                </div>

                <h1 className="quiz-detail__title">{quiz?.title ?? 'Quiz Detail'}</h1>

                <p className="quiz-detail__description">
                  {quiz?.description?.trim() ||
                    'Review the questions and answers before starting this quiz.'}
                </p>

                <div className="quiz-detail__actions">
                  <button type="button" className="btn btn-primary quiz-detail__play-button">
                    <i className="fa-solid fa-play" />
                    Play
                  </button>
                  <span className="quiz-detail__updated">
                    <i className="fa-regular fa-clock" />
                    Updated {formattedUpdatedDate || 'recently'}
                  </span>
                </div>
              </div>

              <aside className="quiz-detail__summary-card panel" aria-label="Quiz summary">
                <h1 className="quiz-detail__summary-title">Overview</h1>

                <div className="quiz-detail__summary-grid">
                  <div className="quiz-detail__stat">
                    <span className="quiz-detail__stat-icon quiz-detail__stat-icon--questions">
                      <i className="fa-regular fa-circle-question" />
                    </span>
                    <span className="quiz-detail__stat-copy">
                      <span className="quiz-detail__stat-value">{quizStats.questionCount}</span>
                      <span className="quiz-detail__stat-label">
                        Question{quizStats.questionCount === 1 ? '' : 's'}
                      </span>
                    </span>
                  </div>

                  <div className="quiz-detail__stat">
                    <span className="quiz-detail__stat-icon quiz-detail__stat-icon--answers">
                      <i className="fa-solid fa-list-check" />
                    </span>
                    <span className="quiz-detail__stat-copy">
                      <span className="quiz-detail__stat-value">{quizStats.answerCount}</span>
                      <span className="quiz-detail__stat-label">
                        Answer{quizStats.answerCount === 1 ? '' : 's'}
                      </span>
                    </span>
                  </div>

                  <div className="quiz-detail__stat">
                    <span className="quiz-detail__stat-icon quiz-detail__stat-icon--correct">
                      <i className="fa-solid fa-circle-check" />
                    </span>
                    <span className="quiz-detail__stat-copy">
                      <span className="quiz-detail__stat-value">
                        {quizStats.correctAnswerCount}
                      </span>
                      <span className="quiz-detail__stat-label">Correct</span>
                    </span>
                  </div>
                </div>
              </aside>
            </section>

            <section className="quiz-detail__questions-panel panel">
              <div className="quiz-detail__section-header">
                <h2 className="quiz-detail__section-title">Questions and answers</h2>
                <span className="quiz-detail__question-count">
                  {quizStats.questionCount} item{quizStats.questionCount !== 1 ? 's' : ''}
                </span>
              </div>

              <QuestionList questions={questions} />
            </section>
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}
