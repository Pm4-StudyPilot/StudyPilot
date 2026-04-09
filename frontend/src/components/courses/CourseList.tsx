import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { CourseDto } from '../../types/dto';
import CourseCard from './CourseCard';
import CreateCourseModal from './CreateCourseModal';

/**
 * CourseList
 *
 * Fetches and displays all courses belonging to the authenticated user.
 *
 * Responsibilities:
 * - Fetch the list of courses from the backend on mount
 * - Render a CourseCard for each course
 * - Show loading, error, and empty states
 * - Open the CreateCourseModal and prepend the new course to the list on success
 *
 * Workflow:
 * 1. GET /courses is called on mount
 * 2. Courses are rendered as a list of CourseCard components
 * 3. The "+" button opens the CreateCourseModal
 * 4. On successful creation the new course is prepended without refetching
 */
export default function CourseList() {
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
            : `${courses.length} course${courses.length !== 1 ? 's' : ''} enrolled`}
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

        {!loading &&
          !error &&
          courses.map((course) => <CourseCard key={course.id} course={course} />)}
      </div>

      {modalOpen && (
        <CreateCourseModal onClose={() => setModalOpen(false)} onCreated={handleCreated} />
      )}
    </>
  );
}
