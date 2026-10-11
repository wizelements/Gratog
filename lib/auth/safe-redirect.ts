/**
 * Only accept same-origin relative paths. Query parameters are attacker-owned;
 * protocol-relative and backslash paths must never be treated as destinations.
 */
export function safeAccountRedirect(value: string | null | undefined): string {
  const path = value || '/profile';
  if (
    !path.startsWith('/') ||
    path.startsWith('//') ||
    path.includes('\\') ||
    /[\u0000-\u001f\u007f]/.test(path)
  ) return '/profile';
  return path;
}
