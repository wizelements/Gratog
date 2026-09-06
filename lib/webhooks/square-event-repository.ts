import 'server-only';
import { getTursoConnection } from '@/lib/db/turso';

type Connection = ReturnType<typeof getTursoConnection>;

export type SquareEventClaim =
  | { claimed: true; attemptCount: number }
  | { claimed: false; status: string; processedAt: string | null; attemptCount: number };

export function createSquareEventRepository(connection: Connection = getTursoConnection()) {
  return {
    async claim(eventId: string, eventType: string, now = new Date()): Promise<SquareEventClaim> {
      const timestamp = now.toISOString();
      const inserted = await connection.run(
        `INSERT INTO webhook_events
          (event_id, provider, event_type, status, attempt_count, first_attempt_at, last_attempt_at)
         VALUES (?, 'square', ?, 'processing', 1, ?, ?)
         ON CONFLICT(event_id) DO NOTHING`,
        eventId, eventType, timestamp, timestamp,
      );
      if (Number(inserted.rowsAffected) === 1) return { claimed: true, attemptCount: 1 };

      const current = await connection.get(
        `SELECT status, processed_at, attempt_count
           FROM webhook_events WHERE event_id = ? AND provider = 'square' LIMIT 1`,
        eventId,
      );
      if (!current) throw new Error('Square webhook event claim disappeared');

      if (String(current.status) === 'error') {
        const nextAttemptCount = Number(current.attempt_count) + 1;
        const retry = await connection.run(
          `UPDATE webhook_events
              SET status = 'processing', event_type = ?, attempt_count = attempt_count + 1,
                  last_attempt_at = ?, result_json = NULL
            WHERE event_id = ? AND provider = 'square' AND status = 'error'`,
          eventType, timestamp, eventId,
        );
        if (Number(retry.rowsAffected) === 1) {
          return { claimed: true, attemptCount: nextAttemptCount };
        }
      }

      const latest = await connection.get(
        `SELECT status, processed_at, attempt_count
           FROM webhook_events WHERE event_id = ? AND provider = 'square' LIMIT 1`,
        eventId,
      );
      return {
        claimed: false,
        status: String(latest?.status ?? current.status),
        processedAt: latest?.processed_at == null ? null : String(latest.processed_at),
        attemptCount: Number(latest?.attempt_count ?? current.attempt_count),
      };
    },

    async succeed(eventId: string, result: unknown, now = new Date()) {
      const timestamp = now.toISOString();
      const response = await connection.run(
        `UPDATE webhook_events SET status = 'success', processed_at = ?, last_attempt_at = ?, result_json = ?
          WHERE event_id = ? AND provider = 'square' AND status = 'processing'`,
        timestamp, timestamp, JSON.stringify(result ?? null), eventId,
      );
      if (Number(response.rowsAffected) !== 1) throw new Error('Square webhook event was not actively claimed');
    },

    async fail(eventId: string, errorCode: string, now = new Date()) {
      const timestamp = now.toISOString();
      const response = await connection.run(
        `UPDATE webhook_events SET status = 'error', processed_at = ?, last_attempt_at = ?, result_json = ?
          WHERE event_id = ? AND provider = 'square' AND status = 'processing'`,
        timestamp, timestamp, JSON.stringify({ errorCode }), eventId,
      );
      if (Number(response.rowsAffected) !== 1) throw new Error('Square webhook event was not actively claimed');
    },
  };
}

export function getSquareEventRepository() {
  return createSquareEventRepository();
}
