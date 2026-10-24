import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocked = vi.hoisted(() => ({ connect: vi.fn() }));
vi.mock('@/lib/db-optimized', () => ({ connectToDatabase: mocked.connect }));

import { GET } from '@/app/api/health/route';

describe('production health/readiness contract', () => {
  beforeEach(() => mocked.connect.mockReset());

  it('responds 200 only when its actual Mongo dependency pings', async () => {
    const ping = vi.fn().mockResolvedValue({ ok: 1 });
    mocked.connect.mockResolvedValue({ db: { command: ping } });
    const response = await GET();
    const result = await response.json();
    expect(response.status).toBe(200);
    expect(result.status).toBe('healthy');
    expect(result.checks.database).toBe(true);
    expect(result.checks.databaseProvider).toBe('mongodb');
    expect(ping).toHaveBeenCalledWith({ ping: 1 });
  });

  it('fails closed with HTTP 503 when a database connection is unavailable', async () => {
    mocked.connect.mockResolvedValue(null);
    const response = await GET();
    const result = await response.json();
    expect(response.status).toBe(503);
    expect(result.status).toBe('unhealthy');
    expect(result.checks.database).toBe(false);
    expect(result.errors).toEqual(['Database connectivity check failed']);
  });

  it('fails closed when a previously successful connection cannot ping', async () => {
    mocked.connect.mockResolvedValue({
      db: { command: vi.fn().mockRejectedValue(new Error('private authentication details')) },
    });
    const response = await GET();
    const result = await response.json();
    expect(response.status).toBe(503);
    expect(result.status).toBe('unhealthy');
    expect(JSON.stringify(result)).not.toContain('private authentication details');
  });
});