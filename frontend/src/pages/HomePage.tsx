import { useEffect, useState } from 'react';
import Navbar from '../components/shared/layout/Navbar';
import CourseList from '../components/courses/CourseList';
import DeadlineCalendar from '../components/calendar/DeadlineCalendar';
import { api } from '../services/api';
import { CourseDto } from '../types/dto';

export default function HomePage() {
  const [courses, setCourses] = useState<CourseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<CourseDto[]>('/courses')
      .then(setCourses)
      .catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load courses');
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Navbar />
      <div className="container mt-4">
        <div className="row g-4">
          <div className="col-12 col-xl-7">
            <CourseList
              courses={courses}
              loading={loading}
              error={error}
              onCreated={(course) => setCourses((currentCourses) => [course, ...currentCourses])}
              onUpdated={(course) =>
                setCourses((currentCourses) =>
                  currentCourses.map((currentCourse) =>
                    currentCourse.id === course.id ? course : currentCourse
                  )
                )
              }
              onDeleted={(courseId) =>
                setCourses((currentCourses) =>
                  currentCourses.filter((course) => course.id !== courseId)
                )
              }
            />
          </div>
          <div className="col-12 col-xl-5">
            <DeadlineCalendar courses={courses} coursesLoading={loading} coursesError={error} />
          </div>
        </div>
      </div>
    </>
  );
}
