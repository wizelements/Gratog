import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import MarketOrder from '@/models/MarketOrder';
import DailyInventory from '@/models/DailyInventory';
import { rateLimitOrder, createRateLimitHeaders } from '@/lib/rate-limit';
import { z } from 'zod';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';

// Extended validation schema with fulfillment options
const orderSchema = z.object({
  marketId: z.string().min(1),
  fulfillmentType: z.enum(['TODAY', 'PREORDER', 'SHIPPING']),
  pickupDate: z.string().optional(),
  shippingAddress: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string(),
    zip: z.string(),
  }).optional(),
  customerName: z.string().min(1).max(100),
  customerPhone: z.string()
    .regex(/^\d{10}$/, 'Phone must be 10 digits')
    .transform(v => v.replace(/\D/g, '')),
  customerEmail: z.string().email().optional().or(z.literal('')),
  items: z.array(z.object({
    productId: z.string(),
    name: z.string(),
    price: z.number().positive(),
    quantity: z.number().int().positive().max(20),
    availability: z.enum(['fresh', 'preorder', 'shippable']).optional(),
  })).min(1),
  paymentMethod: z.enum(['SQUARE_ONLINE', 'CASH', 'CASHAPP', 'VENMO']),
  notes: z.string().max(500).optional(),
});

/**
 * POST /api/orders
 * Create order with fulfillment type
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const rateLimit = await rateLimitOrder(request, 5);
    if (!rateLimit.success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again in a minute.' },
        { status: 429, headers: createRateLimitHeaders(rateLimit.result!) }
      );
    }

    const body = await request.json();
    const validation = orderSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: validation.error.errors },
        { status: 400 }
      );
    }

    const data = validation.data;
    await connectToDatabase();

    // Calculate totals
    const subtotal = data.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = Math.round(subtotal * 0.08 * 100) / 100;
    const shippingCost = data.fulfillmentType === 'SHIPPING' ? (subtotal > 50 ? 0 : 8.99) : 0;
    const total = subtotal + tax + shippingCost;

    // Generate order number
    const orderNumber = nanoid(8).toUpperCase();

    // Determine status based on fulfillment and payment
    let status: string;
    let paymentStatus: string;
    let estimatedReadyAt: Date | undefined;
    let queuePosition: number | undefined;

    switch (data.fulfillmentType) {
      case 'TODAY':
        // Today pickup - check inventory and queue
        const today = new Date().toISOString().split('T')[0];
        
        // Check inventory atomically
        const inventory = await DailyInventory.findOne({
          marketId: data.marketId,
          date: { $gte: new Date(today), $lt: new Date(today + 'T23:59:59') },
        });

        for (const item of data.items) {
          const invItem = inventory?.items.find(i => i.productId === item.productId);
          const remaining = (invItem?.initialQuantity || 0) - (invItem?.soldCount || 0);
          
          if (invItem?.isSoldOut || remaining < item.quantity) {
            return NextResponse.json(
              { error: `${item.name} is sold out` },
              { status: 400 }
            );
          }
        }

        // Update inventory
        for (const item of data.items) {
          await DailyInventory.updateOne(
            {
              marketId: data.marketId,
              date: { $gte: new Date(today), $lt: new Date(today + 'T23:59:59') },
              'items.productId': item.productId,
            },
            { $inc: { 'items.$.soldCount': item.quantity } }
          );
        }

        // Get queue position
        const activeOrders = await MarketOrder.countDocuments({
          marketId: data.marketId,
          status: { $in: ['CONFIRMED', 'PREPARING', 'READY'] },
          createdAt: { $gte: new Date(today) },
        });
        queuePosition = activeOrders + 1;
        estimatedReadyAt = new Date(Date.now() + 20 * 60000); // 20 min default
        
        status = data.paymentMethod === 'SQUARE_ONLINE' ? 'PENDING_PAYMENT' : 'CONFIRMED';
        paymentStatus = data.paymentMethod === 'SQUARE_ONLINE' ? 'PENDING' : 'PAID';
        break;

      case 'PREORDER':
        // Preorder - no inventory check, paid now, pickup later
        if (!data.pickupDate) {
          return NextResponse.json(
            { error: 'Pickup date required for preorder' },
            { status: 400 }
          );
        }
        
        status = data.paymentMethod === 'SQUARE_ONLINE' ? 'PREORDER_PENDING_PAYMENT' : 'PREORDER_CONFIRMED';
        paymentStatus = data.paymentMethod === 'SQUARE_ONLINE' ? 'PENDING' : 'PAID';
        estimatedReadyAt = new Date(data.pickupDate);
        break;

      case 'SHIPPING':
        // Shipping - paid now, ship later
        if (!data.shippingAddress) {
          return NextResponse.json(
            { error: 'Shipping address required' },
            { status: 400 }
          );
        }
        
        status = data.paymentMethod === 'SQUARE_ONLINE' ? 'SHIPPING_PENDING_PAYMENT' : 'SHIPPING_CONFIRMED';
        paymentStatus = data.paymentMethod === 'SQUARE_ONLINE' ? 'PENDING' : 'PAID';
        break;

      default:
        status = 'PENDING';
        paymentStatus = 'PENDING';
    }

    // Create order
    const order = await MarketOrder.create({
      orderNumber,
      marketId: data.marketId,
      fulfillmentType: data.fulfillmentType,
      pickupDate: data.pickupDate ? new Date(data.pickupDate) : undefined,
      shippingAddress: data.shippingAddress,
      customerName: data.customerName.trim(),
      customerPhone: data.customerPhone,
      customerEmail: data.customerEmail || undefined,
      items: data.items.map(item => ({
        ...item,
        subtotal: item.price * item.quantity,
      })),
      subtotal,
      tax,
      shippingCost,
      total,
      status,
      paymentMethod: data.paymentMethod,
      paymentStatus,
      estimatedReadyAt,
      queuePosition,
      notes: data.notes,
    });

    // Send SMS confirmation (for paid orders)
    if (paymentStatus === 'PAID') {
      const { sendOrderConfirmation } = await import('@/lib/sms');
      try {
        await sendOrderConfirmation(data.customerPhone, {
          orderNumber,
          customerName: data.customerName,
          total,
          estimatedMinutes: 20,
        });
      } catch (smsError) {
        console.error('SMS failed:', smsError);
      }
    }

    return NextResponse.json({
      success: true,
      order: {
        id: order._id,
        orderNumber,
        status,
        fulfillmentType: data.fulfillmentType,
        total,
        estimatedReadyAt,
        queuePosition,
      },
    }, {
      headers: createRateLimitHeaders(rateLimit.result!)
    });
  } catch (error) {
    console.error('Order creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/orders
 * Get orders with filtering by fulfillment type
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const authHeader = request.headers.get('authorization');
    const apiKey = process.env.ADMIN_API_KEY;
    
    if (!authHeader || authHeader.replace('Bearer ', '') !== apiKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fulfillmentType = searchParams.get('fulfillmentType');
    const status = searchParams.get('status');
    const marketId = searchParams.get('marketId');

    await connectToDatabase();

    const query: any = {};
    if (fulfillmentType) query.fulfillmentType = fulfillmentType;
    if (status) query.status = status;
    if (marketId) query.marketId = marketId;

    const orders = await MarketOrder.find(query)
      .sort({ createdAt: -1 })
      .limit(100);

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Order fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}
