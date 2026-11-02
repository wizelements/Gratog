/**
 * Browser retry identity for market preorders.
 * Stores only the SHA-256 fingerprint + random UUID; no contact/cart contents.
 * A lost HTTP response replays the same server admission key.
 */
const STORE_KEY = 'tog_market_preorder_attempt_v1';
const WINDOW_MS = 60 * 60 * 1000;

export async function marketPreorderAttemptKey(payload: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  const signature = Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('');
  try {
    const raw = window.sessionStorage.getItem(STORE_KEY);
    const saved = raw ? JSON.parse(raw) : null;
    if (saved?.signature === signature && typeof saved.id === 'string' &&
      /^[a-f0-9-]{36}$/.test(saved.id) && Number.isFinite(saved.at) &&
      Date.now() >= saved.at && Date.now() - saved.at < WINDOW_MS) {
      return saved.id;
    }
  } catch {
    // Private browsing may block storage. The caller still synchronously
    // prevents concurrent clicks; server admissions remain atomic per key.
  }
  const id = crypto.randomUUID();
  try {
    window.sessionStorage.setItem(STORE_KEY, JSON.stringify({ signature, id, at: Date.now() }));
  } catch {}
  return id;
}
