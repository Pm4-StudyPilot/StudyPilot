import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import QuizCard from '../quizzes/QuizCard';
import { QuizDto } from '../../types/dto';

export type CourseFeedItem = { type: 'quiz'; data: QuizDto };

interface CourseFeedProps {
  items: CourseFeedItem[];
}

type SortField = 'title' | 'dateAdded';

function sortItems(items: CourseFeedItem[], field: SortField): CourseFeedItem[] {
  return [...items].sort((a, b) => {
    switch (field) {
      case 'title': {
        return a.data.title.localeCompare(b.data.title);
      }
      case 'dateAdded': {
        const dateA = new Date(a.data.createdAt).getTime();
        const dateB = new Date(b.data.createdAt).getTime();
        return dateB - dateA;
      }
      default:
        return 0;
    }
  });
}

function renderFeedItem(item: CourseFeedItem) {
  switch (item.type) {
    case 'quiz':
      return <QuizCard key={`quiz-${item.data.id}`} quiz={item.data} />;

    default:
      return null;
  }
}

export default function CourseFeed({ items }: CourseFeedProps) {
  const [sortField, setSortField] = useState<SortField>('dateAdded');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const sortedItems = sortItems(items, sortField);
  const { t } = useTranslation();

  const sortFields: SortField[] = ['title', 'dateAdded'];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!dropdownRef.current) return;
      if (event.target instanceof Node && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isDropdownOpen]);

  if (items.length === 0) {
    return (
      <div className="panel course-feed__empty rounded p-4 text-secondary text-center">
        {t('courses.feed.empty')}
      </div>
    );
  }

  return (
    <div className="panel course-feed p-4">
      <div className="course-feed__header flex-row-reverse">
        <div className="dropdown position-relative" ref={dropdownRef}>
          <button
            className="btn btn-outline-secondary btn-sm dropdown-toggle text-white"
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            aria-expanded={isDropdownOpen}
          >
            {t('courses.feed.sortBy', { label: t(`courses.feed.sortLabels.${sortField}`) })}
          </button>
          {isDropdownOpen && (
            <ul className="dropdown-menu show position-absolute">
              {sortFields.map((field) => (
                <li key={field}>
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setSortField(field);
                      setIsDropdownOpen(false);
                    }}
                  >
                    {t(`courses.feed.sortLabels.${field}`)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      {sortedItems.map((item) => renderFeedItem(item))}
    </div>
  );
}
