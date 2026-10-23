import { describe, expect, it } from 'vitest';
import { BROWNS_MILL_PICKUP, prepareBrownsMillMondayWindows } from '@/lib/browns-mill-pickup';
import { easternDisplayInput } from '@/lib/pickup-eastern-time';

describe('Browns Mill approved area plan', () => {
  it('uses the owner-approved neighborhood, Monday window and golfer-friendly wording', () => {
    expect(BROWNS_MILL_PICKUP.name).toBe('Browns Mill area pickup');
    expect(BROWNS_MILL_PICKUP.hoursLabel).toContain('Mondays · 12:00–5:00 PM ET');
    expect(BROWNS_MILL_PICKUP.golfNote).toContain('Golf clubs welcome');
    expect(BROWNS_MILL_PICKUP.locationVerified).toBe(false);
    expect(BROWNS_MILL_PICKUP.bookingsOpen).toBe(false);
    expect('street' in BROWNS_MILL_PICKUP).toBe(false);
  });

  it('builds Monday noon to five Eastern across the October daylight-saving transition', () => {
    const slots = prepareBrownsMillMondayWindows(new Date('2026-10-23T16:00:00Z'), 6, 24);
    expect(slots).toHaveLength(4);
    expect(slots[0]).toEqual({
      startsAt:'2026-10-26T16:00:00.000Z',
      endsAt:'2026-10-26T21:00:00.000Z',
      cutoffAt:'2026-10-25T16:00:00.000Z',
      capacity:6,
    });
    expect(slots[1].startsAt).toBe('2026-11-02T17:00:00.000Z');
    expect(slots[1].endsAt).toBe('2026-11-02T22:00:00.000Z');
    for(const slot of slots) {
      expect(new Date(slot.startsAt).getTime()).toBeGreaterThan(Date.parse(slot.cutoffAt));
      expect(easternDisplayInput(slot.startsAt).slice(11)).toBe('12:00');
      expect(easternDisplayInput(slot.endsAt).slice(11)).toBe('17:00');
      expect(slot.capacity).toBe(6);
    }
  });

  it('never invents a booking capacity or cutoff', () => {
    const now = new Date('2026-10-23T16:00:00Z');
    expect(() => prepareBrownsMillMondayWindows(now, NaN, 24)).toThrow(/verified capacity/);
    expect(() => prepareBrownsMillMondayWindows(now, 6, NaN)).toThrow(/cutoff/);
    expect(() => prepareBrownsMillMondayWindows(now, 0, 24)).toThrow(/verified capacity/);
  });

  it('skips same-day cutoff already passed', () => {
    const slots = prepareBrownsMillMondayWindows(new Date('2026-10-26T15:00:00Z'), 2, 24);
    expect(slots[0].startsAt).toBe('2026-11-02T17:00:00.000Z');
  });
});
