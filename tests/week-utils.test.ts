import { describe, expect, it } from 'vitest';
import { formatWeekRange, getCurrentWeekRange } from '@/lib/menus/week-utils';

describe('New York week boundaries', () => {
  it('returns Monday through Sunday independently of host timezone', () => {
    const range = getCurrentWeekRange(
      'America/New_York',
      new Date('2026-09-17T12:00:00.000Z')
    );

    expect(range.weekStart).toBe('2026-09-14T04:00:00.000Z');
    expect(range.weekEnd).toBe('2026-09-21T03:59:59.999Z');
    expect(formatWeekRange(range.weekStart, range.weekEnd))
      .toBe('Sep 14 – Sep 20, 2026');
  });

  it('handles a daylight-saving transition week', () => {
    const range = getCurrentWeekRange(
      'America/New_York',
      new Date('2026-11-01T17:00:00.000Z')
    );

    expect(range.weekStart).toBe('2026-10-26T04:00:00.000Z');
    expect(range.weekEnd).toBe('2026-11-02T04:59:59.999Z');
    expect(formatWeekRange(range.weekStart, range.weekEnd))
      .toBe('Oct 26 – Nov 1, 2026');
  });
});
