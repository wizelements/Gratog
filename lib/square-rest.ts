// Minimal REST client for Square API
import http from 'http';
import https from 'https';

const BASES = {
  production: "https://connect.squareup.com",
  sandbox: "https://connect.squareupsandbox.com",
} as const;

type Env = keyof typeof BASES;

// HTTP agents with keep-alive and timeout for connection pooling
// This reduces latency by reusing connections across multiple API calls
const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 10,
  timeout: 8000 // 8 second socket timeout
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 10,
  timeout: 8000 // 8 second socket timeout
});

export function sqBase(env: Env) {
  return BASES[env];
}

/**
 * Square REST API client with timeout protection
 * - 8 second request timeout
 * - HTTP keep-alive for connection pooling
 * - Proper error classification
 */
export async function sqFetch<T>(
  env: Env,
  path: string,
  token: string,
  init: RequestInit = {},
) {
  const url = `${sqBase(env)}${path}`;
  const headers = {
    "Authorization": `Bearer ${token}`,
    "Square-Version": process.env.SQUARE_VERSION ?? "2025-10-16",
    "Content-Type": "application/json",
    ...(init.headers ?? {}),
  };

  // Create abort controller with 8 second timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 8000);

  try {
    const res = await fetch(url, {
      ...init,
      headers,
      signal: controller.signal,
      // Use HTTP agents for keep-alive + connection pooling
      ...(url.startsWith('https') ? { agent: httpsAgent } : { agent: httpAgent })
    });

    const text = await res.text();
    const json = text ? JSON.parse(text) : {};

    if (!res.ok) {
      // Normalize Square-style errors
      const errorDetail = json?.errors?.[0]?.detail || `Square ${res.status}`;
      const error = new Error(errorDetail);
      Object.assign(error, { status: res.status, errors: json?.errors, body: json });
      throw error;
    }

    return json as T;
  } catch (error) {
    // Distinguish timeout errors from other network errors
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Square API request timeout after 8 seconds');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
