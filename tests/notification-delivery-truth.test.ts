import { describe, expect, it, vi } from 'vitest';

// No real network, message provider or database is used in this regression.
vi.mock('../lib/db-optimized', () => ({
  connectToDatabase: vi.fn(async () => ({
    db: {
      collection: (name: string) => {
        if (name === 'notification_preferences') {
          return {
            findOne: async () => ({
              email: 'test@example.invalid',
              pushEnabled: true,
              emailEnabled: false,
              nearbyMarkets: true
            })
          };
        }
        if (name === 'push_subscriptions') {
          return { findOne: async () => ({ isActive: true, subscription: { endpoint: 'https://example.invalid' } }) };
        }
        if (name === 'notification_logs') {
          return { insertOne: async () => ({ acknowledged: true }) };
        }
        throw new Error(`Unexpected collection: ${name}`);
      }
    }
  }))
}));
vi.mock('../lib/resend-email', () => ({ sendEmail: vi.fn() }));
vi.mock('../lib/logger', () => ({ logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

import {
  MARKET_LOCATIONS,
  NOTIFICATION_TYPES,
  sendBulkNotification,
  sendLocationNotification,
  sendNotification
} from '../lib/push-notifications';

describe('notification delivery truth', () => {
  it('does not claim a push send just because an active subscription exists', async () => {
    const result = await sendNotification('test@example.invalid', NOTIFICATION_TYPES.WELCOME, {});
    expect(result).toEqual({ push: false, email: false, sms: false });
  });

  it('counts unsent notifications as skipped, not sent', async () => {
    const result = await sendBulkNotification(['test@example.invalid'], NOTIFICATION_TYPES.WELCOME, {});
    expect(result).toEqual({ sent: 0, failed: 0, skipped: 1 });
  });

  it('does not announce that a nearby-market alert was delivered when it was not', async () => {
    const result = await sendLocationNotification('test@example.invalid', {
      lat: 33.4068,
      lng: -84.7586
    });
    expect(result).toMatchObject({ sent: false, reason: 'delivery_unavailable' });
  });

  it('excludes paused markets from live location marketing', () => {
    expect(MARKET_LOCATIONS.map((market) => market.id)).toEqual(['serenbe']);
  });
});
