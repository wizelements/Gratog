/**
 * One order attempt per unchanged checkout payload.
 * Persist only SHA-256 signature, UUID and timestamp — never cart or PII.
 *
 * localStorage shares this intent across same-origin tabs. Chromium/Web Locks
 * serialize simultaneous tab creation. Server-side unique Mongo admission is
 * still the final authority; never trust a browser-only mutex for payments.
 */
const KEY_PREFIX = 'tog_checkout_pending_order_v2:';
const RETRY_WINDOW_MS = 20 * 60 * 1000;

type Attempt = { signature: string; id: string; at: number };
let memoryAttempt: Attempt | null = null;

function validAttempt(value: Attempt | null, signature: string, now: number): value is Attempt {
  return Boolean(
    value && value.signature === signature && Number.isFinite(value.at) &&
    now >= value.at && now - value.at < RETRY_WINDOW_MS &&
    /^[a-f0-9-]{36}$/.test(value.id)
  );
}

export async function checkoutOrderIdempotencyKey(
  payload: unknown,
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null,
  now = Date.now()
): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const signature = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
  const key = KEY_PREFIX + signature;

  const getOrCreate = () => {
    const store = storage === undefined
      ? (typeof window === 'undefined' ? null : window.localStorage)
      : storage;
    let selected = validAttempt(memoryAttempt, signature, now) ? memoryAttempt : null;
    try {
      const raw = store?.getItem(key);
      const saved = raw ? JSON.parse(raw) as Attempt : null;
      if (validAttempt(saved, signature, now)) selected = saved;
      if (validAttempt(selected, signature, now)) {
        memoryAttempt = selected;
        return selected.id;
      }
      const attempt = { signature, id: crypto.randomUUID(), at: now };
      store?.setItem(key, JSON.stringify(attempt));
      memoryAttempt = attempt;
      return attempt.id;
    } catch {
      if (validAttempt(selected, signature, now)) return selected.id;
      const attempt = { signature, id: crypto.randomUUID(), at: now };
      memoryAttempt = attempt;
      return attempt.id;
    }
  };

  // Browser Web Locks provide cross-tab serialization where supported.
  if (storage === undefined && typeof navigator !== 'undefined' &&
      navigator.locks?.request) {
    return navigator.locks.request('tog_checkout_attempt:' + signature, getOrCreate);
  }
  return getOrCreate();
}

export function clearCheckoutOrderAttempt(storage?: Pick<Storage, 'removeItem'> | null): void {
  const existing = memoryAttempt;
  memoryAttempt = null;
  try {
    const store = storage === undefined
      ? (typeof window === 'undefined' ? null : window.localStorage)
      : storage;
    if (existing) store?.removeItem(KEY_PREFIX + existing.signature);
    // Legacy same-tab checkout key is retired; remove it when possible.
    if (storage === undefined && typeof window !== 'undefined') {
      window.sessionStorage.removeItem('tog_checkout_pending_order_v1');
    }
  } catch {
    // Storage may be disabled; the in-memory attempt is still cleared.
  }
}
