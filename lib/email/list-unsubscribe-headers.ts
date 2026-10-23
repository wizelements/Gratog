
/** Safe RFC 8058 one-click unsubscribe headers. Invalid addresses fail closed. */
export function buildListUnsubscribeHeaders(unsubscribeUrl?: string) {
  if (!unsubscribeUrl) return undefined;
  if (/[\x00-\x1f\x7f]/.test(unsubscribeUrl)) throw new Error('Invalid unsubscribe URL control character');
  let parsed: URL;
  try { parsed = new URL(unsubscribeUrl); } catch { throw new Error('Invalid unsubscribe URL'); }
  if (parsed.protocol !== 'https:' ||
      !['tasteofgratitude.shop','www.tasteofgratitude.shop'].includes(parsed.hostname) ||
      parsed.pathname !== '/unsubscribe' || parsed.username || parsed.password ||
      !parsed.searchParams.has('token')) {
    throw new Error('Unsubscribe link must be an authorized HTTPS token URL');
  }
  return {
    'List-Unsubscribe': '<'+parsed.toString()+'>',
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  };
}
