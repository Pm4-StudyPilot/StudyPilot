import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import { CourseDto, TaskDto } from '../../types/dto';
import CourseCard from './CourseCard';
import CreateCourseModal from './CreateCourseModal';

type CourseListProps = {
  searchTerm?: string;
};

type DocumentDto = {
  id: string;
  filename: string;
  fileType?: string | null;
  fileSize?: number | null;
  createdAt: string;
};

type QuizDto = {
  id: string;
  title: string;
  description: string | null;
  isOrderRandom: boolean;
  courseId: string;
  createdAt: string;
  updatedAt: string;
};

type CourseSearchData = {
  course: CourseDto;
  tasks: TaskDto[];
  documents: DocumentDto[];
  quizzes: QuizDto[];
};

async function loadCourseSearchData(course: CourseDto): Promise<CourseSearchData> {
  const [tasksResult, documentsResult, quizzesResult] = await Promise.allSettled([
    api.get<TaskDto[]>(`/courses/${course.id}/tasks`),
    api.get<DocumentDto[]>(`/documents/course/${course.id}?sort=createdAt:desc`),
    api.get<QuizDto[]>(`/courses/${course.id}/quizzes`),
  ]);

  return {
    course,
    tasks: tasksResult.status === 'fulfilled' ? tasksResult.value : [],
    documents: documentsResult.status === 'fulfilled' ? documentsResult.value : [],
    quizzes: quizzesResult.status === 'fulfilled' ? quizzesResult.value : [],
  };
}

function courseMatchesSearch(data: CourseSearchData, normalizedSearch: string) {
  const courseMatches = data.course.name.toLowerCase().includes(normalizedSearch);

  const taskMatches = data.tasks.some((task) =>
    task.title.toLowerCase().includes(normalizedSearch)
  );

  const documentMatches = data.documents.some(
    (document) =>
      document.filename.toLowerCase().includes(normalizedSearch) ||
      document.fileType?.toLowerCase().includes(normalizedSearch)
  );

  const quizMatches = data.quizzes.some((quiz) =>
    quiz.title.toLowerCase().includes(normalizedSearch)
  );

  return courseMatches || taskMatches || documentMatches || quizMatches;
}

export default function CourseList({ searchTerm = '' }: CourseListProps) {
  const [courses, setCourses] = useState<CourseDto[]>([]);
  const [courseSearchData, setCourseSearchData] = useState<CourseSearchData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    let isCancelled = false;

    async function loadCourses() {
      try {
        const loadedCourses = await api.get<CourseDto[]>('/courses');
        const loadedCourseSearchData = await Promise.all(loadedCourses.map(loadCourseSearchData));

        if (isCancelled) return;

        setCourses(loadedCourses);
        setCourseSearchData(loadedCourseSearchData);
        setError('');
      } catch (err: unknown) {
        if (isCancelled) return;

        setError(err instanceof Error ? err.message : t('courses.list.errorLoad'));
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    void loadCourses();

    return () => {
      isCancelled = true;
    };
  }, [t]);

  function handleCreated(course: CourseDto) {
    setCourses((prev) => [course, ...prev]);
    setCourseSearchData((prev) => [
      {
        course,
        tasks: [],
        documents: [],
        quizzes: [],
      },
      ...prev,
    ]);
    setModalOpen(false);
  }

  function handleUpdated(updated: CourseDto) {
    setCourses((prev) => prev.map((course) => (course.id === updated.id ? updated : course)));

    setCourseSearchData((prev) =>
      prev.map((entry) =>
        entry.course.id === updated.id
          ? {
              ...entry,
              course: updated,
            }
          : entry
      )
    );
  }

  function handleDeleted(id: string) {
    setCourses((prev) => prev.filter((course) => course.id !== id));
    setCourseSearchData((prev) => prev.filter((entry) => entry.course.id !== id));
  }

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredCourseSearchData = normalizedSearch
    ? courseSearchData.filter((entry) => courseMatchesSearch(entry, normalizedSearch))
    : courseSearchData;

  const filteredCourses = filteredCourseSearchData.map((entry) => entry.course);

  const totalCourses = courses.length;
  const shownCourses = filteredCourses.length;
  let subtitle: string;
  if (loading) {
    subtitle = ' ';
  } else if (totalCourses === 1) {
    subtitle = t('courses.list.courseShown', { shown: shownCourses, total: totalCourses });
  } else {
    subtitle = t('courses.list.coursesShown', { shown: shownCourses, total: totalCourses });
  }

  return (
    <>
      <div className="panel background">
        <div className="d-flex align-items-center justify-content-between mb-1">
          <h2 className="course-list__title text-white fw-bold mb-0">
            {t('courses.list.heading')}
          </h2>
          <button
            className="btn btn-sm btn-primary bold"
            onClick={() => setModalOpen(true)}
            aria-label={t('courses.list.addAria')}
            data-testid="add-course-button"
          >
            <i className="fa-solid fa-plus" />
          </button>
        </div>

        <p className="course-list__subtitle text-secondary mb-4">{subtitle}</p>

        {loading && (
          <div className="d-flex justify-content-center py-4">
            <div className="spinner-border text-secondary" role="status">
              <span className="visually-hidden">{t('common.loading')}</span>
            </div>
          </div>
        )}

        {error && <div className="course-list__error alert alert-danger py-2">{error}</div>}

        {!loading && !error && courses.length === 0 && (
          <p className="course-list__empty text-secondary text-center py-4 mb-0">
            {t('courses.list.empty')}
          </p>
        )}

        {!loading && !error && courses.length > 0 && filteredCourses.length === 0 && (
          <p className="course-list__empty text-secondary text-center py-4 mb-0">
            {t('courses.list.emptySearch')}
          </p>
        )}

        {!loading &&
          !error &&
          filteredCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onUpdated={handleUpdated}
              onDeleted={handleDeleted}
            />
          ))}
      </div>

      {modalOpen && (
        <CreateCourseModal onClose={() => setModalOpen(false)} onCreated={handleCreated} />
      )}
    </>
  );
}
