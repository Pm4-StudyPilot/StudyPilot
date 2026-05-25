import { formatDate, formatMonthLabel as formatLocalizedMonthLabel } from './formatDate';

export interface CalendarDay {
  date: Date;
  dateKey: string;
  dayNumber: number;
  isCurrentMonth: boolean;
}

const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

function padNumber(value: number): string {
  return value.toString().padStart(2, '0');
}

export function formatLocalDateKey(date: Date): string {
  return `${date.getFullYear()}-${padNumber(date.getMonth() + 1)}-${padNumber(date.getDate())}`;
}

export function getTodayDateKey(): string {
  return formatLocalDateKey(new Date());
}

export function getDateKeyFromIsoDate(value: string | null | undefined): string | null {
  if (!value) return null;

  const match = value.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : null;
}

export function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatMonthLabel(month: Date, lang: string): string {
  return formatLocalizedMonthLabel(month, lang);
}

export function formatLongDate(dateKey: string): string {
  return formatDate(parseDateKey(dateKey));
}

export function formatShortDate(dateKey: string): string {
  return formatDate(parseDateKey(dateKey));
}

export function shiftMonth(month: Date, offset: number): Date {
  return new Date(month.getFullYear(), month.getMonth() + offset, 1);
}

export function buildCalendarDays(month: Date): CalendarDay[] {
  const firstDayOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
  const firstGridDate = new Date(firstDayOfMonth);
  const mondayBasedDayIndex = (firstDayOfMonth.getDay() + 6) % 7;
  firstGridDate.setDate(firstDayOfMonth.getDate() - mondayBasedDayIndex);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstGridDate);
    date.setDate(firstGridDate.getDate() + index);

    return {
      date,
      dateKey: formatLocalDateKey(date),
      dayNumber: date.getDate(),
      isCurrentMonth: date.getMonth() === month.getMonth(),
    };
  });
}

export function getDayDifference(targetDateKey: string, baseDateKey: string): number {
  const target = parseDateKey(targetDateKey);
  const base = parseDateKey(baseDateKey);

  return Math.round((target.getTime() - base.getTime()) / ONE_DAY_IN_MS);
}
