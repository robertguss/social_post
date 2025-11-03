/**
 * Time calculation utilities for post scheduling
 * Provides functions to add weeks and months to timestamps while preserving timezone
 */

/**
 * Adds specified number of weeks to a timestamp
 * @param timestamp - Unix timestamp in milliseconds
 * @param weeks - Number of weeks to add (can be negative)
 * @returns New timestamp with weeks added
 * @example
 * const nextWeek = addWeeks(Date.now(), 1); // +1 week from now
 * const threeWeeksAgo = addWeeks(Date.now(), -3); // -3 weeks from now
 */
export function addWeeks(timestamp: number, weeks: number): number {
  const date = new Date(timestamp);
  date.setDate(date.getDate() + weeks * 7);
  return date.getTime();
}

/**
 * Adds specified number of months to a timestamp
 * Automatically handles month boundaries and varying month lengths
 * @param timestamp - Unix timestamp in milliseconds
 * @param months - Number of months to add (can be negative)
 * @returns New timestamp with months added
 * @example
 * const nextMonth = addMonths(Date.now(), 1); // +1 month from now
 * const threeMonthsLater = addMonths(Date.now(), 3); // +3 months from now
 * // Edge case: Jan 31 + 1 month = Feb 28 (or 29 in leap year)
 */
export function addMonths(timestamp: number, months: number): number {
  const date = new Date(timestamp);
  date.setMonth(date.getMonth() + months);
  return date.getTime();
}
