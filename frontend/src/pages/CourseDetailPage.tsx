import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/shared/layout/Navbar';
import { api } from '../services/api';
import { CourseDto } from '../types/dto';

/**
 * CourseDetailPage
 *
 * Displays detailed information about a single course identified by its UUID in the URL.
 *
 * Responsibilities:
 * - Extract the course UUID from the URL params
 * - Fetch the course from the backend API
 * - Render course details including name and creation date
 * - Handle loading, not-found, and error states
 *
 * Workflow:
 * 1. UUID is read from /courses/:id via useParams
 * 2. GET /courses/:id is called on mount
 * 3. Course details are displayed on success
 * 4. A back link returns the user to the home page
 */
export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<CourseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;

    api
      .get<CourseDto>(`/courses/${id}`)
      .then(setCourse)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load course');
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Only compute the formatted date once the course has loaded
  const formattedDate = course
    ? new Date(course.createdAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : '';

  return (
    <>
      <Navbar />
      <div className="container mt-4">
        <Link
          to="/"
          className="text-secondary text-decoration-none d-inline-flex align-items-center gap-2 mb-4"
          style={{ fontSize: '0.9rem' }}
        >
          <i className="fa-solid fa-chevron-left" />
          Back to My Courses
        </Link>

        {loading && (
          <div className="d-flex justify-content-center py-5">
            <div className="spinner-border text-secondary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="alert alert-danger" style={{ fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        {!loading && !error && !course && <p className="text-secondary">Course not found.</p>}

        {!loading && !error && course && (
          <div
            className="rounded p-4"
            style={{ backgroundColor: '#151726', border: '1px solid #2e3050' }}
          >
            <h2 className="text-white fw-bold mb-1">{course.name}</h2>
            <p className="text-secondary mb-4" style={{ fontSize: '0.85rem' }}>
              Added {formattedDate}
            </p>

            {/* Content placeholder — will be replaced with modules and assignments */}
            <div
              className="rounded p-3 text-secondary text-center"
              style={{
                backgroundColor: '#1e2030',
                border: '1px solid #2e3050',
                fontSize: '0.9rem',
              }}
            >
              No content yet.
            </div>
          </div>
        )}
      </div>
    </>
  );
}
