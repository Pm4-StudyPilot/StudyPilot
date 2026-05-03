import CourseList from '../components/courses/CourseList';
import DashboardLayout from '../components/shared/layout/DashboardLayout';

export default function CoursesPage() {
  return (
    <DashboardLayout activeNav="courses">
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

        <CourseList />
      </section>
    </DashboardLayout>
  );
}
