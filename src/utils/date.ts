/**
 * Centralized Date Utilities for Aura
 * Ensures local timezone-safe formatting, parsing, and relative checks.
 */

/**
 * Formats a Date object as a local YYYY-MM-DD string.
 */
export const getLocalDateString = (date: Date = new Date()): string => {
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().split('T')[0];
};

/**
 * Parses a YYYY-MM-DD local date string back into a local Date object (set to midnight local time).
 */
export const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Gets a local date string relative to today.
 * e.g., daysAgo = 1 returns yesterday's local YYYY-MM-DD.
 */
export const getRelativeLocalDateString = (daysAgo: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return getLocalDateString(date);
};

/**
 * Formats a local YYYY-MM-DD date string for user friendly rendering.
 */
export const formatLocalDateStr = (dateStr: string, options?: Intl.DateTimeFormatOptions): string => {
  try {
    return parseLocalDate(dateStr).toLocaleDateString('en-US', options || { month: 'short', day: 'numeric' });
  } catch {
    return dateStr;
  }
};
