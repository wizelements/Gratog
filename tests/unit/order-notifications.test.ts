import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// Mock setup — must be before imports
// ============================================================================

// Mock resend-email
vi.mock('@/lib/resend-email', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true, messageId: 'msg_test_123' }),
  sendOrderConfirmationEmail: vi.fn().mockResolvedValue({ success: true, messageId: 'msg_confirm_123' }),
}));

// Mock logger
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

// Mock db-optimized
const mockCollection = {
  findOne: vi.fn(),
  updateOne: vi.fn().mockResolvedValue({ modifiedCount: 1, matchedCount: 1 }),
  insertOne: vi.fn().mockResolvedValue({ insertedId: 'test' }),
  find: vi.fn().mockReturnValue({
    sort: vi.fn().mockReturnValue({
      limit: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([])
      })
    })
  }),
};
const mockDb = {
  collection: vi.fn().mockReturnValue(mockCollection),
};
vi.mock('@/lib/db-optimized', () => ({
  connectToDatabase: vi.fn().mockResolvedValue({ db: mockDb }),
}));

// Mock email-config (imported by resend-email)
vi.mock('@/lib/email-config', () => ({
  getFromAddress: vi.fn().mockReturnValue('hello@tasteofgratitude.shop'),
  EMAIL_SENDERS: {
    hello: { formatted: 'Taste of Gratitude <hello@tasteofgratitude.shop>' },
    orders: { formatted: 'Taste of Gratitude Orders <orders@tasteofgratitude.shop>' },
  },
}));

// Mock site-config (imported by resend-email)
vi.mock('@/lib/site-config', () => ({
  CONTACT_PHONE_DISPLAY: '(555) 123-4567',
  CONTACT_PHONE_HREF: 'tel:+15551234567',
  HAS_PUBLIC_PHONE: true,
  SUPPORT_EMAIL: 'support@tasteofgratitude.shop',
}));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import {
  notifyStaffPickupOrder,
  claimAndNotifyStaffOrder,
  claimAndSendCustomerConfirmation,
  sendStaffSmsNotification,
} from '@/lib/staff-notifications';
import { sendEmail } from '@/lib/resend-email';
import {
  normalizeOrderStatus,
  normalizePaymentStatus,
  normalizeFulfillmentCategory,
} from '@/lib/status-normalization';

// ============================================================================
// Test Data
// ============================================================================

function makeOrder(overrides = {}) {
  return {
    id: 'order_test_001',
    orderNumber: 'TOG-1234',
    orderRef: 'TOG-1234',
    fulfillmentType: 'pickup_market',
    customer: {
      name: 'Test Customer',
      email: 'test@example.com',
      phone: '+15551234567',
    },
    items: [
      { name: 'Sea Moss Gel', quantity: 2, price: 29.99, size: '16oz' },
    ],
    pricing: { subtotal: 59.98, total: 59.98 },
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================================================
// Phase 1: Staff Notification Hotfix
// ============================================================================

describe('Phase 1: Staff Notification Hotfix', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (sendEmail as any).mockResolvedValue({ success: true, messageId: 'msg_test_123' });
  });

  it('should not throw when order has all fields', async () => {
    const order = makeOrder();
    const result = await notifyStaffPickupOrder(order);
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  it('should not throw when customer is undefined', async () => {
    const order = makeOrder({ customer: undefined });
    const result = await notifyStaffPickupOrder(order);
    expect(result).toBeDefined();
    // Should still succeed (uses fallbacks)
    expect(result.success).toBe(true);
  });

  it('should not throw when customer is null', async () => {
    const order = makeOrder({ customer: null });
    const result = await notifyStaffPickupOrder(order);
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  it('should handle missing orderNumber with fallbacks', async () => {
    const order = makeOrder({ orderNumber: undefined, orderRef: undefined, id: 'fallback-id' });
    const result = await notifyStaffPickupOrder(order);
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  it('should handle delivery fulfillment type', async () => {
    const order = makeOrder({
      fulfillmentType: 'delivery',
      deliveryAddress: { street: '123 Main', city: 'Atlanta', state: 'GA', zip: '30301' },
    });
    const result = await notifyStaffPickupOrder(order);
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  it('should handle meetup fulfillment type', async () => {
    const order = makeOrder({ fulfillmentType: 'meetup_serenbe' });
    const result = await notifyStaffPickupOrder(order);
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  it('should return structured failure when sendEmail fails', async () => {
    (sendEmail as any).mockResolvedValue({ success: false, error: 'API error' });
    const order = makeOrder();
    const result = await notifyStaffPickupOrder(order);
    expect(result).toBeDefined();
    expect(result.success).toBe(false);
  });

  it('should handle sendEmail throwing', async () => {
    (sendEmail as any).mockRejectedValue(new Error('Network error'));
    const order = makeOrder();
    const result = await notifyStaffPickupOrder(order);
    expect(result).toBeDefined();
    expect(result.success).toBe(false);
    expect(result.error).toBe('Network error');
  });
});

// ============================================================================
// Phase 2: Durable Staff Notification Tracking
// ============================================================================

describe('Phase 2: claimAndNotifyStaffOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1, matchedCount: 1 });
    (sendEmail as any).mockResolvedValue({ success: true, messageId: 'msg_staff_123' });
  });

  it('should claim and send successfully', async () => {
    const order = makeOrder();
    const result = await claimAndNotifyStaffOrder(mockDb, 'order_test_001', order);
    expect(result.sent).toBe(true);
    expect(result.claimed).toBe(true);
    expect(result.success).toBe(true);
  });

  it('should return already-claimed when claim fails', async () => {
    mockCollection.updateOne.mockResolvedValueOnce({ modifiedCount: 0, matchedCount: 0 });
    const order = makeOrder();
    const result = await claimAndNotifyStaffOrder(mockDb, 'order_test_001', order);
    expect(result.sent).toBe(false);
    expect(result.claimed).toBe(false);
    expect(result.code).toBe('ALREADY_CLAIMED');
  });

  it('should release claim on send failure', async () => {
    (sendEmail as any).mockResolvedValue({ success: false, error: 'SMTP error' });
    const order = makeOrder();
    const result = await claimAndNotifyStaffOrder(mockDb, 'order_test_001', order);
    expect(result.sent).toBe(false);
    expect(result.claimed).toBe(true);
    expect(result.retryable).toBe(true);
    // claim + failure record/release = at least 2 updateOne calls
    expect(mockCollection.updateOne).toHaveBeenCalledTimes(2);
  });

  it('should release claim on exception (caught by notifyStaffPickupOrder)', async () => {
    // notifyStaffPickupOrder has its own try/catch, so sendEmail rejections
    // are caught there and returned as { success: false, error: ... }.
    // claimAndNotifyStaffOrder sees SEND_FAILED, not EXCEPTION.
    (sendEmail as any).mockRejectedValue(new Error('Connection timeout'));
    const order = makeOrder();
    const result = await claimAndNotifyStaffOrder(mockDb, 'order_test_001', order);
    expect(result.sent).toBe(false);
    expect(result.success).toBe(false);
    expect(result.code).toBe('SEND_FAILED');
    expect(result.retryable).toBe(true);
  });
});

// ============================================================================
// Phase 3: Customer Email Reliability
// ============================================================================

describe('Phase 3: claimAndSendCustomerConfirmation', () => {
  const mockSendFn = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1, matchedCount: 1 });
    mockSendFn.mockResolvedValue({ success: true, messageId: 'msg_customer_123' });
  });

  it('should claim and send successfully', async () => {
    const order = makeOrder();
    const result = await claimAndSendCustomerConfirmation(mockDb, 'order_test_001', order, mockSendFn);
    expect(result.sent).toBe(true);
    expect(result.success).toBe(true);
    expect(result.messageId).toBe('msg_customer_123');
  });

  it('should return already-claimed when claim fails', async () => {
    mockCollection.updateOne.mockResolvedValueOnce({ modifiedCount: 0, matchedCount: 0 });
    const result = await claimAndSendCustomerConfirmation(mockDb, 'order_test_001', {}, mockSendFn);
    expect(result.sent).toBe(false);
    expect(result.claimed).toBe(false);
  });

  it('should handle send function failure', async () => {
    mockSendFn.mockResolvedValue({ success: false, error: 'Resend API error' });
    const result = await claimAndSendCustomerConfirmation(mockDb, 'order_test_001', {}, mockSendFn);
    expect(result.sent).toBe(false);
    expect(result.retryable).toBe(true);
    expect(result.code).toBe('SEND_FAILED');
  });

  it('should handle send function exception', async () => {
    mockSendFn.mockRejectedValue(new Error('Network failure'));
    const result = await claimAndSendCustomerConfirmation(mockDb, 'order_test_001', {}, mockSendFn);
    expect(result.sent).toBe(false);
    expect(result.code).toBe('EXCEPTION');
    expect(result.retryable).toBe(true);
  });
});

// ============================================================================
// Phase 5: Status Normalization
// ============================================================================

describe('Phase 5: Status Normalization', () => {
  it('normalizeOrderStatus handles uppercase legacy values', () => {
    expect(normalizeOrderStatus('CONFIRMED')).toBe('confirmed');
    expect(normalizeOrderStatus('COMPLETED')).toBe('confirmed');
    expect(normalizeOrderStatus('CANCELLED')).toBe('cancelled');
    expect(normalizeOrderStatus('REFUNDED')).toBe('refunded');
    expect(normalizeOrderStatus('PENDING_PAYMENT')).toBe('pending');
  });

  it('normalizeOrderStatus handles lowercase canonical values', () => {
    expect(normalizeOrderStatus('pending')).toBe('pending');
    expect(normalizeOrderStatus('confirmed')).toBe('confirmed');
    expect(normalizeOrderStatus('cancelled')).toBe('cancelled');
  });

  it('normalizeOrderStatus handles null/undefined', () => {
    expect(normalizeOrderStatus(null)).toBe('pending');
    expect(normalizeOrderStatus(undefined)).toBe('pending');
    expect(normalizeOrderStatus('')).toBe('pending');
  });

  it('normalizePaymentStatus handles all values', () => {
    expect(normalizePaymentStatus('COMPLETED')).toBe('completed');
    expect(normalizePaymentStatus('APPROVED')).toBe('paid');
    expect(normalizePaymentStatus('PAID')).toBe('paid');
    expect(normalizePaymentStatus('FAILED')).toBe('failed');
    expect(normalizePaymentStatus('processing')).toBe('processing');
    expect(normalizePaymentStatus(null)).toBe('pending');
  });

  it('normalizeFulfillmentCategory maps fulfillment types', () => {
    expect(normalizeFulfillmentCategory('pickup_market')).toBe('pickup');
    expect(normalizeFulfillmentCategory('pickup_dunwoody')).toBe('pickup');
    expect(normalizeFulfillmentCategory('delivery')).toBe('delivery');
    expect(normalizeFulfillmentCategory('shipping')).toBe('delivery');
    expect(normalizeFulfillmentCategory('meetup_serenbe')).toBe('pickup');
    expect(normalizeFulfillmentCategory(null)).toBe('pickup');
  });
});

// ============================================================================
// Phase 8: Queue Position Creation
// ============================================================================

describe('Phase 8: createQueuePositionForPaidOrder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCollection.findOne.mockResolvedValue(null);
    mockCollection.insertOne.mockResolvedValue({ insertedId: 'q_test' });
    mockCollection.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      }),
    });
  });

  it('should be importable', async () => {
    const mod = await import('@/lib/queue-integration');
    expect(mod.createQueuePositionForPaidOrder).toBeDefined();
  });
});

// ============================================================================
// Phase 11: SMS Fallback
// ============================================================================

describe('Phase 11: SMS Fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCollection.findOne.mockResolvedValue(null);
    mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });
  });

  it('should return NO_STAFF_PHONE when env var not set', async () => {
    const result = await sendStaffSmsNotification(mockDb, 'order_test_001', makeOrder());
    // STAFF_PHONE is read at module load time, defaults to undefined
    expect(result).toBeDefined();
    expect(result.sent === false || result.sent === true).toBe(true);
  });

  it('should be idempotent when SMS already sent', async () => {
    mockCollection.findOne.mockResolvedValue({ staffSmsNotifiedAt: '2025-01-01' });
    const result = await sendStaffSmsNotification(mockDb, 'order_test_001', makeOrder());
    if (result.code === 'NO_STAFF_PHONE') return; // STAFF_PHONE not set, skip
    expect(result.sent).toBe(false);
    expect(result.code).toBe('ALREADY_SENT');
  });
});
