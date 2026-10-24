export const dynamic = 'force-dynamic';

/**
 * Preorder API route
 * POST /api/preorder  — Create preorder (persisted to MongoDB marketorders)
 * GET  /api/preorder?orderNumber=PRE-xxx — Look up real preorder (404 if missing)
 */

import { NextResponse } from 'next/server';
import { generatePreorderNumber } from '@/lib/preorder/waitlist';
import { findPreorderByOrderNumber, updatePreorderPaymentFields } from '@/lib/preorder/repository';
import { PREORDER_RULES } from '@/lib/preorder/rules';
import { resolveActivePreorderMarket } from '@/lib/preorder/market-resolver';
import { nextPreorderPickup, marketDisplayHours, marketWaitlistPrefix } from '@/lib/preorder/market-schedule';
import { notifySquareTeam } from '@/lib/preorder/square-notifications';
import { createLogger } from '@/lib/logger';
import { sanitizeObject } from '@/lib/validation/sanitize';
import { validateCustomerData } from '@/lib/validation/customer';
import { validatePreorderMinimum } from '@/lib/cart-engine';
import { getStorefrontCatalogSnapshot } from '@/lib/storefront-products';
import { isMarketPreorderPermitted } from '@/lib/preorder/eligibility';
import { createPaymentLink } from '@/lib/square-api';
import { approvedUnitPriceCents, isApprovedBlueLotus } from '@/lib/merchant-pricing';
import { connectToDatabase } from '@/lib/db-optimized';
import {
  createCapacityBoundPreorder, expandCapacityDemand, fingerprintPreorder,
  loadApprovedBundleRecipes, pickupDateKey, releaseCapacityAfterDefinitiveLinkFailure,
  CapacityError, PREORDER_SLOT_SKU,
} from '@/lib/preorder/capacity';

const logger = createLogger('PreorderAPI');

function normalizeLookupKey(value: any) {
  return String(value || '').trim().toLowerCase();
}

function isUnavailableForPreorder(product: any) {
  return !isMarketPreorderPermitted(product);
}

function addLookupEntry(lookup: Map<string, any>, key: any, entry: any) {
  const normalized = normalizeLookupKey(key);
  if (normalized && !lookup.has(normalized)) {
    lookup.set(normalized, entry);
  }
}

function buildCatalogLookup(products: any[]) {
  const lookup = new Map<string, any>();

  products.forEach((product) => {
    if (isUnavailableForPreorder(product)) return;

    const variations = Array.isArray(product.variations) ? product.variations : [];
    const defaultVariation = variations[0] || null;
    const productEntry = { product, variation: defaultVariation };

    [
      product.id,
      product.productId,
      product.slug,
      product.name,
      product.curatedProductId,
      product.variationId,
      product.catalogObjectId,
      product.squareVariationId,
      product.squareData?.variationId,
    ].forEach((key) => addLookupEntry(lookup, key, productEntry));

    variations.forEach((variation: any) => {
      const variationEntry = { product, variation };
      [variation.id, variation.variationId, variation.catalogObjectId, variation.sku, `${product.id}:${variation.id}`]
        .forEach((key) => addLookupEntry(lookup, key, variationEntry));
    });
  });

  return lookup;
}

function getPreorderMetadata(data: any) {
  const metadata = data?.metadata && typeof data.metadata === 'object' ? data.metadata : {};
  return {
    ...metadata,
    source: metadata.source || data?.source || 'preorder_page',
    utmSource: metadata.utmSource || data?.utmSource || null,
    utmCampaign: metadata.utmCampaign || data?.utmCampaign || null,
    capturedAt: new Date().toISOString(),
  };
}

function isSquarePaymentConfigured() {
  return Boolean(process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_LOCATION_ID);
}

function getAppBaseUrl(_request: any) {
  // Redirect URLs must never derive from user-controlled Host / request origin.
  const value = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_BASE_URL || 'https://tasteofgratitude.shop';
  const parsed = new URL(value);
  if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password ||
      (process.env.VERCEL_ENV === 'production' &&
       (parsed.protocol !== 'https:' || !['tasteofgratitude.shop', 'www.tasteofgratitude.shop'].includes(parsed.hostname)))) {
    throw new Error('INVALID_CANONICAL_PREORDER_ORIGIN');
  }
  return parsed.origin;
}

async function resolvePreorderCartItems(submittedItems: any[]) {
  const snapshot = await getStorefrontCatalogSnapshot({});
  const lookup = buildCatalogLookup(snapshot.products || []);

  return submittedItems.map((item: any) => {
    const lookupKey = [
      item.variationId,
      item.catalogObjectId,
      item.productId,
      item.id,
      item.slug,
      item.name,
    ].map(normalizeLookupKey).find((key) => lookup.has(key));

    if (!lookupKey) {
      throw new Error(`${item.name || item.id || 'An item'} is no longer available for preorder.`);
    }

    const { product, variation } = lookup.get(lookupKey);
    // Price authority must match what the storefront displays. For the default
    // variation, the public product price is canonical; additional variants
    // retain their own explicit (server-trusted) prices.
    const defaultVariation = Array.isArray(product.variations) ? product.variations[0] : null;
    const isDefaultVariation = !variation || !defaultVariation || variation.id === defaultVariation.id;
    const listedPrice = Number(product.price);
    const variantPrice = Number(variation?.price);
    const price = isDefaultVariation && Number.isFinite(listedPrice) && listedPrice > 0
      ? listedPrice
      : Number.isFinite(variantPrice) && variantPrice > 0
        ? variantPrice
        : listedPrice;
    const approved = approvedUnitPriceCents(product);
    const sampleGel = !isApprovedBlueLotus(product) &&
      (/gel$/i.test(String(product.name || '').trim()) ||
       /(?:^|[- ])floral[- ]tide(?:$|[- ])/i.test(String(product.slug || product.name || '')) ||
       /\bgels?\b/i.test(String(product.category || ''))) &&
      /^2\s*oz(?:\b|$)/i.test(String(variation?.name || '').trim());
    if (approved !== null && variation?.name && !sampleGel &&
        !/^(16\s*oz|regular|standard|market item)(?:\b|$)/i.test(String(variation.name).trim())) {
      throw new Error(`${product.name}: selected size has not been approved for sale.`);
    }
    if (isApprovedBlueLotus(product) &&
        (!variation || !/^16\s*oz(?:\b|$)/i.test(String(variation.name || '').trim()))) {
      throw new Error('Blue Lotus is available only as a 16 oz jar.');
    }
    // A 2oz gel sample may be the first/default variation. In that case
    // product.price is the 16oz jar price and MUST NOT be used for samples.
    if (sampleGel && !(Number.isFinite(variantPrice) && variantPrice > 0)) {
      throw new Error(`${product.name}: the sample size has no verified price.`);
    }
    const authorizedPrice = sampleGel ? variantPrice : approved === null ? price : approved / 100;
    const priceCents = Math.round(authorizedPrice * 100);
    // Never silently inflate 0/negative quantities or truncate attempted
    // bulk orders. Invalid quantities receive a validation error.
    const quantity = Number(item.quantity);
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 99) {
      throw new Error(`${product.name}: enter a whole quantity between 1 and 99.`);
    }

    if (!Number.isFinite(price) || price <= 0) {
      throw new Error(`${product.name} is missing a valid preorder price.`);
    }

    return {
      id: product.id || product.slug || lookupKey,
      productId: product.id || product.slug || lookupKey,
      slug: product.slug || product.id,
      variationId: variation?.id || product.variationId || product.catalogObjectId || product.id,
      catalogObjectId: product.catalogObjectId || product.variationId || variation?.id || product.id,
      price: authorizedPrice,
      priceCents,
      quantity,
      isPreorder: true,
      isBundle: Boolean(product.isBundle === true || product.productType === 'bundle' || product.category === 'bundles'),
      category: product.category || product.intelligentCategory || '',
      name: product.name,
      size: variation?.name || product.size || item.size || null,
      imageUrl: product.image || product.displayImage || product.images?.[0] || null,
    };
  });
}

export async function POST(request: any) {
  try {
    let data = await request.json();

    // Sanitize input
    data = sanitizeObject(data, { preventSQL: true });

    logger.info('Preorder request received', {
      marketId: data.marketId,
      itemCount: data.items?.length,
    });

    // Validate against the same live market feed used by the customer screen.
    // Older route rules used slugs while the live API emits MongoDB ObjectIds.
    const selectedMarket = await resolveActivePreorderMarket(data.marketId);
    if (!selectedMarket) {
      return NextResponse.json(
        { success: false, code: 'MARKET_UNAVAILABLE', error: 'This pickup market is not accepting preorders. Please choose an active market.' },
        { status: 400 }
      );
    }
    const pickupDate = nextPreorderPickup(selectedMarket);
    if (!pickupDate) {
      return NextResponse.json(
        { success: false, code: 'PICKUP_UNAVAILABLE', error: 'No upcoming preorder pickup date is available for this market.' },
        { status: 409 }
      );
    }
    const marketConfig = {
      id: selectedMarket.id,
      name: selectedMarket.name,
      prefix: marketWaitlistPrefix(selectedMarket.name),
      day: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][selectedMarket.dayOfWeek],
      hours: marketDisplayHours(selectedMarket.hours),
    };

    if (data.fulfillment?.type && data.fulfillment.type !== 'pickup') {
      return NextResponse.json(
        { success: false, code: 'DELIVERY_NOT_SUPPORTED', error: 'Market preorders are pickup-only. For delivery, please use the regular shop checkout.' },
        { status: 400 }
      );
    }

    if (!data.items || !Array.isArray(data.items) || data.items.length === 0 || data.items.length > 30) {
      return NextResponse.json(
        { success: false, error: 'Your preorder is empty' },
        { status: 400 }
      );
    }

    // Validate customer
    const customerValidation = validateCustomerData(data.customer);
    if (!customerValidation.valid) {
      return NextResponse.json(
        { success: false, error: customerValidation.error },
        { status: 400 }
      );
    }

    let preorderCartItems;
    try {
      preorderCartItems = await resolvePreorderCartItems(data.items);
    } catch (error: any) {
      return NextResponse.json(
        { success: false, code: 'ITEM_UNAVAILABLE', error: String(error?.message || 'An item is unavailable. Please refresh the menu and try again.') },
        { status: 409 }
      );
    }

    // Calculate totals
    const subtotal = preorderCartItems.reduce((sum: number, item: any) => {
      return sum + ((item.price || 0) * (item.quantity || 1));
    }, 0);

    // Preorder rules: $60 minimum
    const preorderValidation = validatePreorderMinimum(preorderCartItems as any);
    if (!preorderValidation.valid) {
      return NextResponse.json(
        {
          success: false,
          error: preorderValidation.error,
          code: preorderValidation.code,
          minimum: preorderValidation.minimumRequired,
          current: preorderValidation.preorderSubtotal,
        },
        { status: 400 }
      );
    }

    // Public checkout always requires Square. Never trust a client-supplied
    // paymentMode override to create a payable-at-pickup order without payment.
    const payAtPickupFallback = false;
    if (!payAtPickupFallback && !isSquarePaymentConfigured()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Online preorder payment is not configured. Please contact Taste of Gratitude to order manually.',
          code: 'PAYMENT_CONFIGURATION_MISSING',
        },
        { status: 503 }
      );
    }

    // Derived from the live market schedule, including alternating Fridays.
    const pickupDateStr = pickupDate.toLocaleDateString('en-US', {
      timeZone: 'America/New_York',
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });

    // The checkout ID is stable across browser retries and is protected by a
    // unique DB index. Queue number, persisted order and all physical stock
    // components are reserved atomically in one MongoDB transaction.
    const checkoutRequestId = String(data.checkoutRequestId || '').trim();
    if (!/^[a-zA-Z0-9][a-zA-Z0-9:_-]{15,127}$/.test(checkoutRequestId)) {
      return NextResponse.json({ success: false, code: 'CHECKOUT_REQUEST_ID_REQUIRED',
        error: 'Refresh checkout to start a secure preorder attempt.' }, { status: 400 });
    }
    const { db, client } = await connectToDatabase();
    const dateKey = pickupDateKey(pickupDate);
    const demandItems = preorderCartItems.map((item: any) => ({
      sku: String(item.variationId || item.productId), quantity: item.quantity,
      isBundle: item.isBundle === true,
    }));
    const recipes = await loadApprovedBundleRecipes(db, demandItems);
    // Approved recipe also identifies a bundle when the catalog flag is absent.
    const verifiedDemandItems = demandItems.map((item: any) =>
      ({ ...item, isBundle: item.isBundle || recipes.has(item.sku) }));
    // Operational throughput is finite even when ingredients are plentiful.
    // One configured preorder slot is held for every distinct accepted order.
    const capacityRequirements = [
      { sku: PREORDER_SLOT_SKU, quantity: 1 },
      ...expandCapacityDemand(verifiedDemandItems, recipes),
    ];
    const preorderFingerprint = fingerprintPreorder(
      selectedMarket.id, dateKey, verifiedDemandItems, String(data.customer.email || ''), Math.round(subtotal * 100)
    );

    const orderNumber = generatePreorderNumber();
    const total = subtotal; // TAX_RATE is 0 for market sales
    const preorderMetadata = getPreorderMetadata(data);
    const totalCents = Math.round(total * 100);

    const items = preorderCartItems.map((item: any) => ({
      productId: item.productId || item.id,
      name: item.name,
      quantity: item.quantity || 1,
      price: item.price || 0,
      subtotal: (item.price || 0) * (item.quantity || 1),
      size: item.size || null,
      imageUrl: item.imageUrl || null,
    }));

    // Persist to MongoDB marketorders collection
    let admission;
    try {
      admission = await createCapacityBoundPreorder({
        db, client,
        marketId: selectedMarket.id, dateKey, prefix: marketConfig.prefix,
        checkoutRequestId, demand: capacityRequirements,
        order: {
      orderNumber,
      preorderFingerprint,
      marketId: selectedMarket.id,
      marketName: marketConfig.name,
      customerName: data.customer.name,
      customerPhone: data.customer.phone,
      customerEmail: data.customer.email || '',
      items,
      subtotal,
      tax: PREORDER_RULES.TAX_RATE,
      total,
      totalCents,
      status: 'PENDING_PAYMENT',
      paymentMethod: 'SQUARE_ONLINE',
      paymentProvider: 'square',
      paymentStatus: 'PENDING',
      amountPaid: 0,
      balanceDue: total,
      notes: data.notes || null,
      metadata: preorderMetadata,
      source: preorderMetadata.source,
      utmSource: preorderMetadata.utmSource,
      utmCampaign: preorderMetadata.utmCampaign,
      pickupLocation: marketConfig.name,
      pickupDate: pickupDateStr,
      pickupDay: marketConfig.day,
      pickupHours: marketConfig.hours,
        },
      });
    } catch (error: any) {
      if (error instanceof CapacityError) {
        return NextResponse.json({
          success: false, code: error.code, error: error.message,
          waitlistAvailable: error.code === 'PREORDER_CAPACITY_UNAVAILABLE',
        }, { status: error.status });
      }
      throw error;
    }
    const dbOrder = admission.preorder;
    const canonicalOrderNumber = dbOrder.orderNumber;
    const waitlistNumber = dbOrder.waitlistNumber;
    const counter = dbOrder.queuePosition;

    // A replay already has an externally payable link: return it unchanged.
    // Requests still setting up payment reuse the same Square idempotency key.
    if (admission.replay && dbOrder.paymentUrl && dbOrder.paymentStatus === 'PENDING') {
      return NextResponse.json({
        success: true,
        orderNumber: canonicalOrderNumber, waitlistNumber, waitlistPosition: counter,
        preorder: {
          orderNumber: canonicalOrderNumber, waitlistNumber, waitlistPosition: counter,
          pickupLocation: marketConfig.name, pickupDate: pickupDateStr,
          pickupHours: marketConfig.hours, estimatedTime: 'Pickup timing is confirmed after payment and staff preparation',
          marketId: selectedMarket.id, paymentStatus: 'PENDING_PAYMENT',
        },
        payment: {
          provider: 'square', status: 'PENDING',
          url: dbOrder.paymentUrl, paymentLinkId: dbOrder.paymentLinkId,
          squareOrderId: dbOrder.squareOrderId, amountDue: dbOrder.total,
        },
      });
    }
    if (admission.replay && (dbOrder.capacityReservationStatus !== 'held' ||
        dbOrder.paymentStatus !== 'PENDING')) {
      return NextResponse.json({
        success: false, code: 'PREORDER_ATTEMPT_CLOSED',
        error: 'This preorder attempt is no longer payable. Please start a new checkout.',
      }, { status: 409 });
    }

    let payment: null | {
      provider: 'square';
      status: 'PENDING';
      url: string;
      paymentLinkId: string;
      squareOrderId?: string;
      amountDue: number;
    } = null;

    if (!payAtPickupFallback) {
      const appBaseUrl = getAppBaseUrl(request);
      const paymentLineItems = preorderCartItems.map((item: any) => ({
        catalogObjectId: item.catalogObjectId,
        name: String(item.name || 'Preorder item').slice(0, 255),
        quantity: String(item.quantity || 1),
        basePriceMoney: { amount: Number(item.priceCents) || Math.round((Number(item.price) || 0) * 100), currency: 'USD' },
      }));

      const paymentResult = await createPaymentLink({
        referenceId: canonicalOrderNumber,
        lineItems: paymentLineItems,
        description: `Taste of Gratitude preorder ${canonicalOrderNumber}`,
        redirectUrl: `${appBaseUrl}/preorder/status?orderNumber=${encodeURIComponent(canonicalOrderNumber)}&payment=return`,
        buyerEmail: data.customer.email || undefined,
        buyerPhone: data.customer.phone || undefined,
        metadata: {
          localOrderId: canonicalOrderNumber,
          orderNumber: canonicalOrderNumber,
          waitlistNumber,
          source: 'preorder_payment_link',
        },
        idempotencyKey: `preorder_link_${canonicalOrderNumber}`,
      });

      const paymentLink = paymentResult.data?.paymentLink;
      if (!paymentResult.success || !paymentLink?.url) {
        // This branch is a definitive provider failure. A thrown timeout
        // is ambiguous and must retain capacity until provider reconciliation.
        if (paymentResult.success === false && !paymentLink?.id) {
          await releaseCapacityAfterDefinitiveLinkFailure(db, client, canonicalOrderNumber);
        }
        // If Square returned a partially created link, keep the hold until
        // authoritative provider reconciliation; never sell these units twice.
        const detail = paymentResult.errors?.[0]?.detail || paymentResult.errors?.[0]?.code || 'Square payment link creation failed';
        await updatePreorderPaymentFields(canonicalOrderNumber, {
          paymentStatus: paymentResult.success === false && !paymentLink?.id
            ? 'FAILED' : 'PENDING',
          paymentReviewState: paymentResult.success === false && !paymentLink?.id
            ? 'definitively_failed' : 'needs_provider_reconciliation',
          paymentError: detail,
          paymentProvider: 'square',
          amountPaid: 0,
          balanceDue: total,
        });

        logger.error('Preorder payment link creation failed', { canonicalOrderNumber, detail });
        return NextResponse.json(
          {
            success: false,
            error: 'Could not create secure payment link. Please try again or contact Taste of Gratitude.',
            code: 'PAYMENT_LINK_FAILED',
            canonicalOrderNumber,
          },
          { status: 502 }
        );
      }

      await updatePreorderPaymentFields(canonicalOrderNumber, {
        paymentLinkId: paymentLink.id,
        paymentUrl: paymentLink.url,
        squareOrderId: paymentLink.orderId || null,
        paymentProvider: 'square',
        paymentStatus: 'PENDING',
        amountPaid: 0,
        balanceDue: total,
      });

      payment = {
        provider: 'square',
        status: 'PENDING',
        url: paymentLink.url,
        paymentLinkId: paymentLink.id,
        squareOrderId: paymentLink.orderId,
        amountDue: total,
      };
    }

    logger.info('Preorder persisted to MongoDB', {
      orderNumber: canonicalOrderNumber,
      waitlistNumber,
      marketId: selectedMarket.id,
      _id: dbOrder._id,
    });

    if (payAtPickupFallback) {
      // Manual/admin fallback only. Normal storefront preorders require online payment first.
      notifySquareTeam({
        orderNumber,
        waitlistNumber,
        customer: {
          name: data.customer.name,
          email: data.customer.email,
          phone: data.customer.phone,
        },
        items,
        pickupLocation: marketConfig.name,
        pickupDate: pickupDateStr,
        pickupHours: marketConfig.hours,
        subtotal,
        notes: data.notes || null,
      }).catch((err: any) => {
        logger.error('Failed to notify Square team', {
          error: err.message,
          orderNumber,
        });
      });
    }

    return NextResponse.json({
      success: true,

      // Backward-compatible top-level fields for current UI
      orderNumber: canonicalOrderNumber,
      waitlistNumber,
      waitlistPosition: counter,

      preorder: {
        orderNumber: canonicalOrderNumber,
        waitlistNumber,
        waitlistPosition: counter,
        pickupLocation: marketConfig.name,
        pickupDate: pickupDateStr,
        pickupHours: marketConfig.hours,
        estimatedTime: 'Pickup timing is confirmed after payment and staff preparation',
        marketId: selectedMarket.id,
        paymentStatus: 'PENDING_PAYMENT',
      },
      payment,
    });
  } catch (error: any) {
    logger.error('Preorder creation error', { error: error.message });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create preorder. Please try again.',
        code: 'PREORDER_CREATE_FAILED',
      },
      { status: 500 }
    );
  }
}

/**
 * Get preorder status
 * GET /api/preorder?orderNumber=PRE-xxx
 * Returns real data from MongoDB — 404 if not found, NO mocks
 */
export async function GET(request: any) {
  try {
    const { searchParams } = new URL(request.url);
    const orderNumber = searchParams.get('orderNumber');

    if (!orderNumber) {
      return NextResponse.json(
        { success: false, error: 'Order number is required' },
        { status: 400 }
      );
    }

    logger.info('Preorder status check', { orderNumber });

    const preorder = await findPreorderByOrderNumber(orderNumber);

    if (!preorder) {
      return NextResponse.json(
        { success: false, error: 'Preorder not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      preorder: {
        orderNumber: preorder.orderNumber,
        waitlistNumber: preorder.waitlistNumber,
        status: preorder.status,
        message: getStatusMessage(preorder.status),
        marketId: preorder.marketId,
        pickupLocation: preorder.pickupLocation || preorder.marketName,
        pickupDate: preorder.pickupDate,
        pickupHours: preorder.pickupHours,
        items: preorder.items,
        subtotal: preorder.subtotal,
        total: preorder.total,
        paymentMethod: preorder.paymentMethod,
        paymentProvider: preorder.paymentProvider,
        paymentStatus: preorder.paymentStatus,
        amountPaid: preorder.amountPaid ?? 0,
        balanceDue: preorder.balanceDue ?? preorder.total,
        paymentUrl: preorder.paymentStatus === 'PENDING' ? preorder.paymentUrl || null : null,
        customer: {
          name: preorder.customerName,
          phone: preorder.customerPhone,
          email: preorder.customerEmail,
        },
        createdAt: preorder.createdAt,
      },
    });
  } catch (error: any) {
    logger.error('Preorder status error', { error: error.message });

    return NextResponse.json(
      { success: false, error: 'Failed to retrieve preorder status' },
      { status: 500 }
    );
  }
}

function getStatusMessage(status: string): string {
  const messages: Record<string, string> = {
    PENDING_CONFIRMATION: 'Your preorder has been received and is awaiting confirmation.',
    CONFIRMED: "Your preorder is confirmed! We'll have it ready at the market.",
    PREPARING: 'Your preorder is being prepared now.',
    READY: 'Your order is ready for pickup!',
    PICKED_UP: 'Your order has been picked up. Thank you!',
    CANCELLED: 'This preorder has been cancelled.',
    REFUNDED: 'This preorder has been refunded.',
    PENDING_PAYMENT: 'Awaiting payment.',
  };
  return messages[status] || 'Status unknown';
}