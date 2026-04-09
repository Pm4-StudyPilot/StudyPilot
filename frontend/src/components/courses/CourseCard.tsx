import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CourseDto } from '../../types/dto';

type CourseCardProps = {
  course: CourseDto;
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
 *
 * Workflow:
 * 1. Course data is received via props
 * 2. Clicking the header toggles the expanded state
 * 3. Clicking the course name navigates to /courses/:id without toggling
 */
export default function CourseCard({ course }: CourseCardProps) {
  const [expanded, setExpanded] = useState(false);

  const formattedDate = new Date(course.createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div
      className="rounded mb-2"
      style={{ backgroundColor: '#1e2030', border: '1px solid #2e3050' }}
    >
      {/* Clicking the row toggles the expanded content area */}
      <button
        className="w-100 d-flex align-items-center justify-content-between p-3 border-0 text-start"
        style={{ backgroundColor: 'transparent', color: 'inherit' }}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="d-flex align-items-center gap-3">
          {/* Progress ring placeholder — will show completion percentage once progress data exists */}
          <div
            className="rounded-circle flex-shrink-0"
            style={{
              width: 40,
              height: 40,
              border: '3px solid #6c63ff',
            }}
          />
          <div>
            {/* stopPropagation prevents the link click from also triggering the expand toggle */}
            <Link
              to={`/courses/${course.id}`}
              className="fw-semibold text-white text-decoration-none"
              style={{ fontSize: '0.95rem' }}
              onClick={(e) => e.stopPropagation()}
            >
              {course.name}
            </Link>
            <div className="text-secondary" style={{ fontSize: '0.78rem' }}>
              Added {formattedDate}
            </div>
          </div>
        </div>
        <i
          className={`fa-solid fa-chevron-${expanded ? 'up' : 'down'} text-secondary`}
          style={{ fontSize: '0.75rem' }}
        />
      </button>

      {expanded && (
        <div className="px-3 pb-3">
          <p className="text-secondary mb-0" style={{ fontSize: '0.85rem' }}>
            No items yet.
          </p>
        </div>
      )}
    </div>
  );
}
