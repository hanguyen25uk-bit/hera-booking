/**
 * Timezone utilities for converting UTC dates to salon local time.
 * All salon opening hours, staff hours, and discount times are stored
 * in the salon's local timezone (default: Europe/London).
 */

const DEFAULT_TIMEZONE = "Europe/London";

/**
 * Get the local hour and minute for a UTC date in the given timezone.
 */
export function getLocalTime(date: Date, timezone = DEFAULT_TIMEZONE): { hours: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  }).formatToParts(date);

  const hours = Number(parts.find(p => p.type === "hour")?.value ?? 0);
  const minutes = Number(parts.find(p => p.type === "minute")?.value ?? 0);
  return { hours, minutes };
}

/**
 * Get the local day of week (0=Sun, 6=Sat) for a UTC date in the given timezone.
 */
export function getLocalDayOfWeek(date: Date, timezone = DEFAULT_TIMEZONE): number {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    weekday: "short",
  });
  const weekday = formatter.format(date);
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return dayMap[weekday] ?? 0;
}

/**
 * Get the local HH:MM string for a UTC date in the given timezone.
 */
export function getLocalTimeString(date: Date, timezone = DEFAULT_TIMEZONE): string {
  const { hours, minutes } = getLocalTime(date, timezone);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/**
 * Get the local date string (YYYY-MM-DD) for a UTC date in the given timezone.
 */
export function getLocalDateString(date: Date, timezone = DEFAULT_TIMEZONE): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find(p => p.type === "year")?.value;
  const month = parts.find(p => p.type === "month")?.value;
  const day = parts.find(p => p.type === "day")?.value;
  return `${year}-${month}-${day}`;
}

/**
 * Convert a date string like "2026-05-01" into start/end of day
 * in the salon's timezone, returned as UTC Date objects.
 * Use for DB queries that need to find records within a salon-local day.
 */
export function getLocalDayRange(dateStr: string, timezone = DEFAULT_TIMEZONE): { start: Date; end: Date } {
  // Parse the date parts
  const [year, month, day] = dateStr.split("-").map(Number);

  // Create a date at midnight local time by finding the UTC offset
  // We use a reference point in the target timezone
  const refDate = new Date(`${dateStr}T12:00:00Z`); // noon UTC as reference
  const localTime = getLocalTime(refDate, timezone);

  // Calculate the offset: local noon should show as 12:00
  // offset = localHours - 12 (in hours)
  const offsetHours = localTime.hours - 12;

  // Start of day in local timezone = midnight local = (00:00 - offset) UTC
  const start = new Date(Date.UTC(year, month - 1, day, -offsetHours, 0, 0, 0));
  const end = new Date(Date.UTC(year, month - 1, day, 23 - offsetHours, 59, 59, 999));

  return { start, end };
}
