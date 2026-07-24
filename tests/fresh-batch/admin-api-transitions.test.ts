import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// Hoisted mocks
// ============================================================================

const mockHandles = vi.hoisted(() => {
  const docs: Record<string, unknown> = {};
  const mockCollection = {
    findOneAndUpdate: vi.fn().mockImplementation(async ({ id }: { id: string }) => {
      return docs[id] || null;
    }),
    findOne: vi.fn().mockImplementation(async ({ id }: { id: string }) => {
      return docs[id] || null;
    }),
    insertOne: vi.fn().mockResolvedValue({ insertedId: 'mock-id' }),
    updateMany: vi.fn().mockImplementation(async ({ id }: { id: { $in: string[] } }) => {
      const matched = id?.$in?.length ?? 0;
      return { matchedCount: matched, modifiedCount: matched };
    }),
    updateOne: vi.fn().mockResolvedValue({ matchedCount: 1, modifiedCount: 1 }),
    find: vi.fn().mockImplementation(async ({ id }: { id: { $in: string[] } }) => {
      const found = (id?.$in ?? []).map((key: string) => docs[key]).filter(Boolean);
      return {
        toArray: async () => found,
        sort: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
      };
    }),
    countDocuments: vi.fn().mockResolvedValue(0),
  };
  const mockDb = { collection: vi.fn().mockReturnValue(mockCollection) };
  return { mockCollection, mockDb, docs };
});

vi.mock('@/lib/db-optimized', () => ({
  connectToDatabase: vi.fn().mockResolvedValue({ db: mockHandles.mockDb }),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/lib/batches/audit-log', () => ({
  logRequestStatusChange: vi.fn().mockResolvedValue(undefined),
  logReservationCreated: vi.fn().mockResolvedValue(undefined),
  logPaymentLinkCreated: vi.fn().mockResolvedValue(undefined),
  logCommunication: vi.fn().mockResolvedValue(undefined),
  logPaymentReceived: vi.fn().mockResolvedValue(undefined),
  logReservationStatusChange: vi.fn().mockResolvedValue(undefined),
  appendAuditLogEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/auth/unified-admin', () => ({
  requireAdminSession: vi.fn().mockResolvedValue({ id: 'admin-1', email: 'owner@example.com' }),
}));

// ============================================================================
// Imports
// ============================================================================

import { PATCH } from '@/app/api/admin/fresh-batch/requests/route';

describe('admin request status transitions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockHandles.docs).forEach((k) => delete mockHandles.docs[k]);
  });

  function buildRequest(body: unknown) {
    return new Request('https://tasteofgratitude.shop/api/admin/fresh-batch/requests', {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  it('allows approved → canceled', async () => {
    mockHandles.docs['r1'] = {
      id: 'r1',
      status: 'approved',
      email: 'test@example.com',
      createdAt: new Date(),
    };
    const res = await PATCH(buildRequest({ ids: ['r1'], status: 'canceled' }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.modified).toBe(1);
  });

  it('rejects requested → confirmed without payment link', async () => {
    mockHandles.docs['r2'] = {
      id: 'r2',
      status: 'requested',
      email: 'test@example.com',
      createdAt: new Date(),
    };
    const res = await PATCH(buildRequest({ ids: ['r2'], status: 'confirmed' }));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.error).toContain('Invalid state transition');
  });

  it('rejects completed → canceled', async () => {
    mockHandles.docs['r3'] = {
      id: 'r3',
      status: 'completed',
      email: 'test@example.com',
      createdAt: new Date(),
    };
    const res = await PATCH(buildRequest({ ids: ['r3'], status: 'canceled' }));
    expect(res.status).toBe(409);
  });
});
