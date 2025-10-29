// Minimal REST client for Square API
const BASES = {
  production: "https://connect.squareup.com",
  sandbox: "https://connect.squareupsandbox.com",
} as const;

type Env = keyof typeof BASES;

export function sqBase(env: Env) {
  return BASES[env];
}

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
  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    // Normalize Square-style errors
    throw Object.assign(
      new Error(json?.errors?.[0]?.detail || `Square ${res.status}`),
      { status: res.status, errors: json?.errors, body: json }
    );
  }
  return json as T;
}
