import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { CourseDto, TaskDto } from '../../types/dto';
import CourseCard from './CourseCard';
import CreateCourseModal from './CreateCourseModal';

type CourseListProps = {
  /**
   * Current search term used to filter courses and related course content.
   *
   * The value is controlled by the parent component through the shared
   * DashboardLayout search input.
   */
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

/**
 * Loads searchable content for a single course.
 *
 * This allows the course library search to match not only course names,
 * but also related tasks, documents, and quizzes.
 */
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

/**
 * Checks whether a course or its related content matches the search term.
 */
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

/**
 * CourseList
 *
 * Fetches and displays all courses belonging to the authenticated user.
 *
 * Responsibilities:
 * - Fetch the list of courses from the backend on mount
 * - Fetch searchable course-related content for each course
 * - Render a CourseCard for each matching course
 * - Filter courses by course name, task title, document filename, document type, or quiz title
 * - Show loading, error, empty, and no-search-results states
 * - Open the CreateCourseModal and prepend the new course to the list on success
 * - Update the course in the list when it is edited
 * - Remove the course from the list when it is deleted
 *
 * Search behavior:
 * - Search is controlled by the parent component
 * - Filtering is case-insensitive
 * - Search runs locally on already loaded course data
 * - The backend result is not refetched when the search term changes
 */
export default function CourseList({ searchTerm = '' }: CourseListProps) {
  const [courses, setCourses] = useState<CourseDto[]>([]);
  const [courseSearchData, setCourseSearchData] = useState<CourseSearchData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

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

        setError(err instanceof Error ? err.message : 'Failed to load courses');
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
  }, []);

  /**
   * Handles a newly created course.
   *
   * Prepends the course to the existing list and adds it to the local
   * search dataset with empty related content.
   */
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

  /**
   * Handles an updated course.
   *
   * Replaces the matching course in both the rendered course list
   * and the searchable course data.
   */
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

  /**
   * Handles a deleted course.
   *
   * Removes the matching course from both the rendered course list
   * and the searchable course data.
   */
  function handleDeleted(id: string) {
    setCourses((prev) => prev.filter((course) => course.id !== id));
    setCourseSearchData((prev) => prev.filter((entry) => entry.course.id !== id));
  }

  /**
   * Normalized search term used for case-insensitive filtering.
   */
  const normalizedSearch = searchTerm.trim().toLowerCase();

  /**
   * Filters course search data by course name and related course content.
   *
   * If no search term is provided, all loaded courses are returned.
   */
  const filteredCourseSearchData = normalizedSearch
    ? courseSearchData.filter((entry) => courseMatchesSearch(entry, normalizedSearch))
    : courseSearchData;

  /**
   * Extracts CourseDto objects from the filtered search data for rendering.
   */
  const filteredCourses = filteredCourseSearchData.map((entry) => entry.course);

  return (
    <>
      <div className="panel background">
        <div className="d-flex align-items-center justify-content-between mb-1">
          <h2 className="course-list__title text-white fw-bold mb-0">My Courses</h2>
          <button
            className="btn btn-sm btn-primary bold"
            onClick={() => setModalOpen(true)}
            aria-label="Add course"
          >
            <i className="fa-solid fa-plus" />
          </button>
        </div>

        <p className="course-list__subtitle text-secondary mb-4">
          {loading
            ? '\u00a0'
            : `${filteredCourses.length} of ${courses.length} course${
                courses.length !== 1 ? 's' : ''
              } shown`}
        </p>

        {loading && (
          <div className="d-flex justify-content-center py-4">
            <div className="spinner-border text-secondary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        )}

        {error && <div className="course-list__error alert alert-danger py-2">{error}</div>}

        {!loading && !error && courses.length === 0 && (
          <p className="course-list__empty text-secondary text-center py-4 mb-0">No courses yet.</p>
        )}

        {!loading && !error && courses.length > 0 && filteredCourses.length === 0 && (
          <p className="course-list__empty text-secondary text-center py-4 mb-0">
            No courses match your search.
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
