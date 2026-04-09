import { logger } from '@/lib/logger';
import { 
  checkReturnEligibility, 
  createReturnRequest,
  getReturnStatus
} from '@/lib/returns';
import { RateLimit } from '@/lib/redis';
import { connectToDatabase } from '@/lib/db-optimized';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/returns/create
 * Create a new return request
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!RateLimit.check(`returns_create:${clientIp}`, 10, 60 * 60)) {
      return NextResponse.json(
        { error: 'Too many return requests. Please try again later.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const {
      orderId,
      orderNumber,
      customerEmail,
      customerName,
      customerPhone,
      items,
      refundMethod,
      customerNotes
    } = body;

    // Validate required fields
    if (!orderId || !customerEmail || !customerName || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, customerEmail, customerName, items' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate items
    for (const item of items) {
      if (!item.productId || !item.productName || !item.quantity || !item.reason || !item.condition) {
        return NextResponse.json(
          { error: 'Each item must have productId, productName, quantity, reason, and condition' },
          { status: 400 }
        );
      }
    }

    // Validate refund method
    if (!refundMethod || !['original_payment', 'store_credit'].includes(refundMethod)) {
      return NextResponse.json(
        { error: 'Invalid refund method. Must be original_payment or store_credit' },
        { status: 400 }
      );
    }

    // Check eligibility first
    const eligibility = await checkReturnEligibility(orderId, customerEmail);
    if (!eligibility.eligible) {
      return NextResponse.json(
        { error: eligibility.reason },
        { status: 403 }
      );
    }

    // Create return request
    const result = await createReturnRequest({
      orderId,
      orderNumber: orderNumber || orderId,
      customerEmail,
      customerName,
      customerPhone,
      items,
      refundMethod,
      customerNotes
    });

    if (result.success) {
      logger.info('Returns', 'Return request created via API', { 
        returnId: result.returnId, 
        orderId,
        email: customerEmail 
      });

      return NextResponse.json({
        success: true,
        returnId: result.returnId,
        message: 'Return request submitted successfully',
        trackUrl: `/returns/${result.returnId}`
      });
    } else {
      logger.warn('Returns', 'Failed to create return request', { 
        orderId, 
        error: result.error 
      });

      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    logger.error('Returns', 'Error in create return endpoint', { error });
    return NextResponse.json(
      { error: 'Failed to create return request' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/returns
 * Get returns (admin) or check return status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const returnId = searchParams.get('returnId');
    const email = searchParams.get('email');
    const orderId = searchParams.get('orderId');

    // Check eligibility
    if (orderId && email) {
      const eligibility = await checkReturnEligibility(orderId, email);
      return NextResponse.json({
        success: true,
        eligible: eligibility.eligible,
        reason: eligibility.reason,
        daysSinceDelivery: eligibility.daysSinceDelivery
      });
    }

    // Get return status
    if (returnId) {
      const returnStatus = await getReturnStatus(returnId, email || undefined);
      
      if (!returnStatus) {
        return NextResponse.json(
          { error: 'Return not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        return: returnStatus
      });
    }

    // Admin: Get all returns with filters
    const { db } = await connectToDatabase();
    
    const status = searchParams.get('status');
    const query: any = {};
    
    if (status) {
      query.status = status;
    }

    const returns = await db.collection('returns')
      .find(query)
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    return NextResponse.json({
      success: true,
      returns: returns.map(r => ({
        returnId: r.returnId,
        orderId: r.orderId,
        orderNumber: r.orderNumber,
        customerEmail: r.customerEmail,
        customerName: r.customerName,
        status: r.status,
        totalRefundAmount: r.totalRefundAmount,
        refundMethod: r.refundMethod,
        requestedAt: r.requestedAt
      }))
    });
  } catch (error) {
    logger.error('Returns', 'Error in get returns endpoint', { error });
    return NextResponse.json(
      { error: 'Failed to fetch returns' },
      { status: 500 }
    );
  }
}
