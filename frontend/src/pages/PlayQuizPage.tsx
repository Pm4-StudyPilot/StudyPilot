import { Link, useParams, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import DashboardLayout from '../components/shared/layout/DashboardLayout';
import QuestionCard from '../components/quizzes/QuestionCard';
import { api } from '../services/api';
import { AnswerDto, QuestionWithAnswersDto, QuizDto } from '../types/dto';

type History = {
  question: QuestionWithAnswersDto;
  selectedAnswers: AnswerDto[];
  correct: number;
};

function getScoreText(scoreFraction: number) {
  if (scoreFraction === 0.9) return 'Perfect!';
  if (scoreFraction >= 0.9) return 'Excellent!';
  if (scoreFraction >= 0.7) return 'Good job!';
  if (scoreFraction >= 0.5) return 'Not bad!';
  return 'Keep practicing...';
}

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
  const [history, setHistory] = useState<History[]>([]);
  const [showStats, setShowStats] = useState(false);

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
        setHistory(
          loadedQuestions.map((question) => {
            return {
              question: question,
              selectedAnswers: [],
              correct: 0,
            };
          })
        );
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load quiz');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [courseId, quizId]);

  const currentQuestion = questions[currentQuestionIndex];
  const currentHistory = history[currentQuestionIndex];

  const needsEvaluation = useMemo(() => {
    return questions[currentQuestionIndex]?.type === 'CARD';
  }, [currentQuestionIndex, questions]);

  const isLastQuestion = useMemo(() => {
    return currentQuestionIndex >= questions.length - 1;
  }, [currentQuestionIndex, questions.length]);

  function toggleAnswerHistory(answer: AnswerDto) {
    setHistory((prev) => {
      return prev.map((item, index) => {
        if (index !== currentQuestionIndex) return item;

        const alreadySelected = item.selectedAnswers.some((a) => a.id === answer.id);

        const selectedAnswers = alreadySelected
          ? item.selectedAnswers.filter((a) => a.id !== answer.id)
          : [...item.selectedAnswers, answer];

        let correct = item.correct;

        if (answer.isCorrect) {
          if (alreadySelected) {
            correct -= 1;
          } else {
            correct += 1;
          }
        }

        return {
          ...item,
          correct,
          selectedAnswers,
        };
      });
    });
  }
  function setCurrentHistory(correct: boolean) {
    setHistory((prev) => {
      const updated = [...prev];

      updated[currentQuestionIndex] = {
        ...updated[currentQuestionIndex],
        correct: correct ? 1 : 0,
      };

      return updated;
    });
  }
  function handlePlay(answerId?: string) {
    if (answerId) {
      const answer = currentQuestion.answers.find((i) => i.id === answerId);

      if (answer) {
        toggleAnswerHistory(answer);
      } else {
        throw new Error('Question not found');
      }
    }
    if (currentQuestion.type === 'SINGLE_CHOICE' || !answerId) setRevealed(true);
  }
  function handleCardPlay(correct: boolean) {
    setCurrentHistory(correct);
    if (isLastQuestion) {
      setShowStats(true);
    } else {
      handleNextQuestion();
    }
  }

  const navigate = useNavigate();

  function handleNextQuestion() {
    setCurrentQuestionIndex((prev) => prev + 1);
    setRevealed(false);
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
        {(() => {
          if (loading)
            return (
              <section className="dashboard-page-stack">
                <div className="dashboard-state panel p-4 course-detail__section-card">
                  <div className="spinner-border text-secondary" role="status" />
                </div>
              </section>
            );
          if (error || !quiz || !currentQuestion)
            return (
              <div className="dashboard-state panel dashboard-state--error">
                {error || 'Quiz not found'}
              </div>
            );
          if (showStats) {
            return (
              <div className="panel play-quiz">
                <div className="play-quiz__header">
                  <div>
                    <h1 className="play-quiz__title">Result</h1>
                  </div>
                </div>
                {(() => {
                  const scores = history.map((hist) => {
                    if (hist.question.type !== 'MULTIPLE_CHOICE') {
                      return hist.correct;
                    }
                    const correctCount = hist.question.answers.filter((a) => a.isCorrect).length;
                    const incorrectSelectedCount = hist.selectedAnswers.length - hist.correct;

                    return Math.max(0, (hist.correct - incorrectSelectedCount) / correctCount);
                  });
                  const scoreSum = scores.reduce((prev, curr) => {
                    return prev + curr;
                  }, 0);
                  const fraction = scoreSum / history.length;
                  return (
                    <div className="play-quiz__history">
                      <h4>
                        You got {scoreSum} / {history.length} Points. {getScoreText(fraction)}
                      </h4>
                      {history.map((history, index) => (
                        <QuestionCard
                          question={history.question}
                          mode="view"
                          revealed={true}
                          score={scores[index]}
                          selectedAnswers={history.selectedAnswers}
                        />
                      ))}
                    </div>
                  );
                })()}
                <div className="play-quiz__footer">
                  <button
                    type="button"
                    className="btn btn-primary play-quiz__next-button"
                    onClick={() => navigate(`/courses/${courseId}/quizzes/${quizId}`)}
                  >
                    <i className="fa-solid fa-arrow-right" />
                    Finish
                  </button>
                </div>
              </div>
            );
          }
          return (
            <div className="panel play-quiz">
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
                selectedAnswers={currentHistory.selectedAnswers}
              />

              <div className="play-quiz__footer">
                {!revealed ? (
                  <p className="text-secondary mb-0">Select an answer or reveal the solution.</p>
                ) : (
                  <>
                    {(() => {
                      if (needsEvaluation) {
                        return (
                          <>
                            <button
                              type="button"
                              className="btn btn-primary play-quiz__next-button me-3"
                              onClick={() => handleCardPlay(true)}
                            >
                              Correct
                            </button>
                            <button
                              type="button"
                              className="btn btn-primary play-quiz__next-button"
                              onClick={() => handleCardPlay(false)}
                            >
                              Incorrect
                            </button>
                          </>
                        );
                      }
                      if (isLastQuestion) {
                        return (
                          <button
                            type="button"
                            className="btn btn-primary play-quiz__next-button"
                            onClick={() => setShowStats(true)}
                          >
                            <i className="fa-solid fa-arrow-right" />
                            View Stats
                          </button>
                        );
                      }
                      return (
                        <button
                          type="button"
                          className="btn btn-primary play-quiz__next-button"
                          onClick={handleNextQuestion}
                        >
                          <i className="fa-solid fa-arrow-right" />
                          Next question
                        </button>
                      );
                    })()}
                  </>
                )}
              </div>
            </div>
          );
        })()}
      </section>
    </DashboardLayout>
  );
}
