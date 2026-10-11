/**
 * One order attempt per unchanged checkout payload.
 * A response lost after the server commits can be retried without creating
 * another order. Do not persist the payload or personal data in this key.
 */
const KEY = 'tog_checkout_pending_order_v1';
const RETRY_WINDOW_MS = 20 * 60 * 1000;

type Attempt = { signature: string; id: string; at: number };
let memoryAttempt: Attempt | null = null;

export async function checkoutOrderIdempotencyKey(
  payload: unknown,
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null,
  now = Date.now()
): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const signature = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');

  let selected = memoryAttempt;
  try {
    const store = storage === undefined
      ? (typeof window === 'undefined' ? null : window.sessionStorage)
      : storage;
    const raw = store?.getItem(KEY);
    if (raw) selected = JSON.parse(raw) as Attempt;

    if (selected?.signature === signature && now - selected.at < RETRY_WINDOW_MS &&
        now >= selected.at && /^[a-f0-9-]{36}$/.test(selected.id)) {
      memoryAttempt = selected;
      return selected.id;
    }

    const attempt = { signature, id: crypto.randomUUID(), at: now };
    memoryAttempt = attempt;
    store?.setItem(KEY, JSON.stringify(attempt));
    return attempt.id;
  } catch {
    if (memoryAttempt?.signature === signature && now - memoryAttempt.at < RETRY_WINDOW_MS) {
      return memoryAttempt.id;
    }
    memoryAttempt = { signature, id: crypto.randomUUID(), at: now };
    return memoryAttempt.id;
  }
}

export function clearCheckoutOrderAttempt(storage?: Pick<Storage, 'removeItem'> | null): void {
  memoryAttempt = null;
  try {
    const store = storage === undefined
      ? (typeof window === 'undefined' ? null : window.sessionStorage)
      : storage;
    store?.removeItem(KEY);
  } catch {
    // Session storage may be disabled. In-memory state has still been cleared.
  }
}
