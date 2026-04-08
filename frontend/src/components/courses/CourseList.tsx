import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { CourseDto } from '../../types/dto';
import CourseCard from './CourseCard';

export default function CourseList() {
  const [courses, setCourses] = useState<CourseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<CourseDto[]>('/courses')
      .then(setCourses)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load courses');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      className="rounded p-4"
      style={{ backgroundColor: '#151726', border: '1px solid #2e3050' }}
    >
      <h2 className="text-white fw-bold mb-1" style={{ fontSize: '1.4rem' }}>
        My Courses
      </h2>
      <p className="text-secondary mb-4" style={{ fontSize: '0.85rem' }}>
        {loading ? '\u00a0' : `${courses.length} course${courses.length !== 1 ? 's' : ''} enrolled`}
      </p>

      {loading && (
        <div className="d-flex justify-content-center py-4">
          <div className="spinner-border text-secondary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-danger py-2" style={{ fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {!loading && !error && courses.length === 0 && (
        <p className="text-secondary text-center py-4 mb-0" style={{ fontSize: '0.9rem' }}>
          No courses yet.
        </p>
      )}

      {!loading &&
        !error &&
        courses.map((course) => <CourseCard key={course.id} course={course} />)}
    </div>
  );
}
