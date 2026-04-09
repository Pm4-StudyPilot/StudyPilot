import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CourseDto } from '../../types/dto';
import EditCourseModal from './EditCourseModal';
import DeleteCourseModal from './DeleteCourseModal';

type CourseCardProps = {
  course: CourseDto;
  onUpdated: (course: CourseDto) => void;
  onDeleted: (id: string) => void;
};

/**
 * CourseCard
 *
 * Renders a single course as a collapsible card row inside the course list.
 *
 * Responsibilities:
 * - Display the course name as a link to the detail page
 * - Show the formatted creation date
 * - Toggle expanded state to reveal course content
 * - Open the EditCourseModal and notify the parent when the course is updated
 * - Open the DeleteCourseModal and notify the parent when the course is deleted
 *
 * Workflow:
 * 1. Course data is received via props
 * 2. Clicking the header row toggles the expanded state
 * 3. Clicking the course name navigates to /courses/:id without toggling
 * 4. Clicking the edit button opens the EditCourseModal
 * 5. Clicking the delete button opens the DeleteCourseModal
 */
export default function CourseCard({ course, onUpdated, onDeleted }: CourseCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const formattedDate = new Date(course.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  function handleUpdated(updated: CourseDto) {
    onUpdated(updated);
    setEditOpen(false);
  }

  return (
    <>
      <div className="course-card rounded mb-2">
        <div className="d-flex align-items-center justify-content-between p-3">
          <div className="d-flex align-items-center gap-3">
            {/* Progress ring placeholder — will show completion percentage once progress data exists */}
            <div className="course-card__progress-ring rounded-circle flex-shrink-0" />
            <div>
              {/* Course name links to the detail page */}
              <Link
                to={`/courses/${course.id}`}
                className="course-card__name fw-semibold text-white text-decoration-none"
              >
                {course.name}
              </Link>
              <div className="course-card__date text-secondary">Added {formattedDate}</div>
            </div>
          </div>

          <div className="d-flex align-items-center gap-2">
            <button
              className="btn btn-sm btn-link text-secondary p-0"
              onClick={() => setEditOpen(true)}
              aria-label="Edit course"
            >
              <i className="fa-solid fa-pen-to-square" />
            </button>
            <button
              className="btn btn-sm btn-link text-danger p-0"
              onClick={() => setDeleteOpen(true)}
              aria-label="Delete course"
            >
              <i className="fa-solid fa-trash" />
            </button>
            {/* Toggle button to expand/collapse course content */}
            <button
              className="btn btn-sm btn-link text-secondary p-0"
              onClick={() => setExpanded((v) => !v)}
              aria-label="Toggle course"
              aria-expanded={expanded}
            >
              <i
                className={`course-card__chevron fa-solid fa-chevron-${expanded ? 'up' : 'down'}`}
              />
            </button>
          </div>
        </div>

        {expanded && (
          <div className="px-3 pb-3">
            <p className="course-card__empty text-secondary mb-0">No items yet.</p>
          </div>
        )}
      </div>

      {editOpen && (
        <EditCourseModal
          course={course}
          onClose={() => setEditOpen(false)}
          onUpdated={handleUpdated}
        />
      )}

      {deleteOpen && (
        <DeleteCourseModal
          course={course}
          onClose={() => setDeleteOpen(false)}
          onDeleted={onDeleted}
        />
      )}
    </>
  );
}
