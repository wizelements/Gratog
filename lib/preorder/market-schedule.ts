/** Public market preorder schedule. All comparisons use Georgia (New York) wall time. */
export interface PreorderMarket {
  id: string;
  name: string;
  state?: string;
  dayOfWeek: number;
  hours: string;
  recurrence?: 'weekly' | 'first_third';
  isActive?: boolean;
}
const ZONE = 'America/New_York';
function localStamp(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date);
  const field = (key: string) => parts.find(p => p.type === key)?.value || '00';
  return field('year') + field('month') + field('day') + field('hour') + field('minute');
}
function utcDay(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d, 12));
}
function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '');
}
function cutoffKey(marketDate: Date): string {
  const yesterday = new Date(marketDate.getTime() - 86400000);
  return dateKey(yesterday) + '1800';
}
export function nextPreorderPickup(market: PreorderMarket, now = new Date()): Date | null {
  if (!market || market.isActive === false ||
      (market.state && market.state.toUpperCase() !== 'GA') ||
      !Number.isInteger(market.dayOfWeek) || market.dayOfWeek < 0 || market.dayOfWeek > 6) return null;
  const stamp = localStamp(now);
  const today = utcDay(Number(stamp.slice(0, 4)), Number(stamp.slice(4, 6)), Number(stamp.slice(6, 8)));
  for (let offset = 0; offset < 63; offset++) {
    const candidate = new Date(today.getTime() + offset * 86400000);
    if (candidate.getUTCDay() !== market.dayOfWeek) continue;
    const week = Math.floor((candidate.getUTCDate() - 1) / 7) + 1;
    if (market.recurrence === 'first_third' && week !== 1 && week !== 3) continue;
    if (stamp >= cutoffKey(candidate)) continue;
    return candidate;
  }
  return null;
}
export function marketDisplayHours(hours: string): string {
  const fmt = (part: string) => {
    const [rawH, rawM = '00'] = part.trim().split(':');
    const h = Number(rawH);
    if (!Number.isInteger(h) || h < 0 || h > 23) return part;
    return (h % 12 || 12) + ':' + rawM + (h < 12 ? ' AM' : ' PM');
  };
  const parts = (hours || '').split('-');
  return parts.length === 2 ? fmt(parts[0]) + ' – ' + fmt(parts[1]) : (hours || '');
}
export function marketWaitlistPrefix(name: string): string {
  const normalized = (name || '').toLowerCase();
  if (normalized.includes('serenbe')) return 'S';
  if (normalized.includes('dunwoody')) return 'D';
  if (normalized.includes('airport') || normalized.includes('hangar') || normalized.includes('hapeville')) return 'H';
  return (normalized.match(/[a-z]/)?.[0] || 'M').toUpperCase();
}