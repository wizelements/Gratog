import { easternDisplayInput, easternInputToUtc } from './pickup-eastern-time';

/**
 * Owner-approved public service-area plan, NOT a verified pickup meeting point.
 * Actual appointments are bookable only after the merchant verifies and publishes
 * a specific safe/authorized address, staffing, cutoff, and capacity in admin.
 */
export const BROWNS_MILL_PICKUP = Object.freeze({
  name: 'Browns Mill area pickup',
  area: 'Browns Mill area',
  city: 'Atlanta',
  state: 'GA',
  day: 'Monday',
  startTime: '12:00 PM',
  endTime: '5:00 PM',
  weekday: 1,
  timeZone: 'America/New_York',
  hoursLabel: 'Mondays · 12:00–5:00 PM ET',
  golfNote: 'Stopping by after a round? Golf clubs welcome.',
  locationVerified: false,
  bookingsOpen: false,
});

/**
 * Admin-only proposal of the next four Mondays. No customer appointments are
 * published, and no capacity or cutoff is invented: admin must supply both.
 * Eastern wall-clock conversion remains correct across daylight saving changes.
 */
export function prepareBrownsMillMondayWindows(
  now: Date,
  capacity: number,
  cutoffHours: number,
  count = 4
) {
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) {
    throw new Error('Set a verified capacity between 1 and 100 appointments per Monday.');
  }
  if (!Number.isInteger(cutoffHours) || cutoffHours < 1 || cutoffHours > 168) {
    throw new Error('Choose an order cutoff from 1 to 168 hours before pickup.');
  }
  if (!Number.isInteger(count) || count < 1 || count > 12) {
    throw new Error('Invalid number of Monday windows.');
  }
  if (!Number.isFinite(now.getTime())) throw new Error('Invalid current date');

  // The date portion is evaluated in Georgia, not on the administrator's device.
  const localDay = easternDisplayInput(now.toISOString()).slice(0, 10);
  const [year, month, date] = localDay.split('-').map(Number);
  const midnight = Date.UTC(year, month - 1, date);
  const windows: { startsAt: string; endsAt: string; cutoffAt: string; capacity: number }[] = [];
  for (let offset = 0; offset < 100 && windows.length < count; offset++) {
    const dateUtc = new Date(midnight + offset * 86400000);
    if (dateUtc.getUTCDay() !== BROWNS_MILL_PICKUP.weekday) continue;
    const day = dateUtc.toISOString().slice(0, 10);
    const startsAt = easternInputToUtc(day + 'T12:00');
    const endsAt = easternInputToUtc(day + 'T17:00');
    const cutoffAt = new Date(Date.parse(startsAt) - cutoffHours * 3600000).toISOString();
    if (Date.parse(cutoffAt) <= now.getTime()) continue;
    windows.push({ startsAt, endsAt, cutoffAt, capacity });
  }
  if (windows.length !== count) throw new Error('Unable to generate enough future Monday slots.');
  return windows;
}
