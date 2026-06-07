import { describe, it, expect } from 'vitest';
import { resources, SUPPORTED_LANGUAGES } from '../locales';
import { formatDate, formatMonth } from '../utils/formatDate';

type Leaf = string | number | boolean;
type NestedRecord = { [key: string]: Leaf | NestedRecord };

/**
 * Keys whose German value is intentionally identical to English
 * (proper nouns, brand names, language labels, etc.).
 */
const ALLOWED_IDENTICAL_KEYS = new Set<string>([
  'common.appName',
  'common.language.english',
  'common.language.german',
  'auth.passwordChecks.minLength',
  'home.matchType.quiz',
  'courses.documents.sortName',
  'tasks.list.sortLabels.status',
  'tasks.fields.status',
]);

function flatten(obj: NestedRecord, prefix = ''): Record<string, Leaf> {
  const result: Record<string, Leaf> = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object') {
      Object.assign(result, flatten(value as NestedRecord, path));
    } else {
      result[path] = value as Leaf;
    }
  }
  return result;
}

function extractTokens(value: string): Set<string> {
  const matches = value.match(/\{\{\s*([^{}\s]+)\s*\}\}/g) ?? [];
  return new Set(matches.map((m) => m.replace(/[{}\s]/g, '')));
}

describe('locales', () => {
  for (const lang of SUPPORTED_LANGUAGES) {
    it(`registers a translation bundle for ${lang}`, () => {
      expect(resources[lang]).toBeDefined();
      expect(resources[lang].translation).toBeDefined();
    });
  }

  it('has identical key sets across all locales', () => {
    const flattened = SUPPORTED_LANGUAGES.map(
      (lang) => [lang, flatten(resources[lang].translation as NestedRecord)] as const
    );
    const reference = flattened[0];
    const referenceKeys = new Set(Object.keys(reference[1]));

    for (const [lang, table] of flattened.slice(1)) {
      const keys = new Set(Object.keys(table));
      const missingInLang = [...referenceKeys].filter((k) => !keys.has(k));
      const extraInLang = [...keys].filter((k) => !referenceKeys.has(k));
      expect(
        { lang, missing: missingInLang, extra: extraInLang },
        `Locale "${lang}" key parity vs "${reference[0]}" failed`
      ).toEqual({ lang, missing: [], extra: [] });
    }
  });

  it('has no empty leaf values in any locale', () => {
    for (const lang of SUPPORTED_LANGUAGES) {
      const flat = flatten(resources[lang].translation as NestedRecord);
      const empties = Object.entries(flat)
        .filter(([, value]) => typeof value === 'string' && value.trim() === '')
        .map(([key]) => key);
      expect(empties, `Locale "${lang}" has empty values`).toEqual([]);
    }
  });

  it('translates DE values away from EN (except known proper nouns)', () => {
    const enFlat = flatten(resources.en.translation as NestedRecord);
    const deFlat = flatten(resources.de.translation as NestedRecord);

    const identical = Object.entries(enFlat)
      .filter(([key, enValue]) => {
        if (ALLOWED_IDENTICAL_KEYS.has(key)) return false;
        return typeof enValue === 'string' && deFlat[key] === enValue;
      })
      .map(([key]) => key);

    expect(identical, 'DE values byte-identical to EN — translate or allowlist').toEqual([]);
  });

  it('preserves {{tokens}} across locales', () => {
    const enFlat = flatten(resources.en.translation as NestedRecord);
    const mismatches: Array<{
      key: string;
      en: string[];
      missingInLang: Record<string, string[]>;
    }> = [];

    for (const [key, enValue] of Object.entries(enFlat)) {
      if (typeof enValue !== 'string') continue;
      const enTokens = extractTokens(enValue);
      if (enTokens.size === 0) continue;

      const missingInLang: Record<string, string[]> = {};
      for (const lang of SUPPORTED_LANGUAGES) {
        if (lang === 'en') continue;
        const flat = flatten(resources[lang].translation as NestedRecord);
        const value = flat[key];
        if (typeof value !== 'string') continue;
        const langTokens = extractTokens(value);
        const missing = [...enTokens].filter((tok) => !langTokens.has(tok));
        if (missing.length > 0) missingInLang[lang] = missing;
      }

      if (Object.keys(missingInLang).length > 0) {
        mismatches.push({ key, en: [...enTokens], missingInLang });
      }
    }

    expect(mismatches, 'Interpolation tokens missing in non-EN locales').toEqual([]);
  });
});

describe('formatDate', () => {
  it('formats dates as dd.MM.yyyy with zero padding', () => {
    expect(formatDate(new Date(2026, 0, 1))).toBe('01.01.2026');
    expect(formatDate(new Date(2026, 11, 9))).toBe('09.12.2026');
    expect(formatDate(new Date(2026, 4, 24))).toBe('24.05.2026');
  });

  it('accepts ISO strings, timestamps, and Date instances', () => {
    expect(formatDate('2026-05-24T10:00:00.000Z')).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
    expect(formatDate(1748086400000)).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
    expect(formatDate(new Date(2026, 4, 24))).toBe('24.05.2026');
  });

  it('returns empty string for null, undefined, empty, and invalid inputs', () => {
    expect(formatDate(null)).toBe('');
    expect(formatDate(undefined)).toBe('');
    expect(formatDate('')).toBe('');
    expect(formatDate('not-a-date')).toBe('');
  });
});

describe('formatMonth', () => {
  it('returns English month names for en locale', () => {
    expect(formatMonth(new Date(2026, 4, 1), 'en', 'long')).toBe('May');
    expect(formatMonth(new Date(2026, 4, 1), 'en', 'short')).toBe('May');
  });

  it('returns German month names for de locale', () => {
    expect(formatMonth(new Date(2026, 4, 1), 'de', 'long')).toBe('Mai');
    expect(formatMonth(new Date(2026, 4, 1), 'de', 'short')).toBe('Mai');
  });
});
