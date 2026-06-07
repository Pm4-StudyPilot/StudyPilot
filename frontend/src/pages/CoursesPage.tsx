import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import CourseList from '../components/courses/CourseList';
import DashboardLayout from '../components/shared/layout/DashboardLayout';

/**
 * CoursesPage
 *
 * Displays the course library and provides a local search
 * for filtering courses by name.
 */
export default function CoursesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const { t } = useTranslation();

  return (
    <DashboardLayout
      activeNav="courses"
      showSearch
      searchValue={searchTerm}
      onSearchChange={setSearchTerm}
      searchPlaceholder={t('common.search.courses')}
    >
      <section className="dashboard-page-stack">
        <header className="dashboard-page-header">
          <div>
            <p className="dashboard-page-header__eyebrow">{t('courses.library.eyebrow')}</p>
            <h1>{t('courses.library.title')}</h1>
            <p className="dashboard-page-header__subline">{t('courses.library.subline')}</p>
          </div>
        </header>

        <CourseList searchTerm={searchTerm} />
      </section>
    </DashboardLayout>
  );
}
