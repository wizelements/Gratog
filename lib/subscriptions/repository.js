import { getTursoConnection } from '@/lib/db/turso';

const SOURCE_COLLECTION = 'subscriptions';

function parsePayload(value) {
  try {
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
}

function mapSubscription(row) {
  if (!row) return null;
  const payload = parsePayload(row.payload_json);
  return {
    ...payload,
    _id: row.source_id,
    id: row.source_id,
    createdAt: payload.createdAt ?? row.occurred_at ?? null,
    status: payload.status ?? row.status ?? null,
  };
}

export async function listSubscriptionsByEmail(email, limit = 20) {
  const normalizedEmail = String(email ?? '').trim().toLowerCase();
  if (!normalizedEmail) return [];
  const safeLimit = Math.max(1, Math.min(100, Number(limit) || 20));
  const rows = await getTursoConnection().all(
    `SELECT source_id, occurred_at, status, payload_json
       FROM operational_records
      WHERE source_collection = ?
        AND lower(trim(coalesce(json_extract(payload_json, '$.email'), ''))) = ?
      ORDER BY coalesce(occurred_at, json_extract(payload_json, '$.createdAt')) DESC
      LIMIT ?`,
    SOURCE_COLLECTION,
    normalizedEmail,
    safeLimit,
  );
  return rows.map(mapSubscription);
}

export async function findSubscriptionForEmail(id, email) {
  const normalizedId = String(id ?? '').trim();
  const normalizedEmail = String(email ?? '').trim().toLowerCase();
  if (!normalizedId || !normalizedEmail) return null;
  const row = await getTursoConnection().get(
    `SELECT source_id, occurred_at, status, payload_json
       FROM operational_records
      WHERE source_collection = ?
        AND source_id = ?
        AND lower(trim(coalesce(json_extract(payload_json, '$.email'), ''))) = ?
      LIMIT 1`,
    SOURCE_COLLECTION,
    normalizedId,
    normalizedEmail,
  );
  return mapSubscription(row);
}
