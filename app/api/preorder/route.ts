/**
 * Preorder API route
 * POST /api/preorder
 * Creates a new preorder and notifies Square team
 */

import { NextResponse } from 'next/server';
import { generateWaitlistNumber, generatePreorderNumber } from '@/lib/preorder/waitlist';
import { notifySquareTeam } from '@/lib/preorder/square-notifications';
import { createLogger } from '@/lib/logger';
import { sanitizeObject } from '@/lib/validation/sanitize';
import { validateCustomerData } from '@/lib/validation/customer';

const logger = createLogger('PreorderAPI');

// Preorder minimums
const PREORDER_MINIMUMS = {
  serenbe: 15, // $15 minimum at Serenbe
  dunwoody: 15, // $15 minimum at Dunwoody
  'sandy-springs': 15,
};

const MARKET_SCHEDULE = {
  'serenbe': { day: 'Saturday', hours: '9:00 AM - 1:00 PM', name: 'Serenbe Farmers Market' },
  'dunwoody': { day: 'Saturday', hours: '9:00 AM - 12:00 PM', name: 'Dunwoody Farmers Market' },
  'sandy-springs': { day: 'Saturday', hours: '8:00 AM - 12:00 PM', name: 'Sandy Springs Farmers Market' },
};

/**
 * Get next market date
 */
function getNextMarketDate(dayName) {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const targetDay = days.indexOf(dayName);
  const today = new Date();
  const currentDay = today.getDay();
  
  let daysUntil = targetDay - currentDay;
  if (daysUntil <= 0) {
    daysUntil += 7; // Next week
  }
  
  const nextDate = new Date(today);
  nextDate.setDate(today.getDate() + daysUntil);
  return nextDate;
}

export async function POST(request) {
  try {
    let data = await request.json();
    
    // Sanitize input
    data = sanitizeObject(data, { preventSQL: true });
    
    logger.info('Preorder request received', { 
      customerName: data.customer?.name,
      marketId: data.marketId,
      itemCount: data.items?.length 
    });
    
    // Validation
    if (!data.marketId || !MARKET_SCHEDULE[data.marketId]) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing market selection' },
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
    
    // Calculate totals
    const subtotal = data.items.reduce((sum, item) => {
      return sum + ((item.price || 0) * (item.quantity || 1));
    }, 0);
    
    // Check minimum order
    const minimum = PREORDER_MINIMUMS[data.marketId] || 15;
    if (subtotal < minimum) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Preorders require a $${minimum} minimum. Current total: $${subtotal.toFixed(2)}.`,
          code: 'MINIMUM_NOT_MET',
          minimum,
          current: subtotal
        },
        { status: 400 }
      );
    }
    
    // Get market info
    const market = MARKET_SCHEDULE[data.marketId];
    const pickupDate = getNextMarketDate(market.day);
    const pickupDateStr = pickupDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric'
    });
    
    // Generate waitlist number
    const waitlistInfo = generateWaitlistNumber(data.marketId, pickupDate);
    
    // Create preorder
    const preorder = {
      orderNumber: generatePreorderNumber(),
      waitlistNumber: waitlistInfo.waitlistNumber,
      customer: {
        name: data.customer.name,
        email: data.customer.email,
        phone: data.customer.phone,
      },
      items: data.items.map(item => ({
        productId: item.productId || item.id,
        name: item.name,
        quantity: item.quantity || 1,
        price: item.price || 0,
        size: item.size || null,
        imageUrl: item.imageUrl || null,
      })),
      pickupLocation: market.name,
      pickupDate: pickupDateStr,
      pickupDay: market.day,
      pickupHours: market.hours,
      marketId: data.marketId,
      subtotal,
      notes: data.notes || null,
      status: 'pending', // pending, confirmed, ready, completed, cancelled
      createdAt: new Date().toISOString(),
    };
    
    logger.info('Preorder created', { 
      orderNumber: preorder.orderNumber,
      waitlistNumber: preorder.waitlistNumber,
      marketId: data.marketId
    });
    
    // Notify Square team (non-blocking)
    notifySquareTeam(preorder).catch(err => {
      logger.error('Failed to notify Square team', { 
        error: err.message,
        orderNumber: preorder.orderNumber 
      });
    });
    
    return NextResponse.json({
      success: true,
      preorder: {
        orderNumber: preorder.orderNumber,
        waitlistNumber: preorder.waitlistNumber,
        pickupLocation: preorder.pickupLocation,
        pickupDate: preorder.pickupDate,
        pickupHours: preorder.pickupHours,
        estimatedTime: getEstimatedWaitTime(waitlistInfo.counter),
      }
    });
    
  } catch (error) {
    logger.error('Preorder creation error', { error: error.message });
    
    return NextResponse.json({
      success: false,
      error: 'Failed to create preorder. Please try again.',
      details: error.message
    }, { status: 500 });
  }
}

/**
 * Get preorder status
 * GET /api/preorder?orderNumber=PRE-xxx
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderNumber = searchParams.get('orderNumber');
    
    if (!orderNumber) {
      return NextResponse.json(
        { success: false, error: 'Order number is required' },
        { status: 400 }
      );
    }
    
    // In a real implementation, fetch from database
    // For now, return a mock response
    logger.info('Preorder status check', { orderNumber });
    
    return NextResponse.json({
      success: true,
      preorder: {
        orderNumber,
        status: 'pending',
        message: 'Your preorder has been received and is awaiting confirmation.',
      }
    });
    
  } catch (error) {
    logger.error('Preorder status error', { error: error.message });
    
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve preorder status'
    }, { status: 500 });
  }
}

function getEstimatedWaitTime(position) {
  const minutesPerCustomer = 2.5;
  const estimatedMinutes = Math.ceil(position * minutesPerCustomer);
  
  if (estimatedMinutes < 60) {
    return `${estimatedMinutes} min`;
  }
  
  const hours = Math.floor(estimatedMinutes / 60);
  const mins = estimatedMinutes % 60;
  return `${hours}h ${mins}m`;
}
