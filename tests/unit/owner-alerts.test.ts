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
  sendEmail: vi.fn().mockResolvedValue({ success: true, id: 'resend_msg_123' }),
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
    _id: 'queue_item_001',
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
    mockCollection.findOneAndUpdate.mockResolvedValue({ value: null });
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
    mockCollection.findOne.mockResolvedValue(mockPendingItem());

    const result = await sendOwnerAlert(baseEvent);

    expect(result.queued).toBe(true);
    expect(result.dryRun).toBe(true);
    expect(result.telegram?.ok).toBe(false);
    expect(result.email?.ok).toBe(true);
    expect(sendEmail).toHaveBeenCalled();
  });

  it('attempts Telegram when configured and skips Resend on success', async () => {
    process.env.TELEGRAM_BOT_TOKEN = 'bot_token_test';
    process.env.TELEGRAM_CHAT_ID = '12345';

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ ok: true, result: { message_id: 42 } }),
    });

    mockCollection.findOne.mockResolvedValue(mockPendingItem());

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

    mockCollection.findOne.mockResolvedValue(mockPendingItem());

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

    const pending = mockPendingItem({ _id: 'q_1' });
    mockCollection.findOne.mockResolvedValue(pending);
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
    expect(mockCollection.updateOne).toHaveBeenCalled();
  });

  it('splits comma-separated ALERT_EMAIL into multiple recipients', async () => {
    process.env.ALERT_EMAIL = 'owner@tasteofgratitude.shop,fallback@tasteofgratitude.shop';
    mockCollection.findOne.mockResolvedValue(mockPendingItem());

    const result = await sendOwnerAlert(baseEvent);

    expect(result.email?.ok).toBe(true);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ['owner@tasteofgratitude.shop', 'fallback@tasteofgratitude.shop'],
      })
    );
  });
});
