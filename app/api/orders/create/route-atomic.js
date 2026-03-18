import { NextResponse } from 'next/server';
import { createOrderAtomic } from '@/lib/transactions';
import { randomUUID } from 'crypto';
import { calculateRewardPoints } from '@/lib/products';
import { retrySquareApi } from '@/lib/retry';
import { 
  getIdempotencyKeyFromHeaders, 
  withIdempotency, 
  isValidIdempotencyKey 
} from '@/lib/idempotency';

const INTERNAL_REWARDS_TOKEN = process.env.MASTER_API_KEY || process.env.ADMIN_API_KEY || '';

export async function POST(request) {
  try {
    const orderData = await request.json();
    
    // Check for idempotency key
    const idempotencyKey = getIdempotencyKeyFromHeaders(request.headers);
    if (idempotencyKey) {
      if (!isValidIdempotencyKey(idempotencyKey)) {
        return NextResponse.json(
          { error: 'Invalid idempotency key format' },
          { status: 400 }
        );
      }
    }

    // Validate required fields
    if (!orderData.customer || !orderData.cart || orderData.cart.length === 0) {
      return NextResponse.json({
        error: 'Customer information and cart items are required',
        received: {
          customer: !!orderData.customer,
          cart: !!orderData.cart,
          cartLength: orderData.cart?.length
        }
      }, { status: 400 });
    }
    
    const orderId = randomUUID();
    const timestamp = new Date();
    
    // Build order object
    const enhancedOrder = {
      id: orderId,
      customerId: orderData.customer?.email || null,
      customerEmail: orderData.customer?.email,
      customerName: orderData.customer?.name,
      customerPhone: orderData.customer?.phone,
      
      items: orderData.cart.map(item => ({
        id: item.id,
        name: item.name,
        subtitle: item.subtitle,
        price: item.price,
        quantity: item.quantity,
        size: item.size,
        category: item.category,
        rewardPoints: item.rewardPoints,
        squareProductUrl: item.squareProductUrl
      })),
      subtotal: orderData.subtotal || 0,
      total: orderData.total || 0,
      currency: 'USD',
      
      fulfillmentType: orderData.fulfillmentType,
      deliveryAddress: orderData.deliveryAddress,
      deliveryTimeSlot: orderData.deliveryTimeSlot,
      deliveryInstructions: orderData.deliveryInstructions,
      deliveryFee: orderData.deliveryFee || 0,
      
      appliedCoupon: orderData.appliedCoupon,
      couponDiscount: orderData.couponDiscount || 0,
      
      status: 'pending',
      paymentStatus: 'pending',
      paymentMethod: 'square_link',
      squareOrderUrl: null,
      
      createdAt: timestamp,
      updatedAt: timestamp,
      confirmedAt: null,
      completedAt: null,
      
      rewardPointsEarned: calculateRewardPoints(orderData.cart.map(item => item.id)),
      
      source: orderData.source || 'website',
      deviceInfo: orderData.deviceInfo || {},
      version: 1
    };
    
    // Wrap order creation in idempotency check
    const createOrder = async () => {
      try {
        // Use atomic transaction
        const order = await createOrderAtomic(enhancedOrder);
        
        // Award reward points asynchronously (don't block response)
        if (order.rewardPointsEarned > 0 && order.customerEmail) {
          awardRewardPointsWithRetry(order).catch(error => {
            console.error('Failed to award reward points:', error);
          });
        }
        
        return {
          success: true,
          order: {
            id: order.id,
            orderNumber: `TOG-${order.id.slice(-8)}`,
            total: order.total,
            status: order.status,
            items: order.items
          }
        };
        
      } catch (dbError) {
        console.error('Atomic order creation failed:', dbError);
        
        // Check if it's a retryable error
        if (dbError.code === 'ECONNREFUSED' || dbError.message?.includes('timeout')) {
          throw dbError; // Let retry logic handle it
        }
        
        // For other errors, return error response
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
        details: error.message 
      },
      { status: 500 }
    );
  }
}

// Helper function to award reward points with retry
async function awardRewardPointsWithRetry(order) {
  if (!INTERNAL_REWARDS_TOKEN) {
    console.warn('Skipping reward points award: missing internal rewards token');
    return { skipped: true };
  }

  return retrySquareApi(async () => {
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/rewards/add-points`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${INTERNAL_REWARDS_TOKEN}`
      },
      body: JSON.stringify({
        email: order.customerEmail,
        points: order.rewardPointsEarned,
        activityType: 'purchase',
        activityData: {
          orderId: order.id,
          items: order.items.map(item => ({ 
            id: item.id, 
            name: item.name, 
            category: item.category 
          })),
          total: order.total
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`Reward points API returned ${response.status}`);
    }
    
    return response.json();
  });
}
