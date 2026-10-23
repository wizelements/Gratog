import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => {
  const entries = [{ id: '4d1575a8-2b41-4e26-9a41-32d876541041', intent: 'event_booking_inquiry', status: 'new', name: 'Customer' }];
  const toArray = vi.fn().mockResolvedValue(entries);
  const limit = vi.fn().mockReturnValue({ toArray });
  const skip = vi.fn().mockReturnValue({ limit });
  const sort = vi.fn().mockReturnValue({ skip });
  const find = vi.fn().mockReturnValue({ sort });
  const countDocuments = vi.fn().mockResolvedValue(1);
  const updateOne = vi.fn().mockResolvedValue({ matchedCount: 1 });
  const collection = vi.fn().mockReturnValue({ find, countDocuments, updateOne });
  const connectToDatabase = vi.fn().mockResolvedValue({ db: { collection } });
  const getAdminSession = vi.fn().mockResolvedValue({ id: 'admin1', role: 'admin', email: 'admin@example.com' });
  return { collection, find, sort, skip, limit, toArray, countDocuments, updateOne, connectToDatabase, getAdminSession };
});

vi.mock('@/lib/db-optimized', () => ({ connectToDatabase: mocks.connectToDatabase }));
vi.mock('@/lib/admin-session', () => ({ getAdminSession: mocks.getAdminSession }));
vi.mock('@/lib/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('@/lib/security', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/security')>();
  return { ...original, checkRateLimit: vi.fn().mockReturnValue({ allowed: true, remaining: 40, resetAt: Date.now() + 60000 }), logAdminAction: vi.fn().mockResolvedValue(undefined) };
});

import { GET, PATCH } from '@/app/api/admin/event-inquiries/route';

const get = (query='') => GET(new NextRequest('http://localhost/api/admin/event-inquiries'+query));
const patch = (body: unknown) => PATCH(new NextRequest('http://localhost/api/admin/event-inquiries', {
  method:'PATCH',
  headers:{'content-type':'application/json','x-csrf-token':'test-token','cookie':'admin_csrf=test-token'},
  body: JSON.stringify(body),
}));

beforeEach(() => {
  mocks.getAdminSession.mockResolvedValue({ id:'admin1', email:'admin@example.com', role:'admin' });
  mocks.find.mockClear();
  mocks.updateOne.mockClear();
  mocks.collection.mockClear();
  mocks.toArray.mockResolvedValue([{ id:'4d1575a8-2b41-4e26-9a41-32d876541041', status:'new', name:'Customer' }]);
  mocks.countDocuments.mockResolvedValue(1);
});

describe('authenticated event inquiry pipeline', () => {
  it('does not leak customer PII to unauthenticated sessions', async () => {
    mocks.getAdminSession.mockResolvedValueOnce(null);
    const response = await get();
    expect(response.status).toBe(401);
    expect(mocks.find).not.toHaveBeenCalled();
  });

  it('lists only event inquiries, capped at 25, using no-store response', async () => {
    const response = await get('?page=2&status=quoted');
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(mocks.find.mock.calls[0][0]).toEqual({ intent:'event_booking_inquiry', status:'quoted' });
    expect(mocks.skip).toHaveBeenCalledWith(25);
    expect(mocks.limit).toHaveBeenCalledWith(25);
    const body = await response.json();
    expect(body.inquiries).toHaveLength(1);
  });

  it('rejects invalid status filters before querying the database', async () => {
    expect((await get('?status=../../admin')).status).toBe(400);
    expect(mocks.find).not.toHaveBeenCalled();
  });

  it('scopes status changes by UUID and event intent and records the admin', async () => {
    const id = '4d1575a8-2b41-4e26-9a41-32d876541041';
    const response = await patch({ id, status:'quoted' });
    expect(response.status).toBe(200);
    expect(mocks.updateOne.mock.calls[0][0]).toEqual({ id, intent:'event_booking_inquiry' });
    expect(mocks.updateOne.mock.calls[0][1].$set).toMatchObject({ status:'quoted', updatedByAdminId:'admin1' });
  });

  it('denies status changes to viewer accounts', async () => {
    mocks.getAdminSession.mockResolvedValueOnce({ id:'viewer', email:'viewer@example.com', role:'viewer' });
    const response = await patch({ id:'4d1575a8-2b41-4e26-9a41-32d876541041', status:'booked' });
    expect(response.status).toBe(403);
    expect(mocks.updateOne).not.toHaveBeenCalled();
  });

  it('rejects arbitrary statuses and missing records', async () => {
    expect((await patch({ id:'4d1575a8-2b41-4e26-9a41-32d876541041', status:'paid' })).status).toBe(400);
    mocks.updateOne.mockResolvedValueOnce({matchedCount:0});
    expect((await patch({ id:'4d1575a8-2b41-4e26-9a41-32d876541041', status:'booked' })).status).toBe(404);
  });
});
