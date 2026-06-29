export const dynamic = 'force-dynamic';

/**
 * Preorder API route
 * POST /api/preorder  — Create preorder (persisted to MongoDB marketorders)
 * GET  /api/preorder?orderNumber=PRE-xxx — Look up real preorder (404 if missing)
 */

import { NextResponse } from 'next/server';
import { generatePreorderNumber, getEstimatedWaitTime } from '@/lib/preorder/waitlist';
import { getNextWaitlistNumber, createPreorder, findPreorderByOrderNumber } from '@/lib/preorder/repository';
import { MARKET_CONFIGS, isPastCutoff, isValidMarketId, getNextMarketDate, PREORDER_RULES } from '@/lib/preorder/rules';
import { notifySquareTeam } from '@/lib/preorder/square-notifications';
import { createLogger } from '@/lib/logger';
import { sanitizeObject } from '@/lib/validation/sanitize';
import { validateCustomerData } from '@/lib/validation/customer';
import { validatePreorderMinimum } from '@/lib/cart-engine';
import { getStorefrontCatalogSnapshot } from '@/lib/storefront-products';

const logger = createLogger('PreorderAPI');

function normalizeLookupKey(value: any) {
  return String(value || '').trim().toLowerCase();
}

function isUnavailableForPreorder(product: any) {
  return product?.available === false ||
    product?.soldOut === true ||
    product?.inventoryStatus === 'sold_out' ||
    product?.inventoryStatus === 'inactive' ||
    product?.weeklyStatus === 'inactive';
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
    const price = Number(variation?.price ?? product.price ?? ((product.priceCents || 0) / 100));
    const priceCents = Number(variation?.priceCents ?? product.priceCents ?? Math.round(price * 100));
    const quantity = Math.max(1, Math.min(99, Number(item.quantity) || 1));

    if (!Number.isFinite(price) || price <= 0) {
      throw new Error(`${product.name} is missing a valid preorder price.`);
    }

    return {
      id: product.id || product.slug || lookupKey,
      productId: product.id || product.slug || lookupKey,
      slug: product.slug || product.id,
      variationId: variation?.id || product.variationId || product.catalogObjectId || product.id,
      catalogObjectId: product.catalogObjectId || product.variationId || variation?.id || product.id,
      price,
      priceCents,
      quantity,
      isPreorder: true,
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
      customerName: data.customer?.name,
      marketId: data.marketId,
      itemCount: data.items?.length,
    });

    // Validate market
    if (!data.marketId || !isValidMarketId(data.marketId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing market selection' },
        { status: 400 }
      );
    }

    if (isPastCutoff(data.marketId)) {
      return NextResponse.json(
        { success: false, error: 'This market preorder window has closed. Please choose the next weekly menu drop or visit the booth for walk-up availability.' },
        { status: 400 }
      );
    }

    if (!data.items || !Array.isArray(data.items) || data.items.length === 0) {
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

    const preorderCartItems = await resolvePreorderCartItems(data.items);

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

    // Get market info from centralized config
    const marketConfig = MARKET_CONFIGS[data.marketId as keyof typeof MARKET_CONFIGS];
    const pickupDate = getNextMarketDate(marketConfig.day);
    const pickupDateStr = pickupDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });

    // Atomic waitlist number from MongoDB
    const { waitlistNumber, counter } = await getNextWaitlistNumber(
      data.marketId,
      marketConfig.prefix,
      pickupDate
    );

    const orderNumber = generatePreorderNumber();
    const total = subtotal; // TAX_RATE is 0 for market sales
    const preorderMetadata = getPreorderMetadata(data);

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
    const dbOrder = await createPreorder({
      orderNumber,
      waitlistNumber,
      marketId: data.marketId,
      marketName: marketConfig.name,
      customerName: data.customer.name,
      customerPhone: data.customer.phone,
      customerEmail: data.customer.email || '',
      items,
      subtotal,
      tax: PREORDER_RULES.TAX_RATE,
      total,
      status: 'PENDING_CONFIRMATION',
      paymentMethod: 'PAY_AT_PICKUP',
      paymentStatus: 'PENDING',
      notes: data.notes || null,
      metadata: preorderMetadata,
      source: preorderMetadata.source,
      utmSource: preorderMetadata.utmSource,
      utmCampaign: preorderMetadata.utmCampaign,
      queuePosition: counter,
      pickupLocation: marketConfig.name,
      pickupDate: pickupDateStr,
      pickupDay: marketConfig.day,
      pickupHours: marketConfig.hours,
    });

    logger.info('Preorder persisted to MongoDB', {
      orderNumber,
      waitlistNumber,
      marketId: data.marketId,
      _id: dbOrder._id,
    });

    // Notify Square team (non-blocking)
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

    return NextResponse.json({
      success: true,

      // Backward-compatible top-level fields for current UI
      orderNumber,
      waitlistNumber,
      waitlistPosition: counter,

      preorder: {
        orderNumber,
        waitlistNumber,
        waitlistPosition: counter,
        pickupLocation: marketConfig.name,
        pickupDate: pickupDateStr,
        pickupHours: marketConfig.hours,
        estimatedTime: getEstimatedWaitTime(counter),
        marketId: data.marketId,
      },
    });
  } catch (error: any) {
    logger.error('Preorder creation error', { error: error.message });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create preorder. Please try again.',
        details: error.message,
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
