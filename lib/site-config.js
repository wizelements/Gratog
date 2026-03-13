export const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tasteofgratitude.shop';
export const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'hello@tasteofgratitude.shop';
export const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || CONTACT_EMAIL;
export const PRIVACY_EMAIL = process.env.PRIVACY_EMAIL || 'privacy@tasteofgratitude.shop';
export const WHOLESALE_EMAIL = process.env.WHOLESALE_EMAIL || 'wholesale@tasteofgratitude.shop';
export const SUPPORT_HOURS_LABEL = process.env.SUPPORT_HOURS_LABEL || 'Monday-Friday 9 AM-6 PM ET';
export const MARKET_LOCATION_LABEL = process.env.MARKET_LOCATION_LABEL || 'Atlanta, Georgia';

function normalizePhoneForTel(phoneValue) {
  const input = String(phoneValue || '').trim();
  if (!input) {
    return '';
  }

  const startsWithPlus = input.startsWith('+');
  const numeric = input.replace(/\D/g, '');
  if (!numeric) {
    return '';
  }

  if (startsWithPlus) {
    return `+${numeric}`;
  }

  return numeric.startsWith('1') ? `+${numeric}` : `+1${numeric}`;
}

export const CONTACT_PHONE_DISPLAY = String(
  process.env.CONTACT_PHONE_DISPLAY || process.env.CONTACT_PHONE || ''
).trim();
export const CONTACT_PHONE_TEL = normalizePhoneForTel(
  process.env.CONTACT_PHONE_E164 || CONTACT_PHONE_DISPLAY
);
export const HAS_PUBLIC_PHONE = Boolean(CONTACT_PHONE_DISPLAY && CONTACT_PHONE_TEL);
export const CONTACT_PHONE_HREF = HAS_PUBLIC_PHONE ? `tel:${CONTACT_PHONE_TEL}` : '';

export const PUBLIC_CONTACT = {
  email: CONTACT_EMAIL,
  supportEmail: SUPPORT_EMAIL,
  privacyEmail: PRIVACY_EMAIL,
  wholesaleEmail: WHOLESALE_EMAIL,
  phoneDisplay: CONTACT_PHONE_DISPLAY,
  phoneHref: CONTACT_PHONE_HREF,
  hasPublicPhone: HAS_PUBLIC_PHONE,
  supportHours: SUPPORT_HOURS_LABEL,
  marketLocation: MARKET_LOCATION_LABEL,
};

export function absoluteUrl(path = '/') {
  const safePath = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${safePath}`;
}
