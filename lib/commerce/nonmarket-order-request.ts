/**
 * Unified non-market order request rules. No inventory authority, hold or
 * payment may be derived from the existence of a request.
 */
import { CURRENT_MENU } from '@/lib/square-menu-stock';
import { approvedUnitPriceCents } from '@/lib/merchant-pricing';
import { validateCheckoutFulfillment } from '@/lib/order-admission';
import { validateGeorgiaDestination } from '@/lib/georgia-orders';

export type FulfillmentMethod = 'pickup' | 'delivery' | 'shipping';
const itemKey = (value: unknown): string => String(value || '').trim().toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const clean = (value: unknown, length: number): string =>
  typeof value === 'string' ? value.trim().slice(0, length) : '';

export class OrderRequestValidationError extends Error {
  constructor(public code: string, message: string) { super(message); }
}
const requireValid = (okay: boolean, code: string, message: string) => {
  if (!okay) throw new OrderRequestValidationError(code, message);
};
const catalog = new Map<string, (typeof CURRENT_MENU)[number]>();
for (const item of CURRENT_MENU) {
  for (const alias of [item.slug, item.name, ...item.aliases]) {
    const key = itemKey(alias);
    if (key) catalog.set(key, item);
  }
}

export function validatedRequest(input: any) {
  requireValid(input && typeof input === 'object' && !Array.isArray(input), 'INVALID_REQUEST', 'Invalid order request.');
  requireValid(input.preorderAcknowledged === true && input.confirmedFulfillment === true
    && input.preorderTermsVersion === '2026-10-31',
    'ACKNOWLEDGEMENT_REQUIRED', 'Please confirm these are unreserved items and review your selected fulfillment method.');
  const attempt = clean(input.requestId, 80);
  requireValid(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(attempt),
    'REQUEST_ID_REQUIRED', 'Start a new order request and retry.');
  requireValid(Array.isArray(input.items) && input.items.length > 0 && input.items.length <= 20,
    'ITEMS_REQUIRED', 'Choose between 1 and 20 different menu items.');
  const seen = new Set<string>();
  let totalUnits = 0;
  const items: Array<{slug:string;name:string;kind:string;quantity:number;unitPriceCents:number;extendedPriceCents:number}> = input.items.map((raw: any) => {
    const product = catalog.get(itemKey(raw?.slug || raw?.product));
    requireValid(Boolean(product), 'ITEM_NOT_APPROVED', 'An item is not on the approved current menu.');
    requireValid(!seen.has(product!.slug), 'DUPLICATE_ITEM', 'Combine duplicate products before continuing.');
    seen.add(product!.slug);
    const quantity = Number(raw?.quantity);
    requireValid(Number.isSafeInteger(quantity) && quantity >= 1 && quantity <= 32,
      'INVALID_QUANTITY', 'Each item must have a quantity between 1 and 32.');
    totalUnits += quantity;
    const unitPriceCents = approvedUnitPriceCents({ slug: product!.slug, name: product!.name });
    requireValid(Number.isSafeInteger(unitPriceCents) && Number(unitPriceCents) > 0,
      'PRICE_NOT_APPROVED', 'An item needs merchant-approved pricing.');
    return {
      slug: product!.slug, name: product!.name, kind: product!.kind,
      quantity, unitPriceCents: unitPriceCents!,
      extendedPriceCents: unitPriceCents! * quantity,
    };
  });
  requireValid(totalUnits <= 96, 'ORDER_TOO_LARGE', 'Contact us for larger custom orders.');

  const customer = {
    name: clean(input.customer?.name, 100),
    email: clean(input.customer?.email, 254).toLowerCase(),
    phone: clean(input.customer?.phone, 35),
  };
  requireValid(customer.name.length > 0 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email),
    'CONTACT_REQUIRED', 'Enter a name and valid email address.');
  const fulfillmentType = clean(input.fulfillmentType, 30) as FulfillmentMethod;
  requireValid(['pickup', 'delivery', 'shipping'].includes(fulfillmentType),
    'FULFILLMENT_REQUIRED', 'Choose scheduled pickup, local delivery, or Georgia shipping review.');

  const pickup = {
    locationId: clean(input.pickup?.locationId, 100),
    date: clean(input.pickup?.date, 30),
  };
  const address = {
    street: clean(input.address?.street, 120),
    suite: clean(input.address?.suite, 90),
    city: clean(input.address?.city, 80),
    state: clean(input.address?.state, 12).toUpperCase(),
    zip: clean(input.address?.zip, 15),
  };
  const deliveryTimeSlot = clean(input.deliveryTimeSlot, 80);
  const shippingMethod = fulfillmentType === 'shipping' ? 'merchant_quote_pending' : '';
  // Regular website pickup is Browns Mill pilot only. Market preorders have
  // their own selection/cutoffs and never enter this Square Messages route.
  if (fulfillmentType === 'pickup') {
    requireValid(pickup.locationId === 'browns-mill', 'MARKET_FLOW_REQUIRED',
      'Choose Browns Mill scheduled pickup, or use the dedicated market preorder page.');
    requireValid(/^\d{4}-\d{2}-\d{2}$/.test(pickup.date) &&
      Number.isFinite(Date.parse(pickup.date + 'T12:00:00Z')),
      'PICKUP_DATE_REQUIRED', 'Select a valid scheduled pickup date.');
    const pickupAt = new Date(pickup.date + 'T12:00:00Z');
    requireValid(pickupAt.getTime() >= Date.now() - 24*60*60_000 &&
      pickupAt.getTime() <= Date.now() + 60*24*60*60_000,
      'PICKUP_DATE_OUT_OF_RANGE', 'Choose an upcoming Monday within the next 60 days.');
    // Mondays only, without asserting a slot or staffing guarantee.
    requireValid(new Date(pickup.date + 'T12:00:00Z').getUTCDay() === 1,
      'PICKUP_DAY_REQUIRED', 'Browns Mill pickup requests are available on Mondays.');
  }
  const methodCheck = validateCheckoutFulfillment({
    fulfillmentType,
    pickup,
    deliveryAddress: address,
    deliveryTimeSlot,
    shippingAddress: address,
    shippingMethod,
  });
  requireValid(methodCheck.valid, methodCheck.code || 'FULFILLMENT_INVALID',
    methodCheck.message || 'Complete your fulfillment details.');
  if (fulfillmentType !== 'pickup') {
    const geo = validateGeorgiaDestination(address);
    requireValid(geo.valid, geo.code || 'GEORGIA_ONLY',
      geo.message || 'Delivery and shipping requests must have a Georgia address.');
  }
  const merchandiseTotalCents = items.reduce((sum, line) => sum + line.extendedPriceCents, 0);
  return {
    requestId: attempt, items, totalUnits, merchandiseTotalCents,
    customer, fulfillmentType,
    ...(fulfillmentType === 'pickup' ? {pickup} : {}),
    ...(fulfillmentType === 'delivery' ? {deliveryAddress: address, deliveryTimeSlot} : {}),
    ...(fulfillmentType === 'shipping' ? {shippingAddress: address, shippingMethod} : {}),
    preorderAcknowledged: true as const,
    preorderTermsVersion: '2026-10-31' as const,
    confirmedFulfillment: true as const,
    currency: 'USD' as const,
    status: 'awaiting_merchant_review' as const,
    paymentStatus: 'not_charged' as const,
    capacityReserved: false as const,
  };
}

/** Square-hosted Text Us pages must be supplied and proven by the merchant;
 * we never construct an undocumented /messages URL or guess a text number. */
export function verifiedSquareTextUsPage(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  try {
    const url = new URL(raw.trim());
    const host = url.hostname.toLowerCase();
    if (url.protocol !== 'https:' || url.username || url.password ||
        !(['square.site', 'squareup.com', 'square.online'].includes(host) ||
          ['.square.site', '.squareup.com', '.square.online'].some(suffix => host.endsWith(suffix)))) {
      return null;
    }
    return url.toString();
  } catch { return null; }
}
