/**
 * Guided order enquiry handoff. Does not submit an order, reserve inventory,
 * quote delivery, or take payment. SMS is composed in the visitor's device.
 */
export const PRIMARY_ORDER_PHONE = '+14047899960';
// Merchant-approved customer-facing contact (confirmed October 30, 2026).
export const JENNEISHA_ORDER_PHONE = '+14706633225';

export function normalizeUSPhone(input) {
  if (typeof input !== 'string') return null;
  const digits = input.replace(/\D/g, '');
  if (digits.length === 10) return '+1' + digits;
  if (digits.length === 11 && digits.startsWith('1')) return '+' + digits;
  return null;
}

export function getOrderContacts(secondary = JENNEISHA_ORDER_PHONE) {
  const contacts = [{ key: 'solomon', name: 'Solomon', number: PRIMARY_ORDER_PHONE }];
  const jenneisha = normalizeUSPhone(secondary);
  if (jenneisha && jenneisha !== PRIMARY_ORDER_PHONE) {
    contacts.push({ key: 'jenneisha', name: 'Jenneisha', number: jenneisha });
  }
  return contacts;
}

function clean(value, limit = 400) {
  return String(value || '').replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limit);
}

const INTENTS = {
  market: 'Market pickup request',
  preorder: 'Custom preorder request',
  delivery: 'Local delivery enquiry',
};
export function buildOrderRequest(fields) {
  const intent = Object.prototype.hasOwnProperty.call(INTENTS, fields?.intent)
    ? fields.intent : 'preorder';
  const lines = [
    'Taste of Gratitude — ' + INTENTS[intent],
    'Name: ' + clean(fields?.name, 80),
    'Items / quantities: ' + clean(fields?.items, 600),
  ];
  const date = clean(fields?.desiredDate, 80);
  const location = clean(fields?.location, 100);
  const notes = clean(fields?.notes, 400);
  if (date) lines.push('Preferred day: ' + date);
  if (location) lines.push('Market / area / ZIP: ' + location);
  if (notes) lines.push('Notes: ' + notes);
  lines.push('Please confirm availability, total, and next steps. I understand this is not a confirmed order or payment.');
  return lines.join('\n');
}

export function makeSmsHref(number, message) {
  const safeNumber = normalizeUSPhone(number);
  if (!safeNumber || !message) return null;
  return 'sms:' + safeNumber + '?body=' + encodeURIComponent(message);
}
