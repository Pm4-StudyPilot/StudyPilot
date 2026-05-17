import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { CourseDto, TaskDto } from '../../types/dto';
import { normalizeCourseColor, withOpacity } from '../../utils/courseColors';
import {
  buildCalendarDays,
  formatLocalDateKey,
  formatLongDate,
  formatMonthLabel,
  formatShortDate,
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

type DeadlineFlag = {
  tone: 'default' | 'today' | 'soon' | 'overdue';
  label: string;
};

interface DeadlineCalendarProps {
  courses: CourseDto[];
  coursesLoading?: boolean;
  coursesError?: string;
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const UPCOMING_LIMIT = 6;
const MAX_DAY_SWATCHES = 3;

function isTaskCompleted(task: TaskDto): boolean {
  return task.completed || task.status === 'DONE';
}

function getPriorityBadgeClass(priority: TaskDto['priority']): string {
  switch (priority) {
    case 'HIGH':
      return 'bg-danger-subtle text-danger-emphasis border border-danger-subtle';
    case 'MEDIUM':
      return 'bg-warning-subtle text-warning-emphasis border border-warning-subtle';
    case 'LOW':
    default:
      return 'bg-secondary-subtle text-secondary-emphasis border border-secondary-subtle';
  }
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

function getDayCourseColors(tasks: CalendarTask[]): string[] {
  return Array.from(new Set(tasks.map((task) => normalizeCourseColor(task.courseColor))));
}

function DeadlineTaskCard({
  task,
  todayDateKey,
  showDate,
}: {
  task: CalendarTask;
  todayDateKey: string;
  showDate?: boolean;
}) {
  const flag = getDeadlineFlag(task, todayDateKey);
  const normalizedColor = normalizeCourseColor(task.courseColor);

  return (
    <li
      className="deadline-calendar__task-card rounded-4 p-3"
      style={{
        borderColor: withOpacity(normalizedColor, 0.2),
        boxShadow: `inset 3px 0 0 ${normalizedColor}`,
      }}
    >
      <div className="d-flex align-items-start justify-content-between gap-3">
        <div className="flex-grow-1">
          <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
            <span
              className="deadline-calendar__chip deadline-calendar__chip--course"
              style={{
                backgroundColor: withOpacity(normalizedColor, 0.16),
                borderColor: withOpacity(normalizedColor, 0.28),
              }}
            >
              <span
                className="deadline-calendar__course-dot"
                style={{ backgroundColor: normalizedColor }}
                aria-hidden="true"
              />
              {task.courseName}
            </span>
            <span className={`badge ${getPriorityBadgeClass(task.priority)}`}>{task.priority}</span>
            <span className={`deadline-calendar__chip deadline-calendar__chip--${flag.tone}`}>
              {flag.label}
            </span>
          </div>

          <h3 className="deadline-calendar__task-title text-white h6 mb-1">{task.title}</h3>

          {task.description && (
            <p className="deadline-calendar__task-description text-secondary mb-2">
              {task.description}
            </p>
          )}

          {showDate && (
            <p className="deadline-calendar__task-date text-secondary mb-0">
              <i className="fa-regular fa-calendar me-2" />
              Due {formatShortDate(task.dueDateKey)}
            </p>
          )}
        </div>

        <Link
          to={`/courses/${task.courseId}`}
          className="deadline-calendar__task-link text-decoration-none"
          style={{ color: normalizedColor }}
        >
          Open course
        </Link>
      </div>
    </li>
  );
}

export default function DeadlineCalendar({
  courses,
  coursesLoading = false,
  coursesError = '',
}: DeadlineCalendarProps) {
  const todayDateKey = getTodayDateKey();
  const initialToday = parseDateKey(todayDateKey);

  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [error, setError] = useState('');
  const [activeMonth, setActiveMonth] = useState(
    () => new Date(initialToday.getFullYear(), initialToday.getMonth(), 1)
  );
  const [selectedDateKey, setSelectedDateKey] = useState(todayDateKey);

  useEffect(() => {
    if (coursesLoading) {
      setLoadState('loading');
      setError('');
      return;
    }

    if (coursesError) {
      setTasks([]);
      setLoadState('error');
      setError(coursesError);
      return;
    }

    let isCancelled = false;

    async function loadDeadlineTasks() {
      setLoadState('loading');
      setError('');

      try {
        if (courses.length === 0) {
          setTasks([]);
          setLoadState('success');
          return;
        }

        const tasksByCourse = await Promise.all(
          courses.map((course) => api.get<TaskDto[]>(`/courses/${course.id}/tasks`))
        );

        if (isCancelled) return;

        setTasks(createCalendarTasks(courses, tasksByCourse));
        setLoadState('success');
      } catch (loadError: unknown) {
        if (isCancelled) return;

        setError(loadError instanceof Error ? loadError.message : 'Failed to load deadlines');
        setLoadState('error');
      }
    }

    loadDeadlineTasks();

    return () => {
      isCancelled = true;
    };
  }, [courses, coursesError, coursesLoading]);

  const tasksByDate = useMemo(() => {
    return tasks.reduce<Record<string, CalendarTask[]>>((grouped, task) => {
      if (!grouped[task.dueDateKey]) {
        grouped[task.dueDateKey] = [];
      }

      grouped[task.dueDateKey].push(task);
      return grouped;
    }, {});
  }, [tasks]);

  const selectedDateTasks = tasksByDate[selectedDateKey] ?? [];
  const calendarDays = useMemo(() => buildCalendarDays(activeMonth), [activeMonth]);
  const activeMonthLabel = formatMonthLabel(activeMonth);

  const datedCourseCount = useMemo(() => new Set(tasks.map((task) => task.courseId)).size, [tasks]);

  const upcomingTasks = useMemo(() => {
    return sortCalendarTasks(
      tasks.filter(
        (task) => !isTaskCompleted(task) && getDayDifference(task.dueDateKey, todayDateKey) >= 0
      )
    ).slice(0, UPCOMING_LIMIT);
  }, [tasks, todayDateKey]);

  function handleMonthShift(offset: number) {
    const nextMonth = shiftMonth(activeMonth, offset);
    setActiveMonth(nextMonth);
    setSelectedDateKey(formatLocalDateKey(nextMonth));
  }

  function handleGoToToday() {
    const today = parseDateKey(todayDateKey);
    setActiveMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDateKey(todayDateKey);
  }

  function handleDateSelect(dateKey: string) {
    const selectedDate = parseDateKey(dateKey);
    setSelectedDateKey(dateKey);
    setActiveMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
  }

  return (
    <section className="deadline-calendar rounded-4 p-4">
      <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-4">
        <div>
          <p className="deadline-calendar__eyebrow text-uppercase mb-2">Planner</p>
          <h2 className="text-white fw-bold h4 mb-1">Deadline Calendar</h2>
          <p className="text-secondary mb-0">
            View task deadlines across your courses without leaving the dashboard.
          </p>
        </div>

        {loadState === 'success' && (
          <div className="deadline-calendar__summary rounded-4 px-3 py-2">
            <div className="text-white fw-semibold">{tasks.length} dated tasks</div>
            <div className="text-secondary small">
              {datedCourseCount} course{datedCourseCount === 1 ? '' : 's'} with deadlines
            </div>
          </div>
        )}
      </div>

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
          <div className="deadline-calendar__surface rounded-4 p-3 p-lg-4 mb-4">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-3">
              <div>
                <p className="text-secondary small text-uppercase mb-1">Monthly view</p>
                <h3 className="text-white h5 mb-0">{activeMonthLabel}</h3>
              </div>

              <div className="d-flex align-items-center gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => handleMonthShift(-1)}
                  aria-label="Go to previous month"
                >
                  <i className="fa-solid fa-chevron-left" />
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={handleGoToToday}
                >
                  Today
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => handleMonthShift(1)}
                  aria-label="Go to next month"
                >
                  <i className="fa-solid fa-chevron-right" />
                </button>
              </div>
            </div>

            <div className="deadline-calendar__month-frame">
              <div className="deadline-calendar__weekdays mb-2">
                {WEEKDAY_LABELS.map((label) => (
                  <div key={label} className="deadline-calendar__weekday text-secondary">
                    {label}
                  </div>
                ))}
              </div>

              <div className="deadline-calendar__grid">
                {calendarDays.map((day) => {
                  const dayTasks = tasksByDate[day.dateKey] ?? [];
                  const dayCourseColors = getDayCourseColors(dayTasks);
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
                        <span className="deadline-calendar__day-footer">
                          <span className="deadline-calendar__day-count">{dayTasks.length}</span>
                          <span className="deadline-calendar__day-swatches" aria-hidden="true">
                            {dayCourseColors.slice(0, MAX_DAY_SWATCHES).map((courseColor) => (
                              <span
                                key={`${day.dateKey}-${courseColor}`}
                                className="deadline-calendar__day-course-dot"
                                style={{ backgroundColor: courseColor }}
                              />
                            ))}
                            {dayCourseColors.length > MAX_DAY_SWATCHES && (
                              <span className="deadline-calendar__day-more">
                                +{dayCourseColors.length - MAX_DAY_SWATCHES}
                              </span>
                            )}
                          </span>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="deadline-calendar__info-grid">
            <section className="deadline-calendar__detail-card rounded-4 p-3 p-lg-4">
              <div className="d-flex align-items-start justify-content-between gap-3 mb-3">
                <div>
                  <p className="text-secondary small text-uppercase mb-1">Selected day</p>
                  <h3 className="text-white h5 mb-0">{formatLongDate(selectedDateKey)}</h3>
                </div>

                <span className="deadline-calendar__summary-pill">
                  {selectedDateTasks.length} task{selectedDateTasks.length === 1 ? '' : 's'}
                </span>
              </div>

              {selectedDateTasks.length === 0 ? (
                <div className="deadline-calendar__empty-state rounded-4 p-3 text-secondary text-center">
                  No task deadlines fall on this date.
                </div>
              ) : (
                <ul className="deadline-calendar__task-list list-unstyled mb-0">
                  {selectedDateTasks.map((task) => (
                    <DeadlineTaskCard key={task.id} task={task} todayDateKey={todayDateKey} />
                  ))}
                </ul>
              )}
            </section>

            <section className="deadline-calendar__detail-card rounded-4 p-3 p-lg-4">
              <div className="d-flex align-items-start justify-content-between gap-3 mb-3">
                <div>
                  <p className="text-secondary small text-uppercase mb-1">Upcoming</p>
                  <h3 className="text-white h5 mb-0">Next deadlines</h3>
                </div>

                <span className="deadline-calendar__summary-pill">
                  {upcomingTasks.length} shown
                </span>
              </div>

              {upcomingTasks.length === 0 ? (
                <div className="deadline-calendar__empty-state rounded-4 p-3 text-secondary text-center">
                  No upcoming deadlines yet. Add or update task due dates to populate this list.
                </div>
              ) : (
                <ul className="deadline-calendar__task-list list-unstyled mb-0">
                  {upcomingTasks.map((task) => (
                    <DeadlineTaskCard
                      key={`${task.id}-upcoming`}
                      task={task}
                      todayDateKey={todayDateKey}
                      showDate={true}
                    />
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </section>
  );
}
