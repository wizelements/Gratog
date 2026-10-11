import { describe, expect, it } from 'vitest';
import { nextPreorderPickup, marketDisplayHours, marketWaitlistPrefix } from '@/lib/preorder/market-schedule';

const friday = { id: 'market-object-id', name: 'Airport District Night Market', state: 'GA', dayOfWeek: 5, hours: '17:00-21:00', recurrence: 'first_third' as const, isActive: true };
const saturday = { id: 'market-object-id-2', name: 'DHA Dunwoody Farmers Market', state: 'GA', dayOfWeek: 6, hours: '09:00-12:00', recurrence: 'weekly' as const, isActive: true };
const day = (d: Date | null) => d?.toISOString().slice(0, 10);

describe('Georgia preorder market schedules', () => {
  it('uses active Friday recurrence and live Mongo ids', () => {
    expect(day(nextPreorderPickup(friday, new Date('2026-10-11T20:00:00Z')))).toBe('2026-10-16');
    expect(day(nextPreorderPickup(saturday, new Date('2026-10-11T20:00:00Z')))).toBe('2026-10-17');
  });
  it('closes at 6pm Georgia time on the day before pickup', () => {
    expect(day(nextPreorderPickup(friday, new Date('2026-10-15T21:59:00Z')))).toBe('2026-10-16');
    expect(day(nextPreorderPickup(friday, new Date('2026-10-15T22:01:00Z')))).toBe('2026-11-06');
    expect(day(nextPreorderPickup(saturday, new Date('2026-10-16T22:01:00Z')))).toBe('2026-10-24');
  });
  it('fails closed on inactive, out-of-state, malformed or unscheduled markets', () => {
    expect(nextPreorderPickup({ ...friday, isActive: false })).toBeNull();
    expect(nextPreorderPickup({ ...friday, state: 'FL' })).toBeNull();
    expect(nextPreorderPickup({ ...friday, dayOfWeek: 7 })).toBeNull();
  });
  it('keeps human-facing hours and concise waitlist numbers', () => {
    expect(marketDisplayHours('09:00-12:00')).toBe('9:00 AM – 12:00 PM');
    expect(marketWaitlistPrefix(friday.name)).toBe('H');
    expect(marketWaitlistPrefix(saturday.name)).toBe('D');
  });
});