/**
 * Week boundary utilities aligned to America/New_York.
 * All functions are deterministic and safe to call at runtime (SSR/API/cron).
 * They intentionally avoid build-time execution so week ranges stay fresh.
 */

const DEFAULT_TIMEZONE = 'America/New_York';

function getPartsInZone(date: Date, timeZone: string = DEFAULT_TIMEZONE) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '0';
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour: Number(get('hour')),
    minute: Number(get('minute')),
    second: Number(get('second')),
  };
}

function makeDateInZone(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  ms: number,
  timeZone: string = DEFAULT_TIMEZONE
): Date {
  // Build the intended wall-clock time as a UTC timestamp, then shift it by the
  // timezone offset so that new Date().toISOString() reports that same wall time
  // when rendered back in the target zone. Keeps logic deterministic regardless of
  // the host's local timezone.
  const pad = (n: number) => String(n).padStart(2, '0');
  const wallIso = `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}:${pad(second)}.${String(ms).padStart(3, '0')}`;
  const wallDate = new Date(wallIso);
  if (Number.isNaN(wallDate.getTime())) {
    throw new Error(`Invalid wall-clock date constructed: ${wallIso}`);
  }

  const zoneFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = zoneFormatter.formatToParts(wallDate);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);

  const offsetMs =
    wallDate.getTime() -
    Date.UTC(
      get('year'),
      get('month') - 1,
      get('day'),
      get('hour'),
      get('minute'),
      get('second'),
      ms
    );

  return new Date(wallDate.getTime() + offsetMs);
}

/**
 * Return the current week range (Monday 00:00 NY – Sunday 23:59:59.999 NY)
 * as UTC ISO strings.
 *
 * Note: weekStart is the most recent Monday at midnight NY, and weekEnd is the
 * following Sunday at 23:59:59.999 NY. This matches the business convention used
 * in the admin UI ("Week Start (Monday)" / "Week End (Sunday)").
 */
export function getCurrentWeekRange(timeZone: string = DEFAULT_TIMEZONE) {
  const now = new Date();
  const parts = getPartsInZone(now, timeZone);

  // JS Date day-of-week: 0=Sunday, 1=Monday, ..., 6=Saturday
  const jsDay = new Date(
    parts.year,
    parts.month - 1,
    parts.day
  ).getDay();

  const diffToMonday = (jsDay + 6) % 7;

  // Use UTC arithmetic for day shifts so month boundaries wrap correctly.
  const mondayUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day - diffToMonday,
    0, 0, 0, 0
  );
  const sundayUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day + (6 - diffToMonday),
    23, 59, 59, 999
  );

  const monday = makeDateInZone(
    new Date(mondayUtc).getUTCFullYear(),
    new Date(mondayUtc).getUTCMonth() + 1,
    new Date(mondayUtc).getUTCDate(),
    0,
    0,
    0,
    0,
    timeZone
  );

  const sunday = makeDateInZone(
    new Date(sundayUtc).getUTCFullYear(),
    new Date(sundayUtc).getUTCMonth() + 1,
    new Date(sundayUtc).getUTCDate(),
    23,
    59,
    59,
    999,
    timeZone
  );

  return {
    weekStart: monday.toISOString(),
    weekEnd: sunday.toISOString(),
    timeZone,
  };
}

/**
 * Format a week range for display (e.g. "Jul 27 – Aug 2, 2026").
 */
export function formatWeekRange(startIso: string, endIso: string): string {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', timeZone: DEFAULT_TIMEZONE };
  const yearOpts: Intl.DateTimeFormatOptions = { ...opts, year: 'numeric' };

  if (start.getFullYear() !== end.getFullYear()) {
    return `${start.toLocaleDateString('en-US', yearOpts)} – ${end.toLocaleDateString('en-US', yearOpts)}`;
  }
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', yearOpts)}`;
}

/**
 * Check whether a given ISO timestamp is strictly before the start of today in NY.
 * Useful for auto-archiving menus whose weekEnd has passed.
 */
export function isExpiredInZone(isoTimestamp: string, timeZone: string = DEFAULT_TIMEZONE): boolean {
  const end = new Date(isoTimestamp);
  const now = new Date();
  const nowParts = getPartsInZone(now, timeZone);
  const todayStart = makeDateInZone(
    nowParts.year,
    nowParts.month,
    nowParts.day,
    0,
    0,
    0,
    0,
    timeZone
  );
  return end < todayStart;
}

/**
 * Return a Date representing midnight today in NY.
 */
export function getTodayStart(timeZone: string = DEFAULT_TIMEZONE): Date {
  const now = new Date();
  const parts = getPartsInZone(now, timeZone);
  return makeDateInZone(parts.year, parts.month, parts.day, 0, 0, 0, 0, timeZone);
}
