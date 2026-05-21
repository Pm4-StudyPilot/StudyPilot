import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { CourseDto, TaskDto } from '../../types/dto';
import { normalizeCourseColor, withOpacity } from '../../utils/courseColors';
import {
  buildCalendarDays,
  formatLongDate,
  formatMonthLabel,
  formatShortDate,
  getDateKeyFromIsoDate,
  getDayDifference,
  getTodayDateKey,
  parseDateKey,
  shiftMonth,
} from '../../utils/calendar';
import { TASK_PRIORITY_BADGE_CLASS } from '../tasks/taskDisplay';

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
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const UPCOMING_LIMIT = 6;
const EMPTY_CALENDAR_TASKS: CalendarTask[] = [];

const DEADLINE_BADGE_CLASS: Record<DeadlineFlag['tone'], string> = {
  default: 'bg-secondary',
  today: 'bg-primary',
  soon: 'bg-warning text-dark',
  overdue: 'bg-danger',
};

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
      className="deadline-calendar__task-card task-card rounded p-3"
      style={{
        borderColor: withOpacity(normalizedColor, 0.2),
        boxShadow: `inset 3px 0 0 ${normalizedColor}`,
      }}
    >
      <div className="d-flex flex-column gap-2">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <Link
            to={`/courses/${task.courseId}`}
            className="deadline-calendar__course-link text-decoration-none"
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
          </Link>
          <span className={`task-card__badge badge ${TASK_PRIORITY_BADGE_CLASS[task.priority]}`}>
            {task.priority}
          </span>
          <span className={`task-card__badge badge ${DEADLINE_BADGE_CLASS[flag.tone]}`}>
            {flag.label}
          </span>
        </div>

        <div>
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

  const courseKey = useMemo(
    () => JSON.stringify(courses.map((course) => [course.id, course.name, course.color])),
    [courses]
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

  useEffect(() => {
    if (coursesLoading || coursesError) return;

    let isCancelled = false;

    async function loadDeadlineTasks() {
      try {
        const tasksByCourse = await Promise.all(
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

    loadDeadlineTasks();

    return () => {
      isCancelled = true;
    };
  }, [courseKey, courses, coursesError, coursesLoading]);

  const hasCurrentTaskRequest = taskRequest.courseKey === courseKey;
  const loadState: LoadState =
    coursesLoading || (!coursesError && !hasCurrentTaskRequest)
      ? 'loading'
      : coursesError || taskRequest.status === 'error'
        ? 'error'
        : 'success';
  const error = coursesError || (hasCurrentTaskRequest ? taskRequest.error : '');
  const tasks = hasCurrentTaskRequest ? taskRequest.tasks : EMPTY_CALENDAR_TASKS;

  const tasksByDate = useMemo(() => {
    return tasks.reduce<Record<string, CalendarTask[]>>((grouped, task) => {
      if (!grouped[task.dueDateKey]) {
        grouped[task.dueDateKey] = [];
      }

      grouped[task.dueDateKey].push(task);
      return grouped;
    }, {});
  }, [tasks]);

  const selectedDateTasks = selectedDateKey ? (tasksByDate[selectedDateKey] ?? []) : [];
  const calendarDays = useMemo(() => buildCalendarDays(activeMonth), [activeMonth]);
  const activeMonthLabel = formatMonthLabel(activeMonth);

  const upcomingTasks = useMemo(() => {
    return sortCalendarTasks(
      tasks.filter(
        (task) => !isTaskCompleted(task) && getDayDifference(task.dueDateKey, todayDateKey) >= 0
      )
    ).slice(0, UPCOMING_LIMIT);
  }, [tasks, todayDateKey]);

  const visibleTasks = selectedDateKey ? selectedDateTasks : upcomingTasks;
  const detailTitle = selectedDateKey ? formatLongDate(selectedDateKey) : 'Upcoming Deadlines';
  const emptyMessage = selectedDateKey
    ? 'No task deadlines fall on this date.'
    : 'No upcoming deadlines yet. Add or update task due dates to populate this list.';

  function handleMonthShift(offset: number) {
    setActiveMonth(shiftMonth(activeMonth, offset));
    setSelectedDateKey(null);
  }

  function handleGoToToday() {
    const today = parseDateKey(todayDateKey);
    setActiveMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDateKey(null);
  }

  function handleDateSelect(dateKey: string) {
    const selectedDate = parseDateKey(dateKey);
    setSelectedDateKey(dateKey);
    setActiveMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1));
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
                  onClick={() => setSelectedDateKey(null)}
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
              <ul className="deadline-calendar__task-list list-unstyled mb-0">
                {visibleTasks.map((task) => (
                  <DeadlineTaskCard
                    key={`${selectedDateKey ?? 'upcoming'}-${task.id}`}
                    task={task}
                    todayDateKey={todayDateKey}
                    showDate={!selectedDateKey}
                  />
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </section>
  );
}
