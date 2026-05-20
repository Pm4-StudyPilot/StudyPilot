import { useState } from 'react';
import CourseList from '../components/courses/CourseList';
import DashboardLayout from '../components/shared/layout/DashboardLayout';

/**
 * CoursesPage
 *
 * Displays the course library and provides a local search
 * for filtering courses by name.
 */
export default function CoursesPage() {
  /**
   * Updates automatically when the user types
   * into the dashboard search input.
   */
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <DashboardLayout
      activeNav="courses"
      showSearch
      searchValue={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder="Search courses..."
    >
      <section className="dashboard-page-stack">
        <header className="dashboard-page-header">
          <div>
            <p className="dashboard-page-header__eyebrow">Course library</p>
            <h1>Courses</h1>
            <p className="dashboard-page-header__subline">
              Browse all available courses and open one to view its detailed page.
            </p>
          </div>
        </header>

        <CourseList searchTerm={searchTerm} />
      </section>
    </DashboardLayout>
  );
}
