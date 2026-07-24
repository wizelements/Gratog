import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// Shared mock handles (hoisted)
// ============================================================================

const mockHandles = vi.hoisted(() => {
  const mockCollection = {
    findOneAndUpdate: vi.fn(),
    findOne: vi.fn(),
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    updateOne: vi.fn(),
    aggregate: vi.fn().mockReturnValue({
      toArray: vi.fn().mockResolvedValue([]),
    }),
  };
  const mockDb = { collection: vi.fn().mockReturnValue(mockCollection) };
  return { mockCollection, mockDb };
});

// ============================================================================
// Mocks (must be after hoisted and before imports)
// ============================================================================

vi.mock('@/lib/resend-email', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true, messageId: 'resend_msg_123' }),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    withCategory: vi.fn().mockReturnValue({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    }),
  },
}));

vi.mock('@/lib/db-optimized', () => ({
  connectToDatabase: vi.fn().mockResolvedValue({ db: mockHandles.mockDb }),
}));

// ============================================================================
// Imports
// ============================================================================

import {
  sendOwnerAlert,
  processOwnerAlertQueue,
  buildOrderConfirmedAlert,
  buildDailyReportAlert,
  formatTelegramMessage,
} from '@/lib/owner-alerts';
import { sendEmail } from '@/lib/resend-email';
import { ObjectId } from 'mongodb';
import { notifySquareTeam } from '@/lib/preorder/square-notifications';

const mockCollection = mockHandles.mockCollection;
const mockDb = mockHandles.mockDb;
// ============================================================================
// Helpers
// ============================================================================

const baseEvent = {
  sourceEventId: 'test:evt_001',
  category: 'order',
  severity: 'info' as const,
  title: 'Test alert',
  body: 'This is a test.',
  channel: 'all' as const,
  eventAt: '2026-07-23T00:00:00.000Z',
};

function mockPendingItem(overrides = {}) {
  return {
    _id: new ObjectId('64b000000000000000000001'),
    ...baseEvent,
    status: 'pending',
    attempts: 0,
    maxAttempts: 5,
    createdAt: '2026-07-23T00:00:00.000Z',
    updatedAt: '2026-07-23T00:00:00.000Z',
    ...overrides,
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('Owner alert router', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCollection.findOneAndUpdate.mockResolvedValue(mockPendingItem());
    mockCollection.findOne.mockResolvedValue(null);
    mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
    mockCollection.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
    process.env.ALERT_EMAIL = 'owner@tasteofgratitude.shop';
  });

  it('queues an alert and falls back to Resend when Telegram is not configured', async () => {
    const result = await sendOwnerAlert(baseEvent);

    expect(result.queued).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.telegram?.ok).toBe(false);
    expect(result.email?.ok).toBe(true);
    expect(sendEmail).toHaveBeenCalled();
    expect(mockCollection.updateOne).toHaveBeenNthCalledWith(
      1,
      { _id: expect.any(ObjectId), status: { $in: ['pending', 'failed'] } },
      expect.objectContaining({ $set: expect.objectContaining({ status: 'sending' }), $inc: { attempts: 1 } })
    );
    expect(mockCollection.updateOne).toHaveBeenNthCalledWith(
      2,
      { _id: expect.any(ObjectId) },
      expect.objectContaining({ $set: expect.objectContaining({ status: 'sent' }) })
    );
  });

  it('attempts Telegram when configured and skips Resend on success', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'bot_token_test';
    process.env.TELEGRAM_CHAT_ID = '12345';

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ ok: true, result: { message_id: 42 } }),
    });

    const result = await sendOwnerAlert(baseEvent);

    expect(result.telegram?.ok).toBe(true);
    expect(result.telegram?.messageId).toBe(42);
    expect(result.email?.ok).toBe(false);
    expect(sendEmail).not.toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('api.telegram.org/botbot_token_test/sendMessage'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('Test alert'),
      })
    );
  });

  it('falls back to Resend when Telegram HTTP call fails', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'bot_token_test';
    process.env.TELEGRAM_CHAT_ID = '12345';

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: vi.fn().mockResolvedValue('Unauthorized'),
    });

    const result = await sendOwnerAlert(baseEvent);

    expect(result.telegram?.ok).toBe(false);
    expect(result.email?.ok).toBe(true);
    expect(sendEmail).toHaveBeenCalled();
  });

  it('builds an order-confirmed alert from minimal order data', () => {
    const alert = buildOrderConfirmedAlert({
      id: 'order_123',
      orderNumber: 'TOG-456',
      customerName: 'Alex',
      total: 47.5,
      fulfillmentType: 'pickup_market',
    });

    expect(alert.sourceEventId).toBe('order:order_123');
    expect(alert.title).toContain('TOG-456');
    expect(alert.body).toContain('Alex');
    expect(alert.severity).toBe('info');
  });

  it('builds a daily report alert', () => {
    const alert = buildDailyReportAlert({
      date: '2026-07-22',
      summary: { totalRevenue: 1234.56, totalOrders: 23, avgOrderValue: 53.68 },
      topItems: [{ name: 'Sea Moss Gel', count: 12 }],
    });

    expect(alert.sourceEventId).toBe('daily_report:2026-07-22');
    expect(alert.title).toContain('2026-07-22');
    expect(alert.body).toContain('Sea Moss Gel');
  });

  it('formats Telegram messages with markdown and emoji', () => {
    const text = formatTelegramMessage({
      ...baseEvent,
      severity: 'critical',
      actionUrl: 'https://tasteofgratitude.shop/admin',
      metadata: { orderId: '123' },
    });

    expect(text).toContain('🚨');
    expect(text).toContain('*Test alert*');
    expect(text).toContain('[View in admin]');
  });

  it('processes pending queue items and marks them sent on success', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'bot_token_test';
    process.env.TELEGRAM_CHAT_ID = '12345';

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ ok: true, result: { message_id: 99 } }),
    });

    const pending = mockPendingItem({ _id: new ObjectId('000000000000000000000002') });
    mockCollection.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([pending]),
        }),
      }),
    });

    const results = await processOwnerAlertQueue(10);

    expect(results.length).toBe(1);
    expect(results[0].telegram?.ok).toBe(true);
    expect(mockCollection.find).toHaveBeenCalledWith({ status: { $in: ['pending', 'failed'] } });
    expect(mockCollection.findOneAndUpdate).not.toHaveBeenCalled();
    expect(mockCollection.updateOne).toHaveBeenCalledTimes(2);
    expect(mockCollection.updateOne).toHaveBeenLastCalledWith(
      { _id: pending._id },
      expect.objectContaining({ $set: expect.objectContaining({ status: 'sent' }) })
    );
  });

  it('splits comma-separated ALERT_EMAIL into multiple recipients', async () => {
    process.env.ALERT_EMAIL = 'owner@tasteofgratitude.shop,fallback@tasteofgratitude.shop';
    const result = await sendOwnerAlert(baseEvent);

    expect(result.email?.ok).toBe(true);
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['owner@tasteofgratitude.shop', 'fallback@tasteofgratitude.shop'],
      })
    );
  });

  it('retries failed alerts and dead-letters the final unsuccessful attempt', async () => {
    delete process.env.ALERT_EMAIL;
    const failed = mockPendingItem({
      _id: new ObjectId('000000000000000000000003'),
      status: 'failed',
      attempts: 4,
      maxAttempts: 5,
    });
    mockCollection.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([failed]) }),
      }),
    });

    const results = await processOwnerAlertQueue(10);

    expect(results).toHaveLength(1);
    expect(mockCollection.updateOne).toHaveBeenLastCalledWith(
      { _id: failed._id },
      expect.objectContaining({ $set: expect.objectContaining({ status: 'dead_letter' }) })
    );
  });

  it('reports preorder notification failure when no channel delivers', async () => {
    delete process.env.ALERT_EMAIL;
    vi.mocked(sendEmail).mockResolvedValue({ success: false, error: 'email unavailable', provider: 'resend' });

    const result = await notifySquareTeam({
      orderNumber: 'TOG-FAIL-1',
      waitlistNumber: 12,
      customer: { name: 'Test Customer', phone: '4045550100' },
      pickupLocation: 'Test Market',
      pickupDate: '2026-07-25',
      items: [{ name: 'Test Drink', quantity: 1, price: 9 }],
    });

    expect(result.success).toBe(false);
    expect(result.results.email.sent).toBe(false);
    expect(result.results.ownerAlert?.sent).toBe(false);
  });

  it('does not deliver an event that is already sent or claimed', async () => {
    mockCollection.findOneAndUpdate.mockResolvedValue(mockPendingItem({ status: 'sent' }));
    mockCollection.updateOne.mockResolvedValue({ modifiedCount: 0 });

    const result = await sendOwnerAlert(baseEvent);

    expect(result).toEqual({ queued: true });
    expect(sendEmail).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
