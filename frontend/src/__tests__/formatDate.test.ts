import { describe, expect, it } from 'vitest';
import { formatDate, formatMonth, formatMonthLabel } from '../utils/formatDate';

describe('formatDate utilities', () => {
  describe('formatDate', () => {
    it('formats a Date instance as dd.MM.yyyy', () => {
      expect(formatDate(new Date(2026, 4, 9))).toBe('09.05.2026');
    });

    it('formats numeric and string timestamps', () => {
      expect(formatDate('2026-05-10T08:30:00.000Z')).toMatch(/\d{2}\.\d{2}\.2026/);
      expect(formatDate(new Date(2026, 11, 1).getTime())).toBe('01.12.2026');
    });

    it('returns an empty string for null, undefined, empty, or invalid input', () => {
      expect(formatDate(null)).toBe('');
      expect(formatDate(undefined)).toBe('');
      expect(formatDate('')).toBe('');
      expect(formatDate('not-a-date')).toBe('');
    });
  });

  describe('formatMonth', () => {
    it('returns the long month name for the given locale by default', () => {
      expect(formatMonth(new Date(2026, 4, 10), 'en')).toBe('May');
      expect(formatMonth(new Date(2026, 4, 10), 'de')).toBe('Mai');
    });

    it('respects the short format option', () => {
      expect(formatMonth(new Date(2026, 0, 1), 'en', 'short')).toBe('Jan');
    });

    it('accepts string and numeric inputs', () => {
      expect(formatMonth('2026-05-10T00:00:00Z', 'en')).toBe('May');
      expect(formatMonth(new Date(2026, 2, 1).getTime(), 'en')).toBe('March');
    });

    it('returns an empty string for invalid input', () => {
      expect(formatMonth('not-a-date', 'en')).toBe('');
    });
  });

  describe('formatMonthLabel', () => {
    it('combines long month name and year for the locale', () => {
      expect(formatMonthLabel(new Date(2026, 4, 10), 'en')).toBe('May 2026');
      expect(formatMonthLabel(new Date(2026, 4, 10), 'de')).toBe('Mai 2026');
    });

    it('returns an empty string for invalid input', () => {
      expect(formatMonthLabel('not-a-date', 'en')).toBe('');
    });
  });
});
