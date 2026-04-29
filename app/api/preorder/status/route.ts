/**
 * Preorder status API route
 * GET /api/preorder/status
 * 
 * Gets the current status and position of a preorder
 */

import { NextResponse } from 'next/server';
import { getWaitlistPosition, parseWaitlistNumber } from '@/lib/preorder/waitlist';
import { createLogger } from '@/lib/logger';

const logger = createLogger('PreorderStatusAPI');

// Mock database - in production, use real database
const preorderDatabase = new Map();

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderNumber = searchParams.get('orderNumber');
    const waitlistNumber = searchParams.get('waitlistNumber');
    const phone = searchParams.get('phone');
    
    if (!orderNumber && !waitlistNumber && !phone) {
      return NextResponse.json(
        { success: false, error: 'Order number, waitlist number, or phone required' },
        { status: 400 }
      );
    }
    
    // Look up preorder (mock - would query database in production)
    let preorder = null;
    
    if (orderNumber) {
      preorder = preorderDatabase.get(orderNumber);
    } else if (waitlistNumber) {
      // Find by waitlist number
      for (const [, value] of preorderDatabase) {
        if (value.waitlistNumber === waitlistNumber) {
          preorder = value;
          break;
        }
      }
    } else if (phone) {
      // Find by phone (last preorder for this phone)
      const matches = [];
      for (const [, value] of preorderDatabase) {
        if (value.customer?.phone === phone) {
          matches.push(value);
        }
      }
      if (matches.length > 0) {
        // Sort by date, get most recent
        matches.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        preorder = matches[0];
      }
    }
    
    if (!preorder) {
      // Return mock data for demo
      return NextResponse.json({
        success: true,
        preorder: {
          orderNumber: orderNumber || 'PRE-XXXXX',
          waitlistNumber: waitlistNumber || 'S-2801',
          status: 'confirmed',
          statusMessage: 'Your preorder is confirmed!',
          position: 5,
          estimatedReadyTime: '9:15 AM',
          pickupLocation: 'Serenbe Farmers Market',
          pickupHours: 'Saturday 9:00 AM - 1:00 PM',
          items: [],
          total: 0,
          customer: { name: '', phone: '' },
          createdAt: new Date().toISOString(),
        },
      });
    }
    
    // Calculate current position
    const parsed = parseWaitlistNumber(preorder.waitlistNumber);
    const currentPosition = parsed 
      ? getWaitlistPosition(parsed.marketId, new Date()) - parsed.counter + 1
      : null;
    
    return NextResponse.json({
      success: true,
      preorder: {
        orderNumber: preorder.orderNumber,
        waitlistNumber: preorder.waitlistNumber,
        status: preorder.status,
        statusMessage: getStatusMessage(preorder.status),
        position: currentPosition,
        estimatedReadyTime: calculateReadyTime(currentPosition),
        pickupLocation: preorder.pickupLocation,
        pickupHours: preorder.pickupHours,
        items: preorder.items,
        total: preorder.subtotal,
        customer: preorder.customer,
        createdAt: preorder.createdAt,
      },
    });
    
  } catch (error) {
    logger.error('Preorder status error', { error: error.message });
    
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve preorder status'
    }, { status: 500 });
  }
}

/**
 * Update preorder status (staff only)
 * POST /api/preorder/status
 */
export async function POST(request) {
  try {
    const data = await request.json();
    const { orderNumber, status, staffKey } = data;
    
    // Simple staff authentication
    if (staffKey !== process.env.PREORDER_STAFF_KEY) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const preorder = preorderDatabase.get(orderNumber);
    if (!preorder) {
      return NextResponse.json(
        { success: false, error: 'Preorder not found' },
        { status: 404 }
      );
    }
    
    preorder.status = status;
    preorder.updatedAt = new Date().toISOString();
    preorderDatabase.set(orderNumber, preorder);
    
    logger.info('Preorder status updated', { 
      orderNumber, 
      status,
      updatedBy: 'staff' 
    });
    
    return NextResponse.json({
      success: true,
      preorder: {
        orderNumber: preorder.orderNumber,
        status: preorder.status,
      }
    });
    
  } catch (error) {
    logger.error('Preorder status update error', { error: error.message });
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update preorder status'
    }, { status: 500 });
  }
}

function getStatusMessage(status) {
  const messages = {
    'pending': 'Your preorder has been received and is awaiting confirmation.',
    'confirmed': 'Your preorder is confirmed! We\'ll have it ready at the market.',
    'preparing': 'Your preorder is being prepared now.',
    'ready': 'Your order is ready for pickup!',
    'completed': 'Your order has been picked up. Thank you!',
    'cancelled': 'This preorder has been cancelled.',
  };
  return messages[status] || 'Status unknown';
}

function calculateReadyTime(position) {
  if (!position) return null;
  
  const now = new Date();
  const marketOpen = new Date(now);
  marketOpen.setHours(9, 0, 0, 0);
  
  if (now < marketOpen) {
    // Market hasn't opened yet
    const minutesPerCustomer = 2.5;
    const estimatedMinutes = Math.ceil(position * minutesPerCustomer);
    const readyTime = new Date(marketOpen.getTime() + estimatedMinutes * 60000);
    return readyTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  }
  
  // Market is open - estimate from now
  const minutesPerCustomer = 2.5;
  const estimatedMinutes = Math.ceil(position * minutesPerCustomer);
  const readyTime = new Date(now.getTime() + estimatedMinutes * 60000);
  return readyTime.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
}
