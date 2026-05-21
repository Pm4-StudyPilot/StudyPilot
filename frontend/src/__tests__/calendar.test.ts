import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildCalendarDays,
  formatLocalDateKey,
  formatLongDate,
  formatMonthLabel,
  formatShortDate,
  getDateKeyFromIsoDate,
  getDayDifference,
  getTodayDateKey,
  shiftMonth,
} from '../utils/calendar';

describe('calendar utilities', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('formats dates for calendar labels and keys', () => {
    const date = new Date(2026, 4, 10);

    expect(formatLocalDateKey(date)).toBe('2026-05-10');
    expect(formatMonthLabel(date)).toBe('May 2026');
    expect(formatLongDate('2026-05-10')).toBe('May 10, 2026');
    expect(formatShortDate('2026-05-10')).toBe('May 10');
  });

  it('reads the local date key for today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 10, 12));

    expect(getTodayDateKey()).toBe('2026-05-10');
  });

  it('extracts date keys from ISO values', () => {
    expect(getDateKeyFromIsoDate('2026-05-10T08:30:00.000Z')).toBe('2026-05-10');
    expect(getDateKeyFromIsoDate('not-a-date')).toBeNull();
    expect(getDateKeyFromIsoDate(null)).toBeNull();
  });

  it('builds a six-week month grid starting on Monday', () => {
    const days = buildCalendarDays(new Date(2026, 4, 1));

    expect(days).toHaveLength(42);
    expect(days[0]).toMatchObject({
      dateKey: '2026-04-27',
      dayNumber: 27,
      isCurrentMonth: false,
    });
    expect(days[4]).toMatchObject({
      dateKey: '2026-05-01',
      dayNumber: 1,
      isCurrentMonth: true,
    });
  });

  it('shifts months and calculates day differences', () => {
    expect(formatMonthLabel(shiftMonth(new Date(2026, 4, 10), 1))).toBe('June 2026');
    expect(getDayDifference('2026-05-12', '2026-05-10')).toBe(2);
    expect(getDayDifference('2026-05-03', '2026-05-10')).toBe(-7);
  });
});
