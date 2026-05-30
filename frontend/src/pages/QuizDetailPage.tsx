import { useParams, Link } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../services/api.ts';
import { QuestionWithAnswersDto, QuizDto } from '../types/dto.ts';
import QuestionList from '../components/quizzes/QuestionList.tsx';
import DashboardLayout from '../components/shared/layout/DashboardLayout.tsx';
import InputField from '../components/shared/form/InputField.tsx';
import TextareaField from '../components/shared/form/TextareaField.tsx';
import CheckField from '../components/shared/form/CheckField.tsx';
import { formatDate } from '../utils/formatDate.ts';

interface QuizDraftState {
  title: string;
  description: string;
  isOrderRandom: boolean;
}

export default function QuizDetailPage() {
  const { courseId, quizId } = useParams<{ courseId: string; quizId: string }>();
  const { t } = useTranslation();
  const [quiz, setQuiz] = useState<QuizDto | null>(null);
  const [questions, setQuestions] = useState<QuestionWithAnswersDto[]>([]);
  const [questionsError, setQuestionsError] = useState('');
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [quizDraft, setQuizDraft] = useState<QuizDraftState>({
    title: '',
    description: '',
    isOrderRandom: false,
  });
  const [quizError, setQuizError] = useState<string | null>(null);
  const [savingQuiz, setSavingQuiz] = useState(false);

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
        setQuizDraft({
          title: quizResponse.title,
          description: quizResponse.description ?? '',
          isOrderRandom: quizResponse.isOrderRandom,
        });
      })
      .catch((err) => {
        setQuestionsError(err instanceof Error ? err.message : t('quizzes.detail.loadFailed'));
      })
      .finally(() => setQuestionsLoading(false));
  }, [courseId, quizId, t]);

  async function handleUpdateQuiz(patch: Partial<QuizDraftState>) {
    if (!courseId || !quizId || !quiz) return;

    setQuizError(null);
    setSavingQuiz(true);

    try {
      const updated = await api.patch<QuizDto>(`/courses/${courseId}/quizzes/${quizId}`, patch);
      setQuiz(updated);
    } catch (err) {
      setQuizError(err instanceof Error ? err.message : t('quizzes.detail.saveFailed'));
    } finally {
      setSavingQuiz(false);
    }
  }

  function handleSaveTitle() {
    const trimmed = quizDraft.title.trim();
    if (!trimmed) {
      setQuizError(t('validation.quizTitleRequired'));
      return;
    }
    if (quiz && trimmed === quiz.title) return;
    handleUpdateQuiz({ title: trimmed });
  }

  function handleSaveDescription() {
    const trimmed = quizDraft.description.trim();
    if (quiz && trimmed === (quiz.description ?? '')) return;
    handleUpdateQuiz({ description: trimmed });
  }

  async function handleCreateQuestion(data: {
    title: string;
    description: string;
    type: QuestionWithAnswersDto['type'];
  }) {
    if (!courseId || !quizId) return;

    const createdQuestion = await api.post<QuestionWithAnswersDto>(
      `/courses/${courseId}/quizzes/${quizId}/questions`,
      {
        title: data.title,
        description: data.description,
        type: data.type,
      }
    );

    setQuestions((prev) => [...prev, { ...createdQuestion, answers: [] }]);
  }

  async function handleUpdateQuestion(
    questionId: string,
    data: {
      title: string;
      description?: string;
      type: QuestionWithAnswersDto['type'];
    }
  ) {
    if (!courseId || !quizId) return;

    const updatedQuestion = await api.patch<QuestionWithAnswersDto>(
      `/courses/${courseId}/quizzes/${quizId}/questions/${questionId}`,
      data
    );

    setQuestions((prev) =>
      prev.map((question) =>
        question.id === questionId
          ? {
              ...question,
              ...updatedQuestion,
              answers: question.answers,
            }
          : question
      )
    );
  }

  async function handleDeleteQuestion(questionId: string) {
    if (!courseId || !quizId) return;

    await api.delete(`/courses/${courseId}/quizzes/${quizId}/questions/${questionId}`);

    setQuestions((prev) => prev.filter((question) => question.id !== questionId));
  }

  async function handleCreateAnswer(
    questionId: string,
    data: {
      content: string;
      isCorrect: boolean;
    }
  ) {
    if (!courseId || !quizId) return;

    const createdAnswer = await api.post<QuestionWithAnswersDto['answers'][number]>(
      `/courses/${courseId}/quizzes/${quizId}/questions/${questionId}/answers`,
      data
    );

    setQuestions((prev) =>
      prev.map((question) =>
        question.id === questionId
          ? {
              ...question,
              answers: [...question.answers, createdAnswer],
            }
          : question
      )
    );
  }

  async function handleUpdateAnswer(
    questionId: string,
    answerId: string,
    data: {
      content: string;
      isCorrect: boolean;
    }
  ) {
    if (!courseId || !quizId) return;

    const updatedAnswer = await api.patch<QuestionWithAnswersDto['answers'][number]>(
      `/courses/${courseId}/quizzes/${quizId}/questions/${questionId}/answers/${answerId}`,
      data
    );

    setQuestions((prev) =>
      prev.map((question) =>
        question.id === questionId
          ? {
              ...question,
              answers: question.answers.map((answer) =>
                answer.id === answerId ? updatedAnswer : answer
              ),
            }
          : question
      )
    );
  }

  async function handleDeleteAnswer(questionId: string, answerId: string) {
    if (!courseId || !quizId) return;

    await api.delete(
      `/courses/${courseId}/quizzes/${quizId}/questions/${questionId}/answers/${answerId}`
    );

    setQuestions((prev) =>
      prev.map((question) =>
        question.id === questionId
          ? {
              ...question,
              answers: question.answers.filter((answer) => answer.id !== answerId),
            }
          : question
      )
    );
  }

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

  const formattedUpdatedDate = quiz ? formatDate(quiz.updatedAt) : '';

  return (
    <DashboardLayout activeNav="courses" showSearch={false}>
      <section className="dashboard-page-stack">
        <Link
          to={courseId ? `/courses/${courseId}` : '/'}
          className="course-detail__back-link text-secondary text-decoration-none d-inline-flex align-items-center gap-2 mb-4"
        >
          <i className="fa-solid fa-chevron-left" />
          {t('quizzes.detail.backToCourse')}
        </Link>

        {questionsLoading && (
          <div className="dashboard-state panel dashboard-state--loading course-detail__section-card p-4">
            <div className="spinner-border text-secondary" role="status">
              <span className="visually-hidden">{t('quizzes.detail.loadingQuiz')}</span>
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
                    {quiz?.isOrderRandom
                      ? t('quizzes.detail.randomOrder')
                      : t('quizzes.detail.fixedOrder')}
                  </span>
                </div>

                {editMode ? (
                  <div className="quiz-detail__editor question-editor__fields">
                    <InputField
                      label={t('quizzes.detail.titleField')}
                      value={quizDraft.title}
                      onChange={(event) =>
                        setQuizDraft((current) => ({
                          ...current,
                          title: event.target.value,
                        }))
                      }
                      onBlur={handleSaveTitle}
                      aria-label={t('quizzes.detail.titleField')}
                    />

                    <TextareaField
                      label={t('quizzes.detail.descriptionField')}
                      value={quizDraft.description}
                      onChange={(event) =>
                        setQuizDraft((current) => ({
                          ...current,
                          description: event.target.value,
                        }))
                      }
                      onBlur={handleSaveDescription}
                      rows={3}
                      aria-label={t('quizzes.detail.descriptionField')}
                    />

                    <CheckField
                      label={t('quizzes.detail.randomizeField')}
                      type="checkbox"
                      checked={quizDraft.isOrderRandom}
                      onChange={(event) => {
                        const next = event.target.checked;
                        setQuizDraft((current) => ({ ...current, isOrderRandom: next }));
                        handleUpdateQuiz({ isOrderRandom: next });
                      }}
                    />

                    {savingQuiz && (
                      <span className="quiz-detail__editor-status text-secondary">
                        {t('quizzes.detail.savingStatus')}
                      </span>
                    )}
                    {quizError && (
                      <div className="quiz-detail__editor-error text-danger" role="alert">
                        {quizError}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <h1 className="quiz-detail__title">
                      {quiz?.title ?? t('quizzes.detail.fallbackTitle')}
                    </h1>

                    <p className="quiz-detail__description">
                      {quiz?.description?.trim() || t('quizzes.detail.fallbackDescription')}
                    </p>
                  </>
                )}

                <div className="quiz-detail__actions">
                  {editMode || !questions.length ? (
                    <button
                      type="button"
                      className="btn btn-primary quiz-detail__play-button"
                      disabled
                    >
                      <i className="fa-solid fa-play" />
                      {t('quizzes.detail.play')}
                    </button>
                  ) : (
                    <Link
                      to={`/courses/${courseId}/quizzes/${quizId}/play`}
                      className="btn btn-primary quiz-detail__play-button"
                    >
                      <i className="fa-solid fa-play" />
                      {t('quizzes.detail.play')}
                    </Link>
                  )}
                  <span className="quiz-detail__updated">
                    <i className="fa-regular fa-clock" />
                    {formattedUpdatedDate
                      ? t('quizzes.detail.updated', { date: formattedUpdatedDate })
                      : t('quizzes.detail.updatedRecently')}
                  </span>
                </div>
              </div>

              <aside
                className="quiz-detail__summary-card panel"
                aria-label={t('quizzes.detail.summaryAria')}
              >
                <h1 className="quiz-detail__summary-title">
                  {t('quizzes.detail.overviewHeading')}
                </h1>

                <div className="quiz-detail__summary-grid">
                  <div className="quiz-detail__stat">
                    <span className="quiz-detail__stat-icon quiz-detail__stat-icon--questions">
                      <i className="fa-regular fa-circle-question" />
                    </span>
                    <span className="quiz-detail__stat-copy">
                      <span className="quiz-detail__stat-value">{quizStats.questionCount}</span>
                      <span className="quiz-detail__stat-label">
                        {t(
                          quizStats.questionCount === 1
                            ? 'quizzes.detail.question'
                            : 'quizzes.detail.question_other'
                        )}
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
                        {t(
                          quizStats.answerCount === 1
                            ? 'quizzes.detail.answer'
                            : 'quizzes.detail.answer_other'
                        )}
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
                      <span className="quiz-detail__stat-label">{t('quizzes.detail.correct')}</span>
                    </span>
                  </div>
                </div>
              </aside>
            </section>

            <section className="quiz-detail__questions-panel panel">
              <div className="quiz-detail__section-header">
                <h2 className="quiz-detail__section-title">
                  {t('quizzes.detail.questionsAndAnswers')}
                </h2>

                <div className="quiz-detail__section-actions">
                  <span className="quiz-detail__question-count">
                    {t(
                      quizStats.questionCount === 1
                        ? 'quizzes.detail.itemsCount'
                        : 'quizzes.detail.itemsCount_other',
                      { count: quizStats.questionCount }
                    )}
                  </span>

                  <button
                    type="button"
                    className={`btn ${editMode ? 'btn-secondary' : 'btn-primary'} quiz-detail__edit-button`}
                    onClick={() => setEditMode((current) => !current)}
                  >
                    <i className={`fa-solid ${editMode ? 'fa-eye' : 'fa-pen'}`} />
                    {editMode ? t('quizzes.detail.preview') : t('quizzes.detail.edit')}
                  </button>
                </div>
              </div>

              <QuestionList
                questions={questions}
                editable={editMode}
                onCreateQuestion={handleCreateQuestion}
                onUpdateQuestion={handleUpdateQuestion}
                onDeleteQuestion={handleDeleteQuestion}
                onCreateAnswer={handleCreateAnswer}
                onUpdateAnswer={handleUpdateAnswer}
                onDeleteAnswer={handleDeleteAnswer}
              />
            </section>
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}
