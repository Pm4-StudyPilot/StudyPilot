import { useState } from 'react';
import { CourseDto } from '../../types/dto';

type CourseCardProps = {
  course: CourseDto;
};

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
      <button
        className="w-100 d-flex align-items-center justify-content-between p-3 border-0 text-start"
        style={{ backgroundColor: 'transparent', color: 'inherit' }}
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
      >
        <div className="d-flex align-items-center gap-3">
          <div
            className="rounded-circle flex-shrink-0"
            style={{
              width: 40,
              height: 40,
              border: '3px solid #6c63ff',
            }}
          />
          <div>
            <div className="fw-semibold text-white" style={{ fontSize: '0.95rem' }}>
              {course.name}
            </div>
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
