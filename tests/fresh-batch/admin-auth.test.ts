import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================================================
// Hoisted mocks
// ============================================================================

const mockHandles = vi.hoisted(() => {
  const mockCollection = {
    findOne: vi.fn().mockResolvedValue(null),
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
        limit: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
      }),
      limit: vi.fn().mockReturnValue({ toArray: vi.fn().mockResolvedValue([]) }),
    }),
    updateMany: vi.fn().mockResolvedValue({ matchedCount: 0, modifiedCount: 0 }),
    insertOne: vi.fn().mockResolvedValue({ insertedId: 'mock-id' }),
  };
  const mockDb = { collection: vi.fn().mockReturnValue(mockCollection) };
  return { mockCollection, mockDb };
});

vi.mock('@/lib/db-optimized', () => ({
  connectToDatabase: vi.fn().mockResolvedValue({ db: mockHandles.mockDb }),
}));

// ============================================================================
// Imports
// ============================================================================

import { GET, PATCH } from '@/app/api/admin/fresh-batch/requests/route';
import { POST as createReservation } from '@/app/api/admin/fresh-batch/reservations/route';
import { requireAdminSession } from '@/lib/auth/unified-admin';

vi.mock('@/lib/auth/unified-admin', () => ({
  requireAdminSession: vi.fn(),
}));

function buildRequest(method: string, body?: unknown, search = ''): Request {
  const url = `https://tasteofgratitude.shop/api/admin/fresh-batch/requests${search}`;
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.body = JSON.stringify(body);
    init.headers = { 'Content-Type': 'application/json' };
  }
  return new Request(url, init);
}

describe('fresh-batch admin authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET rejects anonymous access', async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(null);
    const res = await GET(buildRequest('GET'));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe('Unauthorized');
  });

  it('PATCH rejects anonymous access', async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(null);
    const res = await PATCH(buildRequest('PATCH', { ids: ['r1'], status: 'canceled' }));
    expect(res.status).toBe(401);
  });

  it('POST reservations rejects anonymous access', async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(null);
    const res = await createReservation(
      buildRequest('POST', { requestId: 'r1', batchId: 'b1' })
    );
    expect(res.status).toBe(401);
  });

  it('GET allows authenticated admin', async () => {
    vi.mocked(requireAdminSession).mockResolvedValue({ id: 'admin-1', email: 'owner@example.com' });
    const res = await GET(buildRequest('GET'));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('GET does not leak existence when anonymous', async () => {
    vi.mocked(requireAdminSession).mockResolvedValue(null);
    const res = await GET(buildRequest('GET', undefined, '?id=nonexistent'));
    expect(res.status).toBe(401);
  });
});
