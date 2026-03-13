import { describe, expect, it } from 'vitest';
import {
  extractSquareVisibilityFlags,
  isSquareProductVisibleOnStorefront,
  normalizeSquareChannels,
} from '../lib/square-visibility';

describe('square-visibility', () => {
  it('hides archived products', () => {
    const flags = extractSquareVisibilityFlags({ squareIsArchived: true });

    expect(flags.squareIsArchived).toBe(true);
    expect(flags.shouldHideFromStorefront).toBe(true);
    expect(isSquareProductVisibleOnStorefront({ squareIsArchived: true })).toBe(false);
  });

  it('hides products with hidden or unindexed ecom visibility', () => {
    expect(isSquareProductVisibleOnStorefront({ squareEcomVisibility: 'hidden' })).toBe(false);
    expect(isSquareProductVisibleOnStorefront({ ecom_visibility: 'UNINDEXED' })).toBe(false);
  });

  it('hides products explicitly marked unavailable for ecom', () => {
    const flags = extractSquareVisibilityFlags({ ecom_available: false });

    expect(flags.squareEcomAvailable).toBe(false);
    expect(flags.hiddenByEcomAvailability).toBe(true);
    expect(flags.shouldHideFromStorefront).toBe(true);
  });

  it('hides products with explicit empty channel assignment metadata', () => {
    const hiddenByEmptyChannels = extractSquareVisibilityFlags({ squareChannels: [] });

    expect(hiddenByEmptyChannels.hasChannelMetadata).toBe(true);
    expect(hiddenByEmptyChannels.hiddenByChannelAssignment).toBe(true);
    expect(hiddenByEmptyChannels.shouldHideFromStorefront).toBe(true);
  });

  it('keeps products visible when channel metadata is absent', () => {
    const flags = extractSquareVisibilityFlags({ id: 'legacy-item-without-channel-data' });

    expect(flags.hasChannelMetadata).toBe(false);
    expect(flags.shouldHideFromStorefront).toBe(false);
  });

  it('normalizes channel IDs and keeps assigned products visible', () => {
    expect(normalizeSquareChannels([{ id: ' CH_1 ' }, 'CH_1', 'CH_2'])).toEqual(['CH_1', 'CH_1', 'CH_2']);

    const flags = extractSquareVisibilityFlags({
      channels: [{ id: 'SITE_CHANNEL' }],
      squareData: { channels: ['SITE_CHANNEL'] },
    });

    expect(flags.squareChannels).toEqual(['SITE_CHANNEL']);
    expect(flags.hasAssignedChannel).toBe(true);
    expect(isSquareProductVisibleOnStorefront({ channels: ['SITE_CHANNEL'] })).toBe(true);
  });

  it('hides products not present at configured Square location', () => {
    const flags = extractSquareVisibilityFlags(
      {
        present_at_all_locations: false,
        present_at_location_ids: ['LOCATION_A'],
      },
      { locationId: 'LOCATION_B' }
    );

    expect(flags.hiddenByLocationAssignment).toBe(true);
    expect(flags.shouldHideFromStorefront).toBe(true);
    expect(
      isSquareProductVisibleOnStorefront(
        {
          present_at_all_locations: false,
          present_at_location_ids: ['LOCATION_A'],
        },
        { locationId: 'LOCATION_B' }
      )
    ).toBe(false);
  });

  it('hides products explicitly absent at configured Square location', () => {
    const flags = extractSquareVisibilityFlags(
      {
        present_at_all_locations: true,
        absent_at_location_ids: ['LOCATION_B'],
      },
      { locationId: 'LOCATION_B' }
    );

    expect(flags.hiddenByLocationAssignment).toBe(true);
    expect(flags.shouldHideFromStorefront).toBe(true);
    expect(
      isSquareProductVisibleOnStorefront(
        {
          present_at_all_locations: true,
          absent_at_location_ids: ['LOCATION_B'],
        },
        { locationId: 'LOCATION_B' }
      )
    ).toBe(false);
  });
});
