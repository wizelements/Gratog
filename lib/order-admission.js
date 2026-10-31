/**
 * Taste of Gratitude checkout admission rules.
 * Pure, reusable validation at BOTH order creation and Square payment.
 * Unknown fulfillment must never silently become pickup.
 */
const text = (value) => typeof value === 'string' ? value.trim() : '';
const key = (value) => text(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const SIX_LEMONADES = Object.freeze([
  'calm-waters', 'supplemint', 'gracious-roots',
  'kissed-by-gods', 'melon-rita', 'passion-guava-pineapple',
]);
const RETIRED_IDENTITIES = new Set([
  'healing-harmony', 'healing-harmony-gel', 'soursop-spice-sea-moss-gel',
  'black-minerals', 'peach-lemonade',
]);

export function validateCheckoutFulfillment(order) {
  const nestedType = text(order?.fulfillment?.type).toLowerCase();
  const outerType = text(order?.fulfillmentType).toLowerCase();
  const family = (value) => value.startsWith('pickup') || value === 'preorder' ? 'pickup' : value;
  if (nestedType && outerType && family(nestedType) !== family(outerType)) {
    return { valid: false, code: 'FULFILLMENT_CONFLICT',
      message: 'Your order has conflicting fulfillment details. Please restart checkout.' };
  }
  const value = nestedType || outerType;
  const allowed = new Set(['pickup', 'pickup_market', 'pickup_dunwoody', 'preorder', 'delivery', 'shipping']);
  if (!allowed.has(value)) return {
    valid: false, code: 'FULFILLMENT_SELECTION_REQUIRED',
    message: 'Choose market pickup, scheduled pickup, delivery, or shipping before payment.',
  };

  if (value === 'pickup' || value === 'pickup_market' || value === 'pickup_dunwoody' || value === 'preorder') {
    const pickup = order?.pickup || order?.fulfillment?.pickup || {};
    const location = text(pickup.locationId || order?.pickupLocation);
    const date = pickup.date || order?.pickupDate || order?.orderTiming?.requestedDate;
    const parsed = date instanceof Date ? date :
      typeof date === 'string' && /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(date)
        ? new Date(date) : null;
    if (!location || !parsed || Number.isNaN(parsed.getTime())) return {
      valid: false, code: 'PICKUP_DETAILS_REQUIRED',
      message: 'Select a pickup location and date before payment.',
    };
    return { valid: true };
  }

  if (value === 'delivery') {
    const address = order?.deliveryAddress || order?.fulfillment?.address;
    if (!text(address?.street) || !text(address?.city) || !text(address?.state) || !text(address?.zip)) {
      return { valid: false, code: 'DELIVERY_ADDRESS_REQUIRED',
        message: 'Enter your full delivery address before payment.' };
    }
    if (!text(order?.deliveryTimeSlot || order?.fulfillment?.window)) {
      return { valid: false, code: 'DELIVERY_WINDOW_REQUIRED',
        message: 'Choose a delivery window before payment.' };
    }
    return { valid: true };
  }

  const address = order?.shippingAddress || order?.fulfillment?.address;
  if (!text(address?.street) || !text(address?.city) || !text(address?.state) || !text(address?.zip) ||
      !text(order?.shippingMethod || order?.fulfillment?.methodId)) {
    return { valid: false, code: 'SHIPPING_DETAILS_REQUIRED',
      message: 'Choose a shipping method and provide the complete address before payment.' };
  }
  return { valid: true };
}

function identities(product) {
  return [product?.id, product?.productId, product?.curatedProductId, product?.slug, product?.name]
    .map(key).filter(Boolean);
}
function matchesApprovedLemonade(name) {
  if (SIX_LEMONADES.some((slug) => name === slug || name.startsWith(slug + '-'))) return true;
  return name.startsWith('passion-fruit-guava-pineapple-lemon');
}

/** A charge requires a reconstructable itemized order. Legacy paid-order
 * objects must never fall back to a generic 'Order Payment' line item. */
export function validateItemizedOrder(lines) {
  if (!Array.isArray(lines) || lines.length === 0) return {
    valid: false, code: 'ORDER_ITEMS_REQUIRED',
    message: 'Your order is missing item details. Please restart checkout.',
  };
  if (lines.some((item) => !text(item?.name) || !Number.isInteger(Number(item?.quantity)) ||
      Number(item.quantity) < 1)) return {
    valid: false, code: 'ORDER_ITEM_DETAILS_REQUIRED',
    message: 'Your order has incomplete item names or quantities. Please restart checkout.',
  };
  return { valid: true };
}

/** Fail closed for known retired/other lemonade and gel flavors, even when
 * a stale Square or legacy DB catalog still marks them available. The named
 * approved list governs the menu; it does NOT manufacture inventory. */
export function findUnapprovedCurrentMenuItem(lines) {
  if (!Array.isArray(lines)) return { name: 'Order items', code: 'ITEMS_REQUIRED' };
  for (const product of lines) {
    const ids = identities(product);
    // Strict current-menu admission; "specials" is NOT proof of approval.
    const approved = new Set([
      ...SIX_LEMONADES,
      'passion-guava-pineapple-lemonade',
      'passion-fruit-guava-pineapple-lemon',
      'passion-fruit-guava-pineapple-lemonade',
      'soursop-chai', 'soursop-chai-gel', 'soursop-chai-sea-moss-gel',
      'apg', 'always-pursue-gratitude', 'apg-always-pursue-gratitude',
      'herbal-vibe', 'herbal-vibes',
    ]);
    const isRetired = ids.some((id) => RETIRED_IDENTITIES.has(id));
    if (isRetired || !ids.some((id) => approved.has(id))) {
      return { name: text(product?.name) || 'Unavailable product', code: 'PRODUCT_NOT_ON_CURRENT_MENU' };
    }
  }
  return null;
}
