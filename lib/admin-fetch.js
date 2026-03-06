/**
 * Admin-aware fetch wrapper
 * Automatically includes credentials and CSRF token for admin API calls.
 */

function getCsrfToken() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)admin_csrf=([^;]+)/);
  return match ? match[1] : null;
}

export async function adminFetch(url, options = {}) {
  const csrf = getCsrfToken();
  const headers = { ...options.headers };

  if (csrf) {
    headers['x-csrf-token'] = csrf;
  }
  if (!headers['Content-Type'] && options.method && options.method !== 'GET') {
    headers['Content-Type'] = 'application/json';
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });
}
