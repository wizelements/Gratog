export const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tasteofgratitude.shop';
export const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'hello@tasteofgratitude.shop';
export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || CONTACT_EMAIL;

export function absoluteUrl(path = '/') {
  const safePath = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${safePath}`;
}
