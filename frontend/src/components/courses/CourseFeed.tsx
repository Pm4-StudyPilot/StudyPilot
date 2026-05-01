import { useEffect, useRef, useState } from 'react';
import QuizCard from '../quizzes/QuizCard';
import { QuizDto } from '../../types/dto';

export type CourseFeedItem = { type: 'quiz'; data: QuizDto };

interface CourseFeedProps {
  items: CourseFeedItem[];
}

type SortField = 'title' | 'dateAdded';

const SORT_LABELS: Record<SortField, string> = {
  title: 'Title',
  dateAdded: 'Date Added',
};

function sortItems(items: CourseFeedItem[], field: SortField): CourseFeedItem[] {
  return [...items].sort((a, b) => {
    switch (field) {
      case 'title':
        return a.data.title.localeCompare(b.data.title);
      case 'dateAdded': {
        const dateA = new Date(a.data.createdAt).getTime();
        const dateB = new Date(b.data.createdAt).getTime();
        return dateB - dateA;
      } // Newest first
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
      <div className="course-feed__empty rounded p-3 text-secondary text-center">
        No course materials yet. Add quizzes or other items to get started.
      </div>
    );
  }

  return (
    <div className="course-feed rounded p-3">
      <div className="d-flex align-items-center justify-content-between mb-3">
        <h3 className="text-white fw-semibold mb-0">Course Materials</h3>
        <div className="dropdown position-relative" ref={dropdownRef}>
          <button
            className="btn btn-outline-secondary btn-sm dropdown-toggle text-white"
            type="button"
            onClick={() => setIsDropdownOpen((prev) => !prev)}
            aria-expanded={isDropdownOpen}
          >
            Sort by: {SORT_LABELS[sortField]}
          </button>
          {isDropdownOpen && (
            <ul className="dropdown-menu show position-absolute">
              {(Object.keys(SORT_LABELS) as SortField[]).map((field) => (
                <li key={field}>
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setSortField(field);
                      setIsDropdownOpen(false);
                    }}
                  >
                    {SORT_LABELS[field]}
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
