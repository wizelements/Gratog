import { describe, expect, test, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('@/lib/db/turso', () => ({ getTursoConnection: vi.fn() }));

import { createSquareEventRepository } from '@/lib/webhooks/square-event-repository';

function fakeConnection() {
  const events = new Map<string, { status: string; processed_at: string | null; attempt_count: number }>();
  return {
    events,
    async get(_sql: string, eventId: string) { return events.get(eventId) ?? null; },
    async run(sql: string, ...args: unknown[]) {
      const eventId = String(sql.startsWith('INSERT') ? args[0] : args.at(-1));
      if (sql.startsWith('INSERT')) {
        if (events.has(eventId)) return { rowsAffected: 0 };
        events.set(eventId, { status: 'processing', processed_at: null, attempt_count: 1 });
        return { rowsAffected: 1 };
      }
      const current = events.get(eventId);
      const retryClaim = sql.includes("SET status = 'processing'");
      if (!current || current.status !== (retryClaim ? 'error' : 'processing')) return { rowsAffected: 0 };
      if (sql.includes("SET status = 'processing'")) {
        current.status = 'processing'; current.attempt_count += 1; current.processed_at = null;
      } else if (sql.includes("status = 'success'")) {
        current.status = 'success'; current.processed_at = String(args[0]);
      } else {
        current.status = 'error'; current.processed_at = String(args[0]);
      }
      return { rowsAffected: 1 };
    },
  };
}

describe('Square webhook Turso event repository', () => {
  test('claims a provider event once and suppresses replay after success', async () => {
    const db = fakeConnection();
    const repository = createSquareEventRepository(db as never);
    expect(await repository.claim('evt-1', 'payment.updated')).toEqual({ claimed: true, attemptCount: 1 });
    await repository.succeed('evt-1', { success: true });
    const replay = await repository.claim('evt-1', 'payment.updated');
    expect(replay).toMatchObject({ claimed: false, status: 'success', attemptCount: 1 });
  });

  test('does not grant a concurrent claim while the first delivery is processing', async () => {
    const db = fakeConnection();
    const repository = createSquareEventRepository(db as never);
    await repository.claim('evt-2', 'payment.updated');
    expect(await repository.claim('evt-2', 'payment.updated'))
      .toMatchObject({ claimed: false, status: 'processing', attemptCount: 1 });
  });

  test('permits a failed event to be claimed for one bounded retry attempt', async () => {
    const db = fakeConnection();
    const repository = createSquareEventRepository(db as never);
    await repository.claim('evt-3', 'payment.updated');
    await repository.fail('evt-3', 'EVENT_PROCESSING_FAILED');
    expect(await repository.claim('evt-3', 'payment.updated')).toEqual({ claimed: true, attemptCount: 2 });
  });
});
