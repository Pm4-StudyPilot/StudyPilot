import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { CourseDto } from '../../types/dto';
import CourseCard from './CourseCard';
import CreateCourseModal from './CreateCourseModal';

type CourseListProps = {
  /**
   * Current search term used to filter courses by name.
   */
  searchTerm?: string;
};

/**
 * CourseList
 *
 * Fetches and displays all courses belonging to the authenticated user.
 *
 * Responsibilities:
 * - Fetch the list of courses from the backend on mount
 * - Render a CourseCard for each course
 * - Filter courses by the provided search term
 * - Show loading, error, empty, and no-search-results states
 * - Open the CreateCourseModal and prepend the new course to the list on success
 * - Update the course in the list when it is edited
 *
 * Workflow:
 * 1. GET /courses is called on mount
 * 2. Courses are filtered by the search term if provided
 * 3. Courses are rendered as a list of CourseCard components
 * 4. The "+" button opens the CreateCourseModal
 * 5. On successful creation the new course is prepended without refetching
 * 6. On successful edit the matching course is replaced in the list without refetching
 */
export default function CourseList({ searchTerm = '' }: CourseListProps) {
  const [courses, setCourses] = useState<CourseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    api
      .get<CourseDto[]>('/courses')
      .then(setCourses)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load courses');
      })
      .finally(() => setLoading(false));
  }, []);

  /**
   * Handles a newly created course.
   *
   * Prepends the course to the existing list and closes the modal.
   */
  function handleCreated(course: CourseDto) {
    setCourses((prev) => [course, ...prev]);
    setModalOpen(false);
  }

  /**
   * Handles an updated course.
   *
   * Replaces the matching course in the list with the updated version.
   */
  function handleUpdated(updated: CourseDto) {
    setCourses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }

  /**
   * Handles a deleted course.
   *
   * Removes the matching course from the list by id.
   */
  function handleDeleted(id: string) {
    setCourses((prev) => prev.filter((c) => c.id !== id));
  }

  const normalizedSearch = searchTerm.trim().toLowerCase();

  const filteredCourses = normalizedSearch
    ? courses.filter((course) => course.name.toLowerCase().includes(normalizedSearch))
    : courses;

  return (
    <>
      <div className="course-panel rounded p-4">
        <div className="d-flex align-items-center justify-content-between mb-1">
          <h2 className="course-list__title text-white fw-bold mb-0">My Courses</h2>
          <button
            className="btn btn-sm btn-outline-secondary"
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
