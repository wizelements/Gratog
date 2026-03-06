import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { syncSquareOrders } from '@/lib/square-orders-sync';
import { syncSquareCatalog } from '@/lib/square/catalogSync';

function makeJsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

function makeTextResponse(text: string, status = 200): Response {
  return new Response(text, {
    status,
    headers: { 'content-type': 'text/plain' }
  });
}

function createDbMock() {
  const collections = new Map<string, any>();

  const getCollection = (name: string) => {
    if (!collections.has(name)) {
      collections.set(name, {
        updateOne: vi.fn().mockResolvedValue({ upsertedCount: 0, matchedCount: 1, modifiedCount: 1 }),
        replaceOne: vi.fn().mockResolvedValue({ upsertedCount: 1 }),
        deleteMany: vi.fn().mockResolvedValue({ deletedCount: 0 }),
        insertMany: vi.fn().mockResolvedValue({ insertedCount: 0 }),
        createIndex: vi.fn().mockResolvedValue('idx'),
        countDocuments: vi.fn().mockResolvedValue(0),
        findOne: vi.fn().mockResolvedValue(null)
      });
    }
    return collections.get(name);
  };

  return {
    collections,
    db: {
      collection: vi.fn((name: string) => getCollection(name))
    }
  };
}

describe('Square Sync Resilience', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it('rejects client-secret token for orders sync with actionable error', async () => {
    process.env.SQUARE_ACCESS_TOKEN = 'sq0csp-bad-secret';
    process.env.SQUARE_ENVIRONMENT = 'production';
    process.env.SQUARE_LOCATION_ID = 'LOCATION_1';

    const { db } = createDbMock();

    await expect(syncSquareOrders(db as any)).rejects.toThrow(
      'SQUARE_ACCESS_TOKEN is a Client Secret'
    );
  });

  it('falls back to active locations when configured location is unavailable', async () => {
    process.env.SQUARE_ACCESS_TOKEN = 'EAAA_valid_token';
    process.env.SQUARE_ENVIRONMENT = 'production';
    process.env.SQUARE_LOCATION_ID = 'BAD_LOC';

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(makeJsonResponse({ errors: [{ detail: 'Location not found' }] }, 404))
      .mockResolvedValueOnce(makeJsonResponse({ locations: [{ id: 'GOOD_LOC', status: 'ACTIVE' }] }))
      .mockResolvedValueOnce(makeJsonResponse({ orders: [] }));

    vi.stubGlobal('fetch', fetchMock);

    const { db, collections } = createDbMock();

    const result = await syncSquareOrders(db as any);

    expect(result.success).toBe(true);
    expect(result.synced).toBe(0);

    const searchCall = fetchMock.mock.calls.find((call) => String(call[0]).includes('/v2/orders/search'));
    const searchPayload = JSON.parse(searchCall?.[1]?.body as string);
    expect(searchPayload.location_ids).toEqual(['GOOD_LOC']);

    const syncMeta = collections.get('square_sync_metadata');
    expect(syncMeta.updateOne).toHaveBeenCalled();
    const metadataSet = syncMeta.updateOne.mock.calls[0][1].$set;
    expect(metadataSet.locationIds).toEqual(['GOOD_LOC']);
  });

  it('fails clearly when Square returns non-JSON response during orders sync', async () => {
    process.env.SQUARE_ACCESS_TOKEN = 'EAAA_valid_token';
    process.env.SQUARE_ENVIRONMENT = 'production';
    process.env.SQUARE_LOCATION_ID = 'GOOD_LOC';

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(makeJsonResponse({ location: { id: 'GOOD_LOC', status: 'ACTIVE' } }))
      .mockResolvedValueOnce(makeTextResponse('<html>Bad Gateway</html>', 502));

    vi.stubGlobal('fetch', fetchMock);

    const { db } = createDbMock();

    await expect(syncSquareOrders(db as any)).rejects.toThrow('Square API returned a non-JSON response');
  });

  it('catalog sync resolves to active location when SQUARE_LOCATION_ID is missing', async () => {
    process.env.SQUARE_ACCESS_TOKEN = 'EAAA_valid_token';
    process.env.SQUARE_ENVIRONMENT = 'production';
    delete process.env.SQUARE_LOCATION_ID;

    const fetchMock = vi.fn()
      .mockResolvedValueOnce(makeJsonResponse({ locations: [{ id: 'CAT_LOC', status: 'ACTIVE' }] }))
      .mockResolvedValueOnce(makeJsonResponse({ location: { id: 'CAT_LOC', name: 'Main' } }))
      .mockResolvedValueOnce(makeJsonResponse({
        objects: [
          {
            id: 'ITEM_1',
            type: 'ITEM',
            item_data: {
              name: 'Sync Test Product',
              variations: []
            }
          }
        ]
      }));

    vi.stubGlobal('fetch', fetchMock);

    const { db, collections } = createDbMock();

    const result = await syncSquareCatalog(db as any);

    expect(result.items).toBe(1);

    const syncMeta = collections.get('square_sync_metadata');
    expect(syncMeta.replaceOne).toHaveBeenCalled();
    const metadataDoc = syncMeta.replaceOne.mock.calls[0][1];
    expect(metadataDoc.locationId).toBe('CAT_LOC');
    expect(metadataDoc.environment).toBe('production');
  });
});
