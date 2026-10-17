/** RFC 8058 one-click unsubscribe headers. Fail closed rather than sending unsafe headers. */
export function buildListUnsubscribeHeaders(rawUrl: unknown): Record<string, string> | undefined {
  if (rawUrl === undefined || rawUrl === null || rawUrl === '') return undefined;
  if (typeof rawUrl !== 'string' || /[\u0000-\u001f\u007f]/.test(rawUrl) || rawUrl.trim() !== rawUrl) {
    throw new Error('Invalid List-Unsubscribe URL');
  }
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error('Invalid List-Unsubscribe URL');
  }
  if (url.protocol !== 'https:' || !url.hostname || url.username || url.password || url.hash) {
    throw new Error('List-Unsubscribe must be an absolute HTTPS URL without credentials or fragments');
  }
  return {
    'List-Unsubscribe': `<${url.href}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}
