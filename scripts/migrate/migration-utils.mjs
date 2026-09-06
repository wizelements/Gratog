import { createHash } from 'node:crypto';

export const BACKUP_SHA256 = 'EDD422C06B813114D506C0A8DFCA4DFECCCB5E773218C6EB2D9E605FC9E0CE08';

export function sourceId(value) {
  if (value == null) throw new Error('SOURCE_ID_MISSING');
  return value.toString();
}

export function iso(value, field) {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.valueOf())) throw new Error(`INVALID_TIMESTAMP:${field}`);
  return date.toISOString();
}

export function cents(value, field, unit = 'cents') {
  if (value == null || value === '') return null;
  const source = typeof value === 'number' ? value.toString() : String(value);
  if (!/^-?\d+(?:\.\d+)?$/.test(source)) throw new Error(`INVALID_MONEY:${field}`);
  const parsed = Number(source);
  if (unit === 'cents') {
    if (!Number.isInteger(parsed)) throw new Error(`INEXACT_MONEY:${field}`);
    return parsed;
  }
  if (unit !== 'dollars') throw new Error(`UNKNOWN_MONEY_UNIT:${field}`);
  const negative = source.startsWith('-');
  const unsigned = negative ? source.slice(1) : source;
  const [whole, fraction = ''] = unsigned.split('.');
  if (fraction.length > 2 && /[1-9]/.test(fraction.slice(2))) throw new Error(`INEXACT_MONEY:${field}`);
  const converted = BigInt(whole) * 100n + BigInt((fraction + '00').slice(0, 2));
  const signed = negative ? -converted : converted;
  if (signed > BigInt(Number.MAX_SAFE_INTEGER) || signed < BigInt(Number.MIN_SAFE_INTEGER)) throw new Error(`MONEY_OUT_OF_RANGE:${field}`);
  return Number(signed);
}

function canonicalize(value) {
  if (value == null) return value;
  if (value instanceof Date) return value.toISOString();
  if (value?._bsontype) return value.toString();
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  return value;
}

export function fingerprint(value) {
  return createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex');
}

export function redactFailure(collection, document, error) {
  return {
    collection,
    sourceId: document?._id?.toString?.() ?? 'UNKNOWN',
    reasonCode: error instanceof Error ? error.message.split(':')[0] : 'UNKNOWN_ERROR',
    fields: error instanceof Error && error.message.includes(':') ? [error.message.split(':')[1]] : [],
    category: 'TRANSFORMATION',
  };
}
