import { useState } from 'react';
import { CourseDto } from '../../types/dto';
import CourseCard from './CourseCard';
import CreateCourseModal from './CreateCourseModal';

interface CourseListProps {
  courses: CourseDto[];
  loading: boolean;
  error: string;
  onCreated: (course: CourseDto) => void;
  onUpdated: (course: CourseDto) => void;
  onDeleted: (id: string) => void;
}

/**
 * CourseList
 *
 * Displays the authenticated user's courses inside the dashboard.
 *
 * Responsibilities:
 * - Render the current course list supplied by the dashboard page
 * - Render a CourseCard for each course
 * - Show loading, error, and empty states
 * - Open the CreateCourseModal and notify the parent when a course is created
 * - Pass update and delete events back to the parent state owner
 *
 * Workflow:
 * 1. HomePage loads the course data and passes it into this component
 * 2. Courses are rendered as a list of CourseCard components
 * 3. The "+" button opens the CreateCourseModal
 * 4. Create, edit, and delete events are lifted back to HomePage
 */
export default function CourseList({
  courses,
  loading,
  error,
  onCreated,
  onUpdated,
  onDeleted,
}: CourseListProps) {
  const [modalOpen, setModalOpen] = useState(false);

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
          courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              onUpdated={onUpdated}
              onDeleted={onDeleted}
            />
          ))}
      </div>

      {modalOpen && (
        <CreateCourseModal
          onClose={() => setModalOpen(false)}
          onCreated={(course) => {
            onCreated(course);
            setModalOpen(false);
          }}
        />
      )}
    </>
  );
}
