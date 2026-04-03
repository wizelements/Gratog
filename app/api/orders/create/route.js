import { NextResponse } from 'next/server';
import { orderTracking } from '@/lib/enhanced-order-tracking';
import { sendOrderConfirmationEmail } from '@/lib/resend-email';
import { sendOrderConfirmationSMS } from '@/lib/sms';
import { calculateDeliveryFee, calculateDistanceBasedDeliveryFee } from '@/lib/delivery-fees';
import { validateDeliveryFulfillment, validateShippingFulfillment } from '@/lib/validation/fulfillment';
import { validateCustomerData } from '@/lib/validation/customer';
import { validateCart } from '@/lib/validation/cart';
import { sanitizeObject } from '@/lib/validation/sanitize';
import { createLogger } from '@/lib/logger';
import { randomUUID, createHash } from 'crypto';
import { findOrCreateSquareCustomer, createCustomerNote } from '@/lib/square-customer';
import { RateLimit } from '@/lib/redis';
import { withIdempotency, getIdempotencyKeyFromHeaders } from '@/lib/idempotency';
import { checkFreeDeliveryRadiusFrom30331 } from '@/lib/delivery-radius';
import { getSquareClient } from '@/lib/square';
import { sanitizeMetadata } from '@/lib/square-api';
import { verifyRequestAuthentication } from '@/lib/rewards-security';
import { generateOrderAccessToken, verifyOrderAccessToken } from '@/lib/order-access-token';

const logger = createLogger('OrdersCreateAPI');
const ORDER_ACCESS_TOKEN_TTL_MS = 60 * 60 * 1000;

// Rate limiting configuration
const ORDER_RATE_LIMIT = 10; // Max orders per window
const ORDER_RATE_WINDOW = 300; // 5 minutes
const MAX_PREORDER_DAYS = 60;
const DEFAULT_SCHEDULE_TIME_BY_FULFILLMENT = Object.freeze({
  pickup: '09:00',
  pickup_serenbe: '09:00',
  pickup_market: '09:00',
  pickup_browns_mill: '09:00',
  meetup_serenbe: '09:00',
  delivery: '14:00',
  shipping: '12:00'
});

function isValidSquareCatalogId(id) {
  return typeof id === 'string' && id.length >= 20 && /^[A-Z0-9]+$/i.test(id);
}

function resolveCartVariationId(item = {}) {
  const candidates = [
    item.variationId,
    item.catalogObjectId,
    item.squareVariationId,
    item.productId,
    item.id,
  ];

  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) {
      continue;
    }

    const normalized = String(candidate).trim();
    if (normalized.length > 0) {
      return normalized;
    }
  }

  return null;
}

function normalizeQuantity(quantity) {
  const parsed = Number(quantity);
  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.trunc(parsed));
}

function normalizeClientPrice(price) {
  const parsed = Number(price);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 0;
  }

  return Math.round(parsed * 100) / 100;
}

function buildIdempotencyCartFingerprint(cartItems = []) {
  const quantityByVariation = new Map();
  const rawItems = Array.isArray(cartItems) ? cartItems : [];

  for (const item of rawItems) {
    const variationId = resolveCartVariationId(item);
    const quantity = normalizeQuantity(item?.quantity);
    if (!variationId || quantity <= 0) {
      continue;
    }

    quantityByVariation.set(variationId, (quantityByVariation.get(variationId) || 0) + quantity);
  }

  if (quantityByVariation.size > 0) {
    return Array.from(quantityByVariation.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([variationId, qty]) => ({ variationId, qty }));
  }

  return rawItems.map((item, index) => ({
    fallbackKey: String(item?.name || `item_${index}`).trim().toLowerCase(),
    qty: normalizeQuantity(item?.quantity)
  }));
}

function parseSquarePriceCents(catalogObject) {
  const variationData = catalogObject?.itemVariationData || catalogObject?.item_variation_data;
  const priceMoney = variationData?.priceMoney || variationData?.price_money;
  const amount = priceMoney?.amount;
  if (amount === undefined || amount === null) {
    return null;
  }

  const cents = Number(amount);
  if (!Number.isFinite(cents) || cents < 0) {
    return null;
  }

  return cents;
}

async function applyServerAuthoritativePricing(orderData, { allowFallback = false } = {}) {
  const rawCart = Array.isArray(orderData.cart) ? orderData.cart : [];
  const normalizedItems = rawCart.map((item, index) => ({
    index,
    item,
    variationId: resolveCartVariationId(item),
    quantity: normalizeQuantity(item?.quantity),
  }));

  const missingIdentifiers = normalizedItems.filter(line => !line.variationId);
  if (missingIdentifiers.length > 0) {
    return {
      valid: false,
      statusCode: 400,
      error: 'Cart items are missing product identifiers. Please refresh your cart and try again.'
    };
  }

  const invalidQuantities = normalizedItems.filter(line => line.quantity <= 0);
  if (invalidQuantities.length > 0) {
    return {
      valid: false,
      statusCode: 400,
      error: 'Cart contains invalid quantity values. Please refresh your cart and try again.'
    };
  }

  const uniqueVariationIds = Array.from(new Set(normalizedItems.map(line => line.variationId)));
  const squareVariationIds = uniqueVariationIds.filter(isValidSquareCatalogId);
  const nonSquareVariationIds = uniqueVariationIds.filter(id => !isValidSquareCatalogId(id));

  if (nonSquareVariationIds.length > 0 && !allowFallback) {
    return {
      valid: false,
      statusCode: 400,
      error: 'Unable to verify one or more cart items. Please refresh your cart and try again.'
    };
  }

  const authoritativePriceByVariation = new Map();

  if (squareVariationIds.length > 0) {
    try {
      const square = getSquareClient();
      const catalogResponse = await square.catalog.batchGet({
        objectIds: squareVariationIds,
        includeRelatedObjects: false,
      });

      const catalogObjects = Array.isArray(catalogResponse?.objects) ? catalogResponse.objects : [];
      for (const catalogObject of catalogObjects) {
        const priceCents = parseSquarePriceCents(catalogObject);
        if (priceCents === null) {
          continue;
        }

        const variationData = catalogObject?.itemVariationData || catalogObject?.item_variation_data;
        authoritativePriceByVariation.set(catalogObject.id, {
          priceCents,
          variationName: variationData?.name || null,
        });
      }
    } catch (error) {
      if (!allowFallback) {
        return {
          valid: false,
          statusCode: 503,
          error: 'Unable to verify live catalog pricing right now. Please try again in a moment.'
        };
      }

      logger.warn('Catalog repricing failed in fallback mode', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const unresolvedSquareIds = squareVariationIds.filter(id => !authoritativePriceByVariation.has(id));
  if (unresolvedSquareIds.length > 0 && !allowFallback) {
    return {
      valid: false,
      statusCode: 400,
      error: 'One or more items are no longer available at checkout pricing. Please refresh your cart.'
    };
  }

  let pricingOverrides = 0;
  const repricedCart = normalizedItems.map(({ item, variationId, quantity }) => {
    const authoritative = authoritativePriceByVariation.get(variationId);
    const unitPrice = authoritative
      ? authoritative.priceCents / 100
      : normalizeClientPrice(item?.price);

    const originalPrice = normalizeClientPrice(item?.price);
    if (authoritative && Math.abs(originalPrice - unitPrice) > 0.009) {
      pricingOverrides += 1;
    }

    return {
      ...item,
      id: item?.id || item?.productId || variationId,
      productId: item?.productId || item?.id || variationId,
      variationId,
      catalogObjectId: variationId,
      name: String(item?.name || authoritative?.variationName || 'Product').trim().slice(0, 120),
      quantity,
      price: unitPrice,
    };
  });

  const subtotal = repricedCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return {
    valid: true,
    cart: repricedCart,
    subtotal,
    source: authoritativePriceByVariation.size > 0 ? 'square_catalog' : 'fallback_client_price',
    pricingOverrides,
  };
}

function shouldAllowSquareFallback() {
  const configured = process.env.SQUARE_FALLBACK_MODE;
  if (configured === 'true') {
    return true;
  }
  if (configured === 'false') {
    return false;
  }

  // Keep production strict while allowing local incident probes without Square credentials.
  const runningOnVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
  return process.env.NODE_ENV !== 'production' && !runningOnVercel;
}

function isInternalPrincipal(auth) {
  return (
    auth?.authenticated && (
      auth.authType === 'master_key' ||
      auth.authType === 'admin_key' ||
      auth.userId === 'system' ||
      auth.userId === 'admin'
    )
  );
}

function canAccessOrder(auth, order) {
  if (!auth?.authenticated || !order) {
    return false;
  }

  if (isInternalPrincipal(auth)) {
    return true;
  }

  const orderEmail = String(order.customer?.email || order.customerEmail || '').trim().toLowerCase();
  const userEmail = String(auth.userEmail || '').trim().toLowerCase();
  return orderEmail.length > 0 && orderEmail === userEmail;
}

function sanitizeOrder(order) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    createdAt: order.createdAt,
    paidAt: order.paidAt || null,
    customer: {
      name: order.customer?.name,
      email: order.customer?.email,
      phone: order.customer?.phone,
    },
    items: order.items,
    pricing: order.pricing,
    fulfillment: order.fulfillment,
    fulfillmentType: order.fulfillmentType || order.fulfillment?.type || null,
    deliveryAddress: order.deliveryAddress || order.fulfillment?.deliveryAddress || null,
    orderTiming: order.orderTiming || order.fulfillment?.timing || null,
    payment: {
      status: order.payment?.status || order.paymentStatus || order.status,
      receiptUrl: order.receiptUrl || order.payment?.receiptUrl || null,
      cardBrand: order.cardBrand || order.payment?.cardBrand || null,
      cardLast4: order.cardLast4 || order.payment?.cardLast4 || null,
      receiptNumber: order.payment?.receiptNumber || null,
    },
  };
}

// FIX M12: Atlanta/Eastern timezone for pickup date calculations
const ATLANTA_TIMEZONE = 'America/New_York';

/**
 * Get the next Saturday pickup date in Atlanta timezone
 * 
 * FIX M12: Previously used naive Date which could give wrong day
 * when server timezone differs from customer timezone (Atlanta).
 * Now explicitly calculates based on Atlanta local time.
 */
function getNextSaturday(time = '09:00') {
  // Get current time in Atlanta
  const now = new Date();
  const atlantaFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: ATLANTA_TIMEZONE,
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
  
  // Parse Atlanta local time components
  const parts = atlantaFormatter.formatToParts(now);
  const getPart = (type) => parts.find(p => p.type === type)?.value;
  const atlantaDayOfWeek = getPart('weekday');
  
  // Map weekday name to number (Sunday=0, Saturday=6)
  const dayMap = { Sunday: 0, Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6 };
  const currentDayNum = dayMap[atlantaDayOfWeek] ?? now.getDay();
  
  // Calculate days until next Saturday
  let daysUntilSaturday = (6 - currentDayNum + 7) % 7;
  if (daysUntilSaturday === 0) {
    // If today is Saturday, check if pickup time has passed
    const currentHour = parseInt(getPart('hour') || '0');
    const currentMinute = parseInt(getPart('minute') || '0');
    const [targetHour, targetMinute] = time.split(':').map(Number);
    
    if (currentHour > targetHour || (currentHour === targetHour && currentMinute >= targetMinute)) {
      // Pickup time passed, use next Saturday
      daysUntilSaturday = 7;
    }
  }
  
  // Build the target date in Atlanta timezone
  const nextSat = new Date(now.getTime() + daysUntilSaturday * 24 * 60 * 60 * 1000);
  const satFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: ATLANTA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const satDateStr = satFormatter.format(nextSat); // YYYY-MM-DD in Atlanta tz

  // Convert Atlanta local date+time to correct UTC instant
  const iso = toTimeZoneISOString(satDateStr, time, ATLANTA_TIMEZONE);
  if (iso) return iso;

  // Fallback: approximate if toTimeZoneISOString fails
  nextSat.setHours(parseInt(time.split(':')[0]), parseInt(time.split(':')[1]), 0, 0);
  return nextSat.toISOString();
}

function isPickupFulfillmentType(fulfillmentType) {
  return fulfillmentType === 'pickup' ||
    fulfillmentType === 'pickup_serenbe' ||
    fulfillmentType === 'pickup_market' ||
    fulfillmentType === 'pickup_browns_mill' ||
    fulfillmentType === 'meetup_serenbe';
}

function getDefaultScheduleTime(fulfillmentType) {
  return DEFAULT_SCHEDULE_TIME_BY_FULFILLMENT[fulfillmentType] || '09:00';
}

function parseRequestedTimeWindow(windowText, fallbackTime) {
  const raw = typeof windowText === 'string' ? windowText.trim() : '';
  if (!raw) {
    return fallbackTime;
  }

  const match = raw.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!match) {
    return fallbackTime;
  }

  let hour = Number(match[1]);
  const minute = Number(match[2] || '0');
  const meridiem = match[3]?.toLowerCase();

  if (!Number.isFinite(hour) || !Number.isFinite(minute) || minute < 0 || minute > 59) {
    return fallbackTime;
  }

  if (meridiem === 'pm' && hour < 12) {
    hour += 12;
  }
  if (meridiem === 'am' && hour === 12) {
    hour = 0;
  }

  if (hour < 0 || hour > 23) {
    return fallbackTime;
  }

  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function getTimeZoneOffsetMinutes(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const getPart = (type) => Number(parts.find(part => part.type === type)?.value || '0');
  const asUTC = Date.UTC(
    getPart('year'),
    getPart('month') - 1,
    getPart('day'),
    getPart('hour'),
    getPart('minute'),
    getPart('second'),
  );

  return (asUTC - date.getTime()) / (60 * 1000);
}

function toTimeZoneISOString(dateInput, timeInput, timeZone = ATLANTA_TIMEZONE) {
  const dateMatch = String(dateInput || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateMatch) {
    return null;
  }

  const [hourPart = '09', minutePart = '00'] = String(timeInput || '09:00').split(':');
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(hourPart);
  const minute = Number(minutePart);

  if (![year, month, day, hour, minute].every(Number.isFinite)) {
    return null;
  }

  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);
  const offsetMinutes = getTimeZoneOffsetMinutes(new Date(utcGuess), timeZone);
  const correctedUtc = utcGuess - (offsetMinutes * 60 * 1000);

  return new Date(correctedUtc).toISOString();
}

function deriveAutoScheduledFulfillmentAt(fulfillmentType) {
  if (isPickupFulfillmentType(fulfillmentType)) {
    return getNextSaturday('09:00');
  }

  if (fulfillmentType === 'delivery') {
    return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  }

  if (fulfillmentType === 'shipping') {
    return new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
  }

  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

function buildFulfillmentSchedule({ fulfillmentType, timing }) {
  const nowIso = new Date().toISOString();
  const scheduledMode = timing?.mode === 'scheduled';
  const requestedDate = scheduledMode ? timing?.requestedDate || null : null;
  const requestedTimeWindow = scheduledMode ? timing?.requestedTimeWindow || null : null;
  const requestedNotes = scheduledMode ? timing?.notes || null : null;
  const defaultTime = getDefaultScheduleTime(fulfillmentType);
  const preferredTime = scheduledMode
    ? parseRequestedTimeWindow(requestedTimeWindow, defaultTime)
    : defaultTime;

  const scheduledFulfillmentAt = scheduledMode && requestedDate
    ? toTimeZoneISOString(requestedDate, preferredTime, ATLANTA_TIMEZONE) || deriveAutoScheduledFulfillmentAt(fulfillmentType)
    : deriveAutoScheduledFulfillmentAt(fulfillmentType);

  if (scheduledMode) {
    return {
      status: 'requested',
      requestedDate,
      requestedTimeWindow,
      requestedNotes,
      requestedAt: nowIso,
      scheduledFulfillmentAt,
      confirmedFulfillmentAt: null,
      confirmedTimeWindow: null,
      confirmedBy: null,
      confirmedAt: null,
    };
  }

  return {
    status: 'auto_assigned',
    requestedDate: null,
    requestedTimeWindow: null,
    requestedNotes: null,
    requestedAt: null,
    scheduledFulfillmentAt,
    confirmedFulfillmentAt: scheduledFulfillmentAt,
    confirmedTimeWindow: null,
    confirmedBy: 'system',
    confirmedAt: nowIso,
  };
}

function normalizeOrderTiming(input = {}) {
  const mode = input?.mode === 'scheduled' ? 'scheduled' : 'asap';
  return {
    mode,
    requestedDate: mode === 'scheduled' && input?.requestedDate ? String(input.requestedDate).trim() : null,
    requestedTimeWindow: mode === 'scheduled' && input?.requestedTimeWindow
      ? String(input.requestedTimeWindow).trim().slice(0, 80)
      : null,
    notes: mode === 'scheduled' && input?.notes
      ? String(input.notes).trim().slice(0, 200)
      : null,
  };
}

function resolveOrderTiming(orderData) {
  const timing = normalizeOrderTiming(orderData.orderTiming);
  if (timing.mode !== 'scheduled') {
    return { valid: true, timing, preOrderRequested: false };
  }

  if (!timing.requestedDate) {
    return { valid: false, error: 'Pre-order date is required when selecting scheduled fulfillment.' };
  }

  const selectedDate = new Date(`${timing.requestedDate}T00:00:00`);
  if (Number.isNaN(selectedDate.getTime())) {
    return { valid: false, error: 'Invalid pre-order date provided.' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (selectedDate < today) {
    return { valid: false, error: 'Pre-order date must be today or later.' };
  }

  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + MAX_PREORDER_DAYS);
  if (selectedDate > maxDate) {
    return { valid: false, error: `Pre-orders can be scheduled up to ${MAX_PREORDER_DAYS} days ahead.` };
  }

  return {
    valid: true,
    timing,
    preOrderRequested: true
  };
}

function buildFulfillment(orderData) {
  const {
    fulfillmentType,
    customer,
    deliveryAddress,
    shippingAddress,
    deliveryInstructions,
    pickup,
    orderTiming,
    fulfillmentSchedule
  } = orderData;

  const schedule = fulfillmentSchedule || {};
  const scheduledFulfillmentAt =
    schedule.scheduledFulfillmentAt ||
    orderData.scheduledFulfillmentAt ||
    deriveAutoScheduledFulfillmentAt(fulfillmentType);
  const requestedDate = schedule.requestedDate || orderTiming?.requestedDate || null;
  const requestedWindow = schedule.requestedTimeWindow || orderTiming?.requestedTimeWindow || null;
  const pendingScheduleNote = schedule.status === 'requested'
    ? ` • PRE-ORDER REQUEST${requestedDate ? ` (${requestedDate})` : ''}${requestedWindow ? ` • WINDOW REQUEST: ${requestedWindow}` : ''} • TIMELINE WILL BE CONFIRMED`
    : '';
  
  // Pickup orders (Serenbe or DHA Dunwoody)
  // NORMALIZED: pickup_market = Serenbe, pickup_browns_mill = DHA Dunwoody
  // Also handle legacy 'meetup_serenbe' type
  const isMeetup = fulfillmentType === 'meetup_serenbe';
  const isPickupOrder = isPickupFulfillmentType(fulfillmentType);
  if (isPickupOrder) {
    const isBrownsMill = fulfillmentType === 'pickup_browns_mill' || pickup?.locationId === 'browns_mill';
    const pickupDate = scheduledFulfillmentAt || getNextSaturday('09:00');

    let pickupNote;
    if (isMeetup) {
      const meetupNotes = orderData.meetUpDetails?.notes ? ` • NOTES: ${orderData.meetUpDetails.notes}` : '';
      pickupNote = `🤝 MEET UP AFTER MARKET: Serenbe area • Saturdays after 1:00 PM (by arrangement)${meetupNotes}${pendingScheduleNote}`;
    } else if (isBrownsMill) {
      pickupNote = `📍 PICKUP: DHA Dunwoody Farmers Market • Brook Run Park, 4770 N Peachtree Rd, Dunwoody, GA 30338 • Saturdays 9:00 AM - 12:00 PM • Show order number at pickup booth${pendingScheduleNote}`;
    } else {
      pickupNote = `📍 PICKUP: Serenbe Farmers Market (Booth #12) • 10950 Hutcheson Ferry Rd, Palmetto, GA 30268 • Saturdays 9:00 AM - 1:00 PM${pendingScheduleNote}`;
    }

    return [{
      type: 'PICKUP',
      state: 'PROPOSED',
      uid: 'pickup_1',
      pickup_details: {
        recipient: {
          display_name: customer.name,
          phone_number: customer.phone
        },
        note: pickupNote.slice(0, 500),
        schedule_type: 'SCHEDULED',
        pickup_at: pickupDate,
        prep_time_duration: 'P1D'
      }
    }];
  }
  
  // Delivery orders (local delivery)
  if (fulfillmentType === 'delivery') {
    const expectedDeliveryDate = scheduledFulfillmentAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    return [{
      type: 'SHIPMENT',
      state: 'PROPOSED',
      uid: 'delivery_1',
      shipment_details: {
        recipient: {
          display_name: customer.name,
          phone_number: customer.phone,
          address: {
            address_line_1: deliveryAddress?.street || '',
            locality: deliveryAddress?.city || '',
            administrative_district_level_1: deliveryAddress?.state || 'GA',
            postal_code: deliveryAddress?.zip || '',
            country: 'US'
          }
        },
        shipping_note: `🚚 LOCAL DELIVERY${deliveryInstructions ? ' - ' + deliveryInstructions : ''}${pendingScheduleNote}`,
        expected_shipped_at: expectedDeliveryDate
      }
    }];
  }
  
  // Shipping orders (nationwide shipping)
  if (fulfillmentType === 'shipping') {
    const addr = shippingAddress || deliveryAddress;
    const expectedShipDate = scheduledFulfillmentAt || new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const shippingNote = schedule.status === 'requested'
      ? `📦 USPS PRIORITY SHIPPING${pendingScheduleNote}`
      : '📦 USPS PRIORITY SHIPPING';
    return [{
      type: 'SHIPMENT',
      state: 'PROPOSED',
      uid: 'shipping_1',
      shipment_details: {
        recipient: {
          display_name: customer.name,
          phone_number: customer.phone,
          address: {
            address_line_1: addr?.street || '',
            locality: addr?.city || '',
            administrative_district_level_1: addr?.state || '',
            postal_code: addr?.zip || '',
            country: 'US'
          }
        },
        shipping_note: shippingNote,
        expected_shipped_at: expectedShipDate
      }
    }];
  }
  
  return undefined;
}

export async function POST(request) {
  const startTime = Date.now();
  
  try {
    let orderData = await request.json();
    
    // SECURITY: Sanitize all input data to prevent XSS/SQL injection
    orderData = sanitizeObject(orderData, { preventSQL: true });
    
    logger.info('Order creation request received', { 
      fulfillmentType: orderData.fulfillmentType,
      cartItemsCount: orderData.cart?.length,
      customerEmail: orderData.customer?.email 
    });
    
    // RATE LIMITING: Prevent order creation abuse
    const clientIp = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const rateLimitKey = `order_create:${clientIp}`;
    
    if (!RateLimit.check(rateLimitKey, ORDER_RATE_LIMIT, ORDER_RATE_WINDOW)) {
      logger.warn('Order creation rate limit exceeded', { ip: clientIp });
      return NextResponse.json(
        { 
          success: false, 
          error: 'Too many order attempts. Please wait a few minutes and try again.',
          code: 'RATE_LIMIT_EXCEEDED'
        },
        { status: 429 }
      );
    }
    
    const ALLOW_FALLBACK = shouldAllowSquareFallback();
    
    // IDEMPOTENCY: Generate key from order data to prevent duplicate orders
    // Check for client-provided idempotency key first
    let idempotencyKey = getIdempotencyKeyFromHeaders(request.headers);
    
    if (!idempotencyKey && orderData.customer?.email) {
      // Generate key from order content for deduplication
      const orderHash = createHash('sha256')
        .update(JSON.stringify({
          email: orderData.customer.email,
          cart: buildIdempotencyCartFingerprint(orderData.cart),
          fulfillmentType: orderData.fulfillmentType,
          // Include timestamp bucket (5-minute window) to allow genuine re-orders
          timeBucket: Math.floor(Date.now() / (5 * 60 * 1000))
        }))
        .digest('hex')
        .substring(0, 32);
      
      idempotencyKey = `order_${orderHash}`;
    }
    
    // If we have an idempotency key, wrap the order creation
    if (idempotencyKey) {
      const cachedResult = await import('@/lib/idempotency').then(m => 
        m.getIdempotentResponse(idempotencyKey)
      );
      
      if (cachedResult) {
        logger.info('Returning cached order (idempotency hit)', { 
          idempotencyKey,
          orderId: cachedResult.order?.id 
        });
        return NextResponse.json({
          ...cachedResult,
          _cached: true
        });
      }
    }
    
    // VALIDATION 1: Validate cart data
    const cartValidation = validateCart(orderData.cart);
    if (!cartValidation.valid) {
      logger.warn('Cart validation failed', { error: cartValidation.error });
      return NextResponse.json(
        { success: false, error: cartValidation.error },
        { status: 400 }
      );
    }
    
    // VALIDATION 2: Validate customer data (email, phone, name)
    const customerValidation = validateCustomerData(orderData.customer);
    if (!customerValidation.valid) {
      logger.warn('Customer validation failed', { error: customerValidation.error });
      return NextResponse.json(
        { success: false, error: customerValidation.error },
        { status: 400 }
      );
    }
    
    if (!orderData.fulfillmentType) {
      return NextResponse.json(
        { success: false, error: 'Fulfillment type is required' },
        { status: 400 }
      );
    }

    const SUPPORTED_FULFILLMENT_TYPES = [
      'pickup', 'pickup_serenbe', 'pickup_market', 'pickup_browns_mill',
      'meetup_serenbe', 'delivery', 'shipping'
    ];
    if (!SUPPORTED_FULFILLMENT_TYPES.includes(orderData.fulfillmentType)) {
      return NextResponse.json(
        { success: false, error: `Unsupported fulfillment type: ${orderData.fulfillmentType}` },
        { status: 400 }
      );
    }

    const timingResolution = resolveOrderTiming(orderData);
    if (!timingResolution.valid) {
      return NextResponse.json(
        { success: false, error: timingResolution.error },
        { status: 400 }
      );
    }
    orderData.orderTiming = timingResolution.timing;
    orderData.preOrderRequested = timingResolution.preOrderRequested;
    
    const pricingResolution = await applyServerAuthoritativePricing(orderData, {
      allowFallback: ALLOW_FALLBACK,
    });
    if (!pricingResolution.valid) {
      return NextResponse.json(
        { success: false, error: pricingResolution.error },
        { status: pricingResolution.statusCode || 400 }
      );
    }

    orderData.cart = pricingResolution.cart;
    orderData.pricingSource = pricingResolution.source;
    orderData.pricingOverrides = pricingResolution.pricingOverrides;

    orderData.fulfillmentSchedule = buildFulfillmentSchedule({
      fulfillmentType: orderData.fulfillmentType,
      timing: orderData.orderTiming,
    });
    orderData.scheduledFulfillmentAt = orderData.fulfillmentSchedule.scheduledFulfillmentAt;
    
    // Validate delivery fulfillment
    if (orderData.fulfillmentType === 'delivery') {
      if (!orderData.deliveryAddress?.street || !orderData.deliveryAddress?.city || !orderData.deliveryAddress?.zip) {
        return NextResponse.json(
          { success: false, error: 'Complete delivery address is required' },
          { status: 400 }
        );
      }
      
      // Validate delivery fulfillment (ZIP code, minimum order, etc.)
      const subtotal = orderData.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const deliveryValidation = validateDeliveryFulfillment({
        zip: orderData.deliveryAddress.zip,
        window: 'anytime', // Bypass strict window validation for MVP
        subtotal: subtotal,
        tip: orderData.deliveryTip || 0,
        street: orderData.deliveryAddress.street,
        city: orderData.deliveryAddress.city,
        state: orderData.deliveryAddress.state || 'GA'
      });
      
      if (!deliveryValidation.valid) {
        const errorMessage = deliveryValidation.errors.map(e => e.message).join(', ');
        logger.warn('Delivery validation failed', { errors: deliveryValidation.errors });
        return NextResponse.json(
          { success: false, error: errorMessage },
          { status: 400 }
        );
      }
    }
    
    // Validate shipping fulfillment
    if (orderData.fulfillmentType === 'shipping') {
      const addr = orderData.shippingAddress || orderData.deliveryAddress;
      if (!addr?.street || !addr?.city || !addr?.state || !addr?.zip) {
        return NextResponse.json(
          { success: false, error: 'Complete shipping address is required' },
          { status: 400 }
        );
      }
      
      const shippingValidation = validateShippingFulfillment({
        street: addr.street,
        city: addr.city,
        state: addr.state,
        zip: addr.zip
      });
      
      if (!shippingValidation.valid) {
        const errorMessage = shippingValidation.errors.map(e => e.message).join(', ');
        logger.warn('Shipping validation failed', { errors: shippingValidation.errors });
        return NextResponse.json(
          { success: false, error: errorMessage },
          { status: 400 }
        );
      }
    }
    
    // Calculate delivery fee if applicable
    let deliveryFee = 0;
    let deliveryDistanceMiles = null;
    let freeDeliveryEligible30331 = false;
    if (orderData.fulfillmentType === 'delivery') {
      const subtotal = orderData.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const fullAddress = [
        orderData.deliveryAddress?.street,
        orderData.deliveryAddress?.city,
        `${orderData.deliveryAddress?.state || 'GA'} ${orderData.deliveryAddress?.zip || ''}`.trim(),
      ].filter(Boolean).join(', ');

      if (fullAddress) {
        const radiusCheck = await checkFreeDeliveryRadiusFrom30331(fullAddress);
        freeDeliveryEligible30331 = Boolean(radiusCheck.eligible);
        if (typeof radiusCheck.distance === 'number') {
          deliveryDistanceMiles = radiusCheck.distance;
        }
      }

      if (freeDeliveryEligible30331) {
        deliveryFee = 0;
      } else if (typeof deliveryDistanceMiles === 'number') {
        deliveryFee = calculateDistanceBasedDeliveryFee(deliveryDistanceMiles, subtotal);
      } else {
        deliveryFee = calculateDeliveryFee(subtotal);
      }

      logger.debug('Delivery fee calculated', {
        subtotal,
        deliveryFee,
        deliveryDistanceMiles,
        freeDeliveryEligible30331,
      });
    }
    
    // Generate order ID and number
    const orderId = randomUUID();
    const orderNumber = `TOG${Date.now().toString().slice(-6)}`;
    
    logger.info('Generated order identifiers', { orderId, orderNumber });
    
    // Calculate pickup date for pickup orders (for cron job filtering)
    let pickupDate = null;
    const originalFulfillmentType = orderData.fulfillmentType;
    const isPickup = isPickupFulfillmentType(orderData.fulfillmentType);
    if (isPickup) {
      const isBrownsMill = orderData.fulfillmentType === 'pickup_browns_mill' || 
                           orderData.pickup?.locationId === 'browns_mill';
      const scheduleStatus = orderData.fulfillmentSchedule?.status;
      pickupDate = scheduleStatus === 'requested'
        ? null
        : (orderData.scheduledFulfillmentAt || getNextSaturday('09:00'));

      // Normalize fulfillment type for consistency
      orderData.fulfillmentType = isBrownsMill ? 'pickup_browns_mill' : 'pickup_market';
    }
    
    // Add metadata
    const enhancedOrderData = {
      ...orderData,
      id: orderId,
      orderNumber,
      deliveryFee,
      scheduledFulfillmentAt: orderData.scheduledFulfillmentAt,
      fulfillmentSchedule: orderData.fulfillmentSchedule,
      pickupDate, // Store pickup date for cron jobs
      metadata: {
        ...orderData.metadata,
        ip: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date().toISOString(),
        deliveryFee,
        deliveryDistanceMiles,
        freeDeliveryEligible30331,
        orderTiming: orderData.orderTiming,
        preOrderRequested: orderData.preOrderRequested,
        pricingSource: orderData.pricingSource || 'unknown',
        pricingOverrides: orderData.pricingOverrides || 0,
        fulfillmentSchedule: orderData.fulfillmentSchedule,
        originalFulfillmentType,
      }
    };
    
    // CRITICAL: Create Square Customer FIRST, then Order
    let squareOrderId = null;
    let squareCustomerId = null;

    const SQUARE_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
    const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID;
    const SQUARE_ENV = process.env.SQUARE_ENVIRONMENT || 'sandbox';
    const SQUARE_BASE = SQUARE_ENV === 'production' 
      ? 'https://connect.squareup.com' 
      : 'https://connect.squareupsandbox.com';
    
    if (!SQUARE_TOKEN || !SQUARE_LOCATION_ID) {
      if (!ALLOW_FALLBACK) {
        return NextResponse.json({
          success: false,
          error: 'Square payment system is not configured. Please contact support.',
          code: 'SQUARE_NOT_CONFIGURED'
        }, { status: 503 });
      }
      logger.warn('Square not configured - using fallback mode');
      squareOrderId = `fallback_${orderId}`;
    } else {
      try {
        // STEP 1: Find or create Square Customer
        logger.info('Creating/finding Square customer', { email: orderData.customer.email });
        
        const customerResult = await findOrCreateSquareCustomer({
          email: orderData.customer.email,
          name: orderData.customer.name,
          phone: orderData.customer.phone,
          address: orderData.fulfillmentType === 'delivery' ? {
            street: orderData.deliveryAddress?.street,
            city: orderData.deliveryAddress?.city,
            state: orderData.deliveryAddress?.state || 'GA',
            zip: orderData.deliveryAddress?.zip
          } : undefined,
          note: createCustomerNote({
            orderNumber,
            fulfillmentType: orderData.fulfillmentType,
            source: 'website'
          }),
          referenceId: `web_${orderId}`
        });
        
        if (customerResult.success && customerResult.customer) {
          squareCustomerId = customerResult.customer.id;
          logger.info('✅ Square customer ready', { customerId: squareCustomerId });
        } else {
          logger.warn('Square customer creation failed, continuing without customer link', { 
            error: customerResult.error 
          });
        }
        
        // STEP 2: Create Square Order with customer link
        logger.info('Creating Square Order', { orderId, customerId: squareCustomerId });
        
        const orderPayload = {
          idempotency_key: `order_${orderId}_${Date.now()}`,
          order: {
            location_id: SQUARE_LOCATION_ID,
            reference_id: orderNumber, // ⭐ THIS MAKES ORDER NUMBERS MATCH
            line_items: orderData.cart.map(item => {
              // Find the best catalog ID candidate
              const catalogId = item.catalogObjectId || item.variationId || item.squareVariationId;
              
              // Build line item - only include catalog_object_id if it's valid
              const lineItem = {
                quantity: String(item.quantity),
                base_price_money: {
                  amount: Math.round((item.price || 0) * 100),
                  currency: 'USD'
                },
                note: item.name || '' // Product name visible in Square
              };
              
              // CRITICAL FIX: Only add catalog_object_id if it's a valid Square ID
              // Otherwise, Square API will reject with "catalog object not found"
              if (isValidSquareCatalogId(catalogId)) {
                lineItem.catalog_object_id = catalogId;
              } else {
                // Ad-hoc item - must have name for Square to accept it
                lineItem.name = item.name || 'Product';
                logger.debug('Using ad-hoc line item (no valid catalog ID)', { 
                  itemName: item.name, 
                  providedId: catalogId 
                });
              }
              
              return lineItem;
            }),
            customer_id: squareCustomerId || undefined, // ⭐ LINKS CUSTOMER TO ORDER
            metadata: sanitizeMetadata({
              source: 'website',
              local_order_id: orderId,
              order_number: orderNumber,
              fulfillment_type: orderData.fulfillmentType,
              customer_email: orderData.customer.email,
              customer_name: orderData.customer.name,
              customer_phone: orderData.customer.phone,
              fulfillment_timing: orderData.orderTiming?.mode || 'asap',
              requested_date: orderData.orderTiming?.requestedDate || undefined,
              requested_time_window: orderData.orderTiming?.requestedTimeWindow || undefined,
              schedule_status: orderData.fulfillmentSchedule?.status || 'auto_assigned',
              scheduled_fulfillment_at: orderData.fulfillmentSchedule?.scheduledFulfillmentAt || undefined,
              pricing_source: orderData.pricingSource || 'unknown'
            }),
            fulfillments: buildFulfillment(orderData)
          }
        };
        
        // ISS-029 FIX: Standardized Square API version across all modules
        const SQUARE_VERSION = '2025-10-16';
        
        const orderResponse = await fetch(`${SQUARE_BASE}/v2/orders`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SQUARE_TOKEN}`,
            'Content-Type': 'application/json',
            'Square-Version': SQUARE_VERSION
          },
          body: JSON.stringify(orderPayload)
        });
        
        const orderResponseData = await orderResponse.json();
        
        if (!orderResponse.ok) {
          const errorDetail = orderResponseData.errors?.[0]?.detail || 'Square API error';
          logger.error('Square Order creation failed', { 
            status: orderResponse.status,
            error: errorDetail,
            errors: orderResponseData.errors
          });
          
          if (!ALLOW_FALLBACK) {
            throw new Error(errorDetail);
          }
          
          logger.warn('Square failed but fallback enabled');
          squareOrderId = `fallback_${orderId}`;
        } else {
          squareOrderId = orderResponseData.order.id;
          logger.info('✅ Square Order created', { 
            squareOrderId,
            referenceId: orderNumber,
            customerId: squareCustomerId 
          });
        }
      } catch (squareError) {
        logger.error('Square integration error', { error: squareError.message });
        
        if (!ALLOW_FALLBACK) {
          return NextResponse.json({
            success: false,
            error: 'Unable to process order. Please try again.',
            details: squareError.message,
            code: 'SQUARE_ERROR'
          }, { status: 500 });
        }
        
        logger.warn('Continuing with fallback mode');
        squareOrderId = `fallback_${orderId}`;
      }
    }
    
    // Create local order (NO payment link generation - in-app payment only)
    // IMPORTANT: Order is created with status: 'pending' and paymentStatus: 'pending'
    // After payment succeeds, the payment API updates these statuses
    // See PAYMENT_FORM_AND_ORDER_FLOW_CRITICAL_ANALYSIS.md for details
    enhancedOrderData.metadata.squareOrderId = squareOrderId;
    
    const result = await orderTracking.createOrder(enhancedOrderData, true);
    
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error || 'Failed to create order' },
        { status: 500 }
      );
    }
    
    const order = result.order;
    
    logger.info('✅ Order created (payment pending)', { 
      orderId: order.id, 
      orderNumber: order.orderNumber,
      squareOrderId,
      paymentStatus: order.paymentStatus || 'pending'
    });

    const orderAccessToken = generateOrderAccessToken({
      orderId: order.id,
      customerEmail: order.customer?.email || order.customerEmail || null,
      ttlMs: ORDER_ACCESS_TOKEN_TTL_MS,
    });
    
    // IMPORTANT: Do NOT send confirmations until payment is verified
    // Confirmations are sent by the payment API after successful payment
    // (See /app/api/payments/route.ts)
    
    const successResponse = {
      success: true,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        paymentStatus: order.paymentStatus || 'pending',
        customer: order.customer,
        items: order.items,
        pricing: order.pricing,
        fulfillment: order.fulfillment,
        squareOrderId,
        squareCustomerId,
        orderAccessToken,
        orderAccessTokenExpiresAt: orderAccessToken
          ? new Date(Date.now() + ORDER_ACCESS_TOKEN_TTL_MS).toISOString()
          : null,
        note: '⚠️ Order created but payment is still pending. Confirmations will be sent after payment.'
      }
    };
    
    // Cache successful response for idempotency
    if (idempotencyKey) {
      const { setIdempotentResponse } = await import('@/lib/idempotency');
      await setIdempotentResponse(idempotencyKey, successResponse, 300); // 5 minute TTL
    }
    
    return NextResponse.json(successResponse);
    
  } catch (error) {
    logger.error('Order creation error', { 
      error: error.message,
      stack: error.stack 
    });
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create order. Please try again.',
      details: error.message
    }, { status: 500 });
  }
}

// GET endpoint to retrieve order
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('id');
    const orderAccessToken = searchParams.get('token');
    
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'Order ID is required' },
        { status: 400 }
      );
    }

    const auth = await verifyRequestAuthentication(request, { allowPublic: true });
    
    const trackingResult = await orderTracking.getOrder(orderId);
    
    // FIX: orderTracking.getOrder returns { success, order } wrapper
    // Unwrap it to prevent double-nesting in response
    if (!trackingResult) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }
    
    // Handle both wrapped and unwrapped responses from orderTracking
    const order = trackingResult.order || trackingResult;
    const isFallback = trackingResult.isFallback || order.isFallback || false;
    
    if (!order || !order.id) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const resolvedOrderId = order.id || order.orderId || orderId;
    const tokenClaims = verifyOrderAccessToken(orderAccessToken, {
      expectedOrderId: resolvedOrderId,
      expectedEmail: order.customer?.email || order.customerEmail || null,
    });

    if (!tokenClaims && !canAccessOrder(auth, order)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        {
          status: 401,
          headers: {
            'Cache-Control': 'no-store',
          },
        }
      );
    }
    
    return NextResponse.json(
      {
        success: true,
        order: sanitizeOrder(order),
        isFallback
      },
      {
        headers: {
          'Cache-Control': 'no-store'
        }
      }
    );
    
  } catch (error) {
    logger.error('Order retrieval error', { error: error.message });
    
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve order'
    }, { status: 500 });
  }
}
