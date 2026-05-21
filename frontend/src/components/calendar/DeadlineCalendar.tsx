import { useEffect, useId, useMemo, useRef, useState } from 'react';
import type { FocusEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { CourseDto, TaskDto } from '../../types/dto';
import { normalizeCourseColor } from '../../utils/courseColors';
import {
  buildCalendarDays,
  formatLongDate,
  formatMonthLabel,
  getDateKeyFromIsoDate,
  getDayDifference,
  getTodayDateKey,
  parseDateKey,
  shiftMonth,
} from '../../utils/calendar';
type CalendarTask = TaskDto & {
  courseName: string;
  courseColor: string;
  dueDateKey: string;
};

type LoadState = 'loading' | 'success' | 'error';

type TaskRequestState = {
  courseKey: string;
  status: Exclude<LoadState, 'loading'>;
  tasks: CalendarTask[];
  error: string;
};

type DeadlineFlag = {
  tone: 'default' | 'today' | 'soon' | 'overdue';
  label: string;
};

interface DeadlineCalendarProps {
  courses: CourseDto[];
  coursesLoading?: boolean;
  coursesError?: string;
  tasksByCourseId?: Record<string, TaskDto[]>;
}

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const UPCOMING_LIMIT = 3;
const EMPTY_CALENDAR_TASKS: CalendarTask[] = [];

function isTaskCompleted(task: TaskDto): boolean {
  return task.completed || task.status === 'DONE';
}

function sortCalendarTasks(tasks: CalendarTask[]): CalendarTask[] {
  return [...tasks].sort((left, right) => {
    const dateComparison = left.dueDateKey.localeCompare(right.dueDateKey);
    if (dateComparison !== 0) return dateComparison;

    const courseComparison = left.courseName.localeCompare(right.courseName);
    if (courseComparison !== 0) return courseComparison;

    return left.title.localeCompare(right.title);
  });
}

function getDeadlineFlag(task: CalendarTask, todayDateKey: string): DeadlineFlag {
  if (isTaskCompleted(task)) {
    return {
      tone: 'default',
      label: 'Completed',
    };
  }

  const dayDifference = getDayDifference(task.dueDateKey, todayDateKey);

  if (dayDifference < 0) {
    return {
      tone: 'overdue',
      label: 'Overdue',
    };
  }

  if (dayDifference === 0) {
    return {
      tone: 'today',
      label: 'Due today',
    };
  }

  if (dayDifference <= 7) {
    return {
      tone: 'soon',
      label: 'Due soon',
    };
  }

  return {
    tone: 'default',
    label: 'Scheduled',
  };
}

function getDayTone(tasks: CalendarTask[], todayDateKey: string): DeadlineFlag['tone'] {
  const flags = tasks.map((task) => getDeadlineFlag(task, todayDateKey));

  if (flags.some((flag) => flag.tone === 'overdue')) return 'overdue';
  if (flags.some((flag) => flag.tone === 'today')) return 'today';
  if (flags.some((flag) => flag.tone === 'soon')) return 'soon';

  return 'default';
}

function buildDayAriaLabel(dateKey: string, deadlineCount: number, isToday: boolean): string {
  const segments = [formatLongDate(dateKey)];

  if (isToday) {
    segments.push('today');
  }

  if (deadlineCount > 0) {
    segments.push(`${deadlineCount} deadline${deadlineCount === 1 ? '' : 's'}`);
  }

  return segments.join(', ');
}

function createCalendarTasks(courses: CourseDto[], tasksByCourse: TaskDto[][]): CalendarTask[] {
  return sortCalendarTasks(
    courses.flatMap((course, courseIndex) =>
      tasksByCourse[courseIndex]
        .map((task) => {
          const dueDateKey = getDateKeyFromIsoDate(task.dueDate);

          if (!dueDateKey) return null;

          return {
            ...task,
            courseName: course.name,
            courseColor: normalizeCourseColor(course.color),
            dueDateKey,
          };
        })
        .filter((task): task is CalendarTask => task !== null)
    )
  );
}

function getDayDotColor(tasks: CalendarTask[]): string {
  return normalizeCourseColor(tasks[0]?.courseColor);
}

function formatDeadlineTime(value: string | null): string {
  if (!value) return 'No due time';

  return new Date(value).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
}

function DeadlineTaskCard({ task }: { task: CalendarTask }) {
  const dueDate = parseDateKey(task.dueDateKey);

  return (
    <li className="deadline-calendar__task-card">
      <div
        className="deadline-calendar__date-badge"
        style={{ backgroundColor: normalizeCourseColor(task.courseColor) }}
      >
        <span>{dueDate.toLocaleDateString('en-US', { month: 'short' })}</span>
        <strong>{dueDate.getDate()}</strong>
      </div>

      <div className="deadline-calendar__task-content">
        <Link to={`/courses/${task.courseId}`} className="deadline-calendar__task-title">
          {task.title}
        </Link>
        <p className="deadline-calendar__task-meta">
          {task.courseName} - {formatDeadlineTime(task.dueDate)}
        </p>
      </div>
    </li>
  );
}

export default function DeadlineCalendar({
  courses,
  coursesLoading = false,
  coursesError = '',
  tasksByCourseId,
}: DeadlineCalendarProps) {
  const todayDateKey = getTodayDateKey();
  const initialToday = parseDateKey(todayDateKey);
  const upcomingListId = useId();
  const filterSearchRef = useRef<HTMLInputElement>(null);

  const courseKey = useMemo(
    () =>
      JSON.stringify({
        courses: courses.map((course) => [course.id, course.name, course.color]),
        taskIds: tasksByCourseId
          ? courses.map((course) => tasksByCourseId[course.id]?.map((task) => task.id) ?? [])
          : null,
      }),
    [courses, tasksByCourseId]
  );
  const [taskRequest, setTaskRequest] = useState<TaskRequestState>({
    courseKey: '',
    status: 'success',
    tasks: [],
    error: '',
  });
  const [activeMonth, setActiveMonth] = useState(
    () => new Date(initialToday.getFullYear(), initialToday.getMonth(), 1)
  );
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [courseFilterOpen, setCourseFilterOpen] = useState(false);
  const [courseSearch, setCourseSearch] = useState('');
  const [showAllUpcoming, setShowAllUpcoming] = useState(false);

  useEffect(() => {
    if (coursesLoading || coursesError) return;

    let isCancelled = false;

    async function loadDeadlineTasks() {
      try {
        const tasksByCourse = tasksByCourseId
          ? courses.map((course) => tasksByCourseId[course.id] ?? [])
          : await Promise.all(
              courses.map((course) => api.get<TaskDto[]>(`/courses/${course.id}/tasks`))
            );

        if (isCancelled) return;

        setTaskRequest({
          courseKey,
          status: 'success',
          tasks: createCalendarTasks(courses, tasksByCourse),
          error: '',
        });
      } catch (loadError: unknown) {
        if (isCancelled) return;

        setTaskRequest({
          courseKey,
          status: 'error',
          tasks: [],
          error: loadError instanceof Error ? loadError.message : 'Failed to load deadlines',
        });
      }
    }

    void loadDeadlineTasks();

    return () => {
      isCancelled = true;
    };
  }, [courseKey, courses, coursesError, coursesLoading, tasksByCourseId]);

  useEffect(() => {
    if (courseFilterOpen) {
      filterSearchRef.current?.focus();
    }
  }, [courseFilterOpen]);

  const hasCurrentTaskRequest = taskRequest.courseKey === courseKey;
  const loadState: LoadState =
    coursesLoading || (!coursesError && !hasCurrentTaskRequest)
      ? 'loading'
      : coursesError || taskRequest.status === 'error'
        ? 'error'
        : 'success';
  const error = coursesError || (hasCurrentTaskRequest ? taskRequest.error : '');
  const tasks = hasCurrentTaskRequest ? taskRequest.tasks : EMPTY_CALENDAR_TASKS;
  const activeCourseId = courses.some((course) => course.id === selectedCourseId)
    ? selectedCourseId
    : '';
  const activeCourse = courses.find((course) => course.id === activeCourseId) ?? null;
  const activeCourseLabel = activeCourse?.name ?? 'All courses';
  const courseOptions = useMemo(() => {
    const normalizedSearch = courseSearch.trim().toLowerCase();

    if (!normalizedSearch) return courses;

    return courses.filter((course) => course.name.toLowerCase().includes(normalizedSearch));
  }, [courseSearch, courses]);
  const filteredTasks = useMemo(
    () => (activeCourseId ? tasks.filter((task) => task.courseId === activeCourseId) : tasks),
    [activeCourseId, tasks]
  );

  const tasksByDate = useMemo(() => {
    return filteredTasks.reduce<Record<string, CalendarTask[]>>((grouped, task) => {
      if (!grouped[task.dueDateKey]) {
        grouped[task.dueDateKey] = [];
      }

      grouped[task.dueDateKey].push(task);
      return grouped;
    }, {});
  }, [filteredTasks]);

  const selectedDateTasks = selectedDateKey ? (tasksByDate[selectedDateKey] ?? []) : [];
  const calendarDays = useMemo(() => buildCalendarDays(activeMonth), [activeMonth]);
  const activeMonthLabel = formatMonthLabel(activeMonth);

  const upcomingTasks = useMemo(() => {
    return sortCalendarTasks(
      filteredTasks.filter(
        (task) => !isTaskCompleted(task) && getDayDifference(task.dueDateKey, todayDateKey) >= 0
      )
    );
  }, [filteredTasks, todayDateKey]);

  const visibleTasks = selectedDateKey
    ? selectedDateTasks
    : showAllUpcoming
      ? upcomingTasks
      : upcomingTasks.slice(0, UPCOMING_LIMIT);
  const hiddenUpcomingCount = selectedDateKey
    ? 0
    : Math.max(upcomingTasks.length - UPCOMING_LIMIT, 0);
  const canToggleUpcoming = !selectedDateKey && hiddenUpcomingCount > 0;
  const detailTitle = selectedDateKey ? formatLongDate(selectedDateKey) : 'Upcoming Deadlines';
  const emptyMessage = selectedDateKey
    ? 'No task deadlines fall on this date.'
    : 'No upcoming deadlines yet. Add or update task due dates to populate this list.';

  function handleMonthShift(offset: number) {
    setActiveMonth(shiftMonth(activeMonth, offset));
    setSelectedDateKey(null);
    setShowAllUpcoming(false);
  }

  function handleDateSelect(dateKey: string) {
    const selectedDate = parseDateKey(dateKey);
    setSelectedDateKey(dateKey);
    setShowAllUpcoming(false);
    setActiveMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  }

  function handleCourseFilterBlur(event: FocusEvent<HTMLDivElement>) {
    const nextTarget = event.relatedTarget as Node | null;

    if (event.currentTarget.contains(nextTarget)) return;

    setCourseFilterOpen(false);
    setCourseSearch('');
  }

  function handleCourseSelect(courseId: string) {
    setSelectedCourseId(courseId);
    setShowAllUpcoming(false);
    setCourseFilterOpen(false);
    setCourseSearch('');
  }

  function handleShowUpcoming() {
    setSelectedDateKey(null);
    setShowAllUpcoming(false);
  }

  return (
    <section className="deadline-calendar">
      {loadState === 'loading' && (
        <div className="d-flex justify-content-center py-5">
          <div className="spinner-border text-secondary" role="status">
            <span className="visually-hidden">Loading deadlines...</span>
          </div>
        </div>
      )}

      {loadState === 'error' && <div className="alert alert-danger mb-0">{error}</div>}

      {loadState === 'success' && (
        <>
          <div className="deadline-calendar__month mb-4">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
              <h2 className="text-white fw-bold h5 mb-0">{activeMonthLabel}</h2>

              <div className="deadline-calendar__toolbar d-flex align-items-center gap-2">
                <div className="deadline-calendar__filter" onBlur={handleCourseFilterBlur}>
                  <button
                    type="button"
                    className="deadline-calendar__filter-toggle"
                    onClick={() => setCourseFilterOpen((isOpen) => !isOpen)}
                    aria-haspopup="listbox"
                    aria-expanded={courseFilterOpen}
                  >
                    <span className="deadline-calendar__filter-label">
                      {activeCourse && (
                        <span
                          className="deadline-calendar__filter-dot"
                          style={{ backgroundColor: normalizeCourseColor(activeCourse.color) }}
                          aria-hidden="true"
                        />
                      )}
                      {activeCourseLabel}
                    </span>
                    <i className="fa-solid fa-chevron-down" aria-hidden="true" />
                  </button>

                  {courseFilterOpen && (
                    <div className="deadline-calendar__filter-menu">
                      <label htmlFor="deadline-calendar-course-search" className="visually-hidden">
                        Search courses
                      </label>
                      <div className="deadline-calendar__filter-search">
                        <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
                        <input
                          id="deadline-calendar-course-search"
                          ref={filterSearchRef}
                          type="search"
                          value={courseSearch}
                          onChange={(event) => setCourseSearch(event.target.value)}
                          placeholder="Search courses"
                        />
                      </div>

                      <div className="deadline-calendar__filter-list" role="listbox">
                        <button
                          type="button"
                          className={`deadline-calendar__filter-option${
                            activeCourseId === '' ? ' deadline-calendar__filter-option--active' : ''
                          }`}
                          onClick={() => handleCourseSelect('')}
                          role="option"
                          aria-selected={activeCourseId === ''}
                        >
                          All courses
                        </button>

                        {courseOptions.map((course) => {
                          const courseColor = normalizeCourseColor(course.color);

                          return (
                            <button
                              key={course.id}
                              type="button"
                              className={`deadline-calendar__filter-option${
                                activeCourseId === course.id
                                  ? ' deadline-calendar__filter-option--active'
                                  : ''
                              }`}
                              onClick={() => handleCourseSelect(course.id)}
                              role="option"
                              aria-selected={activeCourseId === course.id}
                            >
                              <span
                                className="deadline-calendar__filter-dot"
                                style={{ backgroundColor: courseColor }}
                                aria-hidden="true"
                              />
                              <span>{course.name}</span>
                            </button>
                          );
                        })}

                        {courseOptions.length === 0 && (
                          <div className="deadline-calendar__filter-empty">No courses found.</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div
                  className="deadline-calendar__month-controls d-flex align-items-center"
                  aria-label="Calendar navigation"
                >
                  <button
                    type="button"
                    className="deadline-calendar__nav-button"
                    onClick={() => handleMonthShift(-1)}
                    aria-label="Go to previous month"
                  >
                    <i className="fa-solid fa-chevron-left" />
                  </button>
                  <button
                    type="button"
                    className="deadline-calendar__nav-button"
                    onClick={() => handleMonthShift(1)}
                    aria-label="Go to next month"
                  >
                    <i className="fa-solid fa-chevron-right" />
                  </button>
                </div>
              </div>
            </div>

            <div className="deadline-calendar__month-frame">
              <div className="deadline-calendar__weekdays mb-2">
                {WEEKDAY_LABELS.map((label, index) => (
                  <div
                    key={`${label}-${index}`}
                    className="deadline-calendar__weekday text-secondary"
                  >
                    {label}
                  </div>
                ))}
              </div>

              <div className="deadline-calendar__grid">
                {calendarDays.map((day) => {
                  const dayTasks = tasksByDate[day.dateKey] ?? [];
                  const dayDotColor = getDayDotColor(dayTasks);
                  const isSelected = day.dateKey === selectedDateKey;
                  const isToday = day.dateKey === todayDateKey;
                  const dayTone = getDayTone(dayTasks, todayDateKey);

                  const classNames = ['deadline-calendar__day'];

                  if (!day.isCurrentMonth) classNames.push('deadline-calendar__day--outside');
                  if (isSelected) classNames.push('deadline-calendar__day--selected');
                  if (isToday) classNames.push('deadline-calendar__day--today');
                  if (dayTasks.length > 0) classNames.push('deadline-calendar__day--active');
                  if (dayTasks.length > 0) {
                    classNames.push(`deadline-calendar__day--${dayTone}`);
                  }

                  return (
                    <button
                      key={day.dateKey}
                      type="button"
                      className={classNames.join(' ')}
                      onClick={() => handleDateSelect(day.dateKey)}
                      aria-pressed={isSelected}
                      aria-label={buildDayAriaLabel(day.dateKey, dayTasks.length, isToday)}
                    >
                      <span className="deadline-calendar__day-number">{day.dayNumber}</span>

                      {dayTasks.length > 0 && (
                        <span
                          className="deadline-calendar__day-dot"
                          style={{ backgroundColor: dayDotColor }}
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <section className="deadline-calendar__detail">
            <div className="d-flex align-items-center justify-content-between gap-3 mb-3">
              <h3 className="text-white h5 mb-0">{detailTitle}</h3>

              {selectedDateKey && (
                <button
                  type="button"
                  className="btn btn-sm btn-link deadline-calendar__reset p-0 text-decoration-none"
                  onClick={handleShowUpcoming}
                >
                  Show upcoming deadlines
                </button>
              )}
            </div>

            {visibleTasks.length === 0 ? (
              <div className="deadline-calendar__empty-state rounded p-3 text-secondary text-center">
                {emptyMessage}
              </div>
            ) : (
              <>
                <ul
                  id={upcomingListId}
                  className={`deadline-calendar__task-list list-unstyled mb-0 ${
                    selectedDateKey || showAllUpcoming
                      ? 'deadline-calendar__task-list--scrollable'
                      : 'deadline-calendar__task-list--preview'
                  }`}
                >
                  {visibleTasks.map((task) => (
                    <DeadlineTaskCard
                      key={`${selectedDateKey ?? 'upcoming'}-${task.id}`}
                      task={task}
                    />
                  ))}
                </ul>

                {canToggleUpcoming && (
                  <button
                    type="button"
                    className="deadline-calendar__more-button"
                    aria-expanded={showAllUpcoming}
                    aria-controls={upcomingListId}
                    onClick={() => setShowAllUpcoming((isExpanded) => !isExpanded)}
                  >
                    {showAllUpcoming
                      ? 'Show fewer deadlines'
                      : `Show ${hiddenUpcomingCount} more deadline${
                          hiddenUpcomingCount === 1 ? '' : 's'
                        }`}
                  </button>
                )}
              </>
            )}
          </section>
        </>
      )}
    </section>
  );
}
