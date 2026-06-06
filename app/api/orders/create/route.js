export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { createOrderAtomic } from '@/lib/transactions';
import { randomUUID } from 'crypto';
import {
  getIdempotencyKeyFromHeaders,
  withIdempotency,
  isValidIdempotencyKey,
} from '@/lib/idempotency';
import { generateOrderAccessToken } from '@/lib/order-access-token';
import { priceCart, CartPricingError } from '@/lib/cart-pricing';
import { checkDeliveryRadius } from '@/lib/delivery-radius';
import { calculateDistanceBasedDeliveryFee } from '@/lib/delivery-fees';
import { shippingMethods } from '@/adapters/fulfillmentAdapter';

// Order access token TTL — must outlive the longest realistic checkout session.
// Payment route uses 30m; we use the same so the token survives until pay click.
const ORDER_ACCESS_TOKEN_TTL_MS = 30 * 60 * 1000;

export async function POST(request) {
  try {
    const orderData = await request.json();

    // Check for idempotency key
    const idempotencyKey = getIdempotencyKeyFromHeaders(request.headers);
    if (idempotencyKey && !isValidIdempotencyKey(idempotencyKey)) {
      return NextResponse.json(
        { error: 'Invalid idempotency key format' },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!orderData.customer || !orderData.cart || orderData.cart.length === 0) {
      return NextResponse.json(
        {
          error: 'Customer information and cart items are required',
          received: {
            customer: !!orderData.customer,
            cart: !!orderData.cart,
            cartLength: orderData.cart?.length,
          },
        },
        { status: 400 }
      );
    }

    // -----------------------------------------------------------------------
    // SERVER-AUTHORITATIVE PRICING.
    // Everything money-related is rebuilt from the catalog. Any subtotal,
    // total, price, or couponDiscount sent by the client is IGNORED. This is
    // the underpayment fix; see lib/cart-pricing.ts and docs REVENUE risk R-C1.
    // -----------------------------------------------------------------------
    let pricing;
    let fulfillmentQuote = null;
    try {
      const couponCode =
        orderData.appliedCoupon?.code ||
        orderData.couponCode ||
        null;
      const tipCents = isShippingFulfillment(orderData.fulfillmentType)
        ? 0
        : dollarsToCents(orderData.deliveryTip);

      const basePricing = await priceCart({
        items: orderData.cart,
        couponCode,
        deliveryFeeCents: 0,
        tipCents,
      });

      fulfillmentQuote = await quoteServerFulfillment(orderData, basePricing.subtotal);

      pricing = await priceCart({
        items: orderData.cart,
        couponCode,
        deliveryFeeCents: fulfillmentQuote.feeCents,
        tipCents,
      });
    } catch (err) {
      if (err instanceof CartPricingError) {
        return NextResponse.json(
          {
            success: false,
            error: err.message,
            code: err.code,
            details: err.details,
          },
          { status: err.status }
        );
      }
      if (err.status) {
        return NextResponse.json(
          {
            success: false,
            error: err.message,
            code: err.code || 'DELIVERY_QUOTE_FAILED',
          },
          { status: err.status }
        );
      }
      throw err;
    }

    const orderId = randomUUID();
    const timestamp = new Date();
    const storedFulfillment = buildStoredFulfillment(orderData, fulfillmentQuote);

    // Build order object — pricing comes from the server, not the client.
    const enhancedOrder = {
      id: orderId,
      customerId: orderData.customer?.email || null,
      customerEmail: orderData.customer?.email,
      customerName: orderData.customer?.name,
      customerPhone: orderData.customer?.phone,

      items: pricing.items.map((line) => ({
        id: line.productId,
        productId: line.productId,
        variationId: line.variationId,
        catalogObjectId: line.catalogObjectId,
        name: line.name,
        subtitle: line.subtitle,
        price: line.unitPrice, // dollars, server-derived
        priceCents: line.unitPriceCents,
        quantity: line.quantity,
        lineTotal: line.lineTotal,
        lineTotalCents: line.lineTotalCents,
        size: line.size,
        image: line.image,
        category: line.category,
        rewardPoints: line.rewardPoints,
        isPreorder: line.isPreorder,
        marketExclusive: line.marketExclusive,
        squareProductUrl: line.squareProductUrl,
      })),

      subtotal: pricing.subtotal,
      subtotalCents: pricing.subtotalCents,
      total: pricing.total,
      totalCents: pricing.totalCents,
      tax: pricing.tax,
      taxCents: pricing.taxCents,
      currency: pricing.currency,

      fulfillmentType: orderData.fulfillmentType,
      deliveryAddress: orderData.deliveryAddress,
      deliveryTimeSlot: orderData.deliveryTimeSlot,
      deliveryInstructions: orderData.deliveryInstructions,
      deliveryFee: pricing.deliveryFee,
      deliveryFeeCents: pricing.deliveryFeeCents,
      deliveryTip: isShippingFulfillment(orderData.fulfillmentType) ? 0 : pricing.tip,
      deliveryTipCents: isShippingFulfillment(orderData.fulfillmentType) ? 0 : pricing.tipCents,
      deliveryDistance: fulfillmentQuote?.distance ?? orderData.deliveryDistance ?? null,
      deliveryNearestLocation: fulfillmentQuote?.nearestLocationName ?? null,
      deliveryQuoteMessage: fulfillmentQuote?.message || orderData.deliveryQuoteMessage || null,
      pickup: storedFulfillment.type === 'pickup' ? storedFulfillment.pickup : null,
      pickupLocation: storedFulfillment.pickup?.locationId || null,
      pickupDate: storedFulfillment.pickup?.date || null,
      shippingAddress: orderData.shippingAddress,
      shippingMethod: orderData.shippingMethod,
      shippingService: fulfillmentQuote?.shippingService || null,
      fulfillment: storedFulfillment,

      // Canonical coupon field — payments/route.ts reads this exact path.
      appliedCoupon: pricing.appliedCoupon
        ? {
            code: pricing.appliedCoupon.code,
            type: pricing.appliedCoupon.type,
            value: pricing.appliedCoupon.value,
          }
        : null,
      couponDiscount: pricing.discount,
      couponDiscountCents: pricing.discountCents,

      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: 'square_link',
      squareOrderUrl: null,

      createdAt: timestamp,
      updatedAt: timestamp,
      confirmedAt: null,
      completedAt: null,

      // Reward points are CALCULATED here for display/UX but NOT awarded.
      // Awarding happens exactly once in /api/payments on confirmed payment
      // success (see lib/enhanced-rewards.js idempotency).
      rewardPointsEarned: pricing.rewardPointsEarned,

      source: orderData.source || 'website',
      deviceInfo: orderData.deviceInfo || {},
      version: 1,
    };

    // Wrap order creation in idempotency check
    const createOrder = async () => {
      try {
        const order = await createOrderAtomic(enhancedOrder);

        // INTENTIONAL NO-OP: reward points used to be fired here in
        // parallel with /api/payments, which double-awarded every order.
        // Rewards are now awarded only on confirmed payment success.

        // Mint an order access token so the (guest) checkout can authorize
        // its subsequent POST /api/payments call.
        const accessToken = generateOrderAccessToken({
          orderId: order.id,
          customerEmail: order.customerEmail,
          ttlMs: ORDER_ACCESS_TOKEN_TTL_MS,
        });

        return {
          success: true,
          order: {
            id: order.id,
            orderNumber: `TOG-${order.id.slice(-8)}`,
            status: order.status,
            paymentStatus: order.paymentStatus,
            squareOrderId: order.squareOrderId || null,
            squareCustomerId: order.squareCustomerId || null,
            orderAccessToken: accessToken,
            orderAccessTokenExpiresAt: accessToken
              ? new Date(Date.now() + ORDER_ACCESS_TOKEN_TTL_MS).toISOString()
              : null,
            items: order.items,
            pricing: {
              subtotal: order.subtotal,
              deliveryFee: order.deliveryFee || 0,
              tip: order.deliveryTip || 0,
              discount: order.couponDiscount || 0,
              tax: order.tax || 0,
              total: order.total,
            },
            fulfillment: order.fulfillment || null,
            appliedCoupon: order.appliedCoupon,
          },
        };
      } catch (dbError) {
        console.error('Atomic order creation failed:', dbError);

        if (dbError.code === 'ECONNREFUSED' || dbError.message?.includes('timeout')) {
          throw dbError; // Let retry logic handle it
        }
        throw new Error(`Order creation failed: ${dbError.message}`);
      }
    };

    // Execute with idempotency if key provided
    let result;
    if (idempotencyKey) {
      result = await withIdempotency(idempotencyKey, createOrder, 86400); // 24h TTL
    } else {
      result = await createOrder();
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Create order error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create order',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

function dollarsToCents(v) {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

function isDeliveryFulfillment(type) {
  return String(type || '').includes('delivery');
}

function isShippingFulfillment(type) {
  return String(type || '').includes('shipping');
}

function isPickupFulfillment(type) {
  const value = String(type || '').toLowerCase();
  return value.includes('pickup') || value === 'preorder';
}

function buildStoredFulfillment(orderData, quote) {
  if (isShippingFulfillment(orderData.fulfillmentType)) {
    return {
      type: 'shipping',
      address: orderData.shippingAddress || null,
      methodId: orderData.shippingMethod || null,
      service: quote?.shippingService || null,
      fee: quote?.fee ?? 0,
      message: quote?.message || null,
    };
  }

  if (isDeliveryFulfillment(orderData.fulfillmentType)) {
    return {
      type: 'delivery',
      address: orderData.deliveryAddress || null,
      window: orderData.deliveryTimeSlot || null,
      instructions: orderData.deliveryInstructions || null,
      fee: quote?.fee ?? 0,
      distance: quote?.distance ?? orderData.deliveryDistance ?? null,
      nearestLocationName: quote?.nearestLocationName || null,
      message: quote?.message || orderData.deliveryQuoteMessage || null,
    };
  }

  if (isPickupFulfillment(orderData.fulfillmentType)) {
    const pickup = orderData.pickup || {};
    return {
      type: 'pickup',
      pickup: {
        locationId: pickup.locationId || orderData.pickupLocation || null,
        date: pickup.date || orderData.pickupDate || orderData.orderTiming?.requestedDate || null,
        instructions: pickup.instructions || orderData.pickupInstructions || null,
      },
    };
  }

  return { type: orderData.fulfillmentType || 'pickup' };
}

function formatDeliveryAddress(address) {
  return [
    address?.street,
    address?.suite,
    address?.city,
    address?.state || 'GA',
    address?.zip,
  ]
    .filter(Boolean)
    .join(', ');
}

function orderError(message, status, code) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

async function quoteServerFulfillment(orderData, subtotalDollars) {
  if (isShippingFulfillment(orderData.fulfillmentType)) {
    const address = orderData.shippingAddress;
    if (!address?.street || !address?.city || !address?.state || !address?.zip) {
      throw orderError('Shipping address is required', 400, 'SHIPPING_ADDRESS_REQUIRED');
    }

    const method = shippingMethods().find((option) => option.id === orderData.shippingMethod);
    if (!method) {
      throw orderError('Shipping method is required', 400, 'SHIPPING_METHOD_REQUIRED');
    }

    return {
      feeCents: dollarsToCents(method.price),
      fee: method.price,
      shippingService: method.name,
      message: `${method.name} selected — estimated ${method.estimatedDays}.`,
    };
  }

  if (!isDeliveryFulfillment(orderData.fulfillmentType)) {
    return { feeCents: 0 };
  }

  const address = orderData.deliveryAddress;
  if (!address?.street || !address?.city || !address?.zip) {
    throw orderError('Delivery address is required', 400, 'DELIVERY_ADDRESS_REQUIRED');
  }

  let radius;
  try {
    radius = await checkDeliveryRadius(formatDeliveryAddress(address));
  } catch (err) {
    throw orderError(
      err?.message || 'Unable to verify delivery address',
      400,
      'DELIVERY_QUOTE_FAILED'
    );
  }

  if (!radius.eligible) {
    throw orderError(
      radius.message || 'Delivery is not available for this address',
      400,
      'DELIVERY_OUT_OF_RANGE'
    );
  }

  const feeDollars = calculateDistanceBasedDeliveryFee(radius.distance, subtotalDollars);
  return {
    feeCents: dollarsToCents(feeDollars),
    fee: feeDollars,
    distance: radius.distance,
    nearestLocationName: radius.nearestLocationName,
    message:
      feeDollars === 0
        ? `Free delivery — ${radius.distance} miles away.`
        : `Delivery is $${feeDollars.toFixed(2)} — ${radius.distance} miles away.`,
  };
}
