
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { sendSMS } from '@/lib/sms';
import { SMS_TEMPLATES } from '@/lib/message-templates';
import { CRON_SECRET } from '@/lib/auth-config';

// SECURITY FIX: CRON_SECRET is now imported from centralized auth-config.ts

/**
 * Day-Before Pickup Reminder Cron Job
 * 
 * Schedule: Fridays at 6:00 PM
 * Purpose: Send reminder SMS to all customers with Saturday pickup orders
 * 
 * Setup in cron service (e.g., cron-job.org or Vercel Cron):
 * - URL: https://your-domain.com/api/cron/pickup-reminders
 * - Schedule: 0 18 * * 5 (Fridays at 6 PM)
 * - Method: POST
 * - Header: Authorization: Bearer YOUR_CRON_SECRET
 */

export async function POST(request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || authHeader !== `Bearer ${CRON_SECRET}`) {
      console.warn('⚠️ Unauthorized cron job attempt');
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    debug('📅 [CRON] Day-before pickup reminders job started');

    const { db } = await connectToDatabase();
    
    // Get current date info
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 5 = Friday
    
    // Calculate next Saturday
    const daysUntilSaturday = (6 - dayOfWeek + 7) % 7 || 7;
    const nextSaturday = new Date(now);
    nextSaturday.setDate(now.getDate() + daysUntilSaturday);
    nextSaturday.setHours(0, 0, 0, 0);
    
    const dayAfterSaturday = new Date(nextSaturday);
    dayAfterSaturday.setDate(nextSaturday.getDate() + 1);
    
    debug('📅 Looking for pickup orders for:', nextSaturday.toDateString());
    
    // Find all pickup orders scheduled for next Saturday (using pickupDate, not createdAt)
    const pickupOrders = await db.collection('orders').find({
      'fulfillment.type': { $in: ['pickup_market', 'pickup_dunwoody', 'pickup_browns_mill'] },
      status: { $in: ['pending', 'confirmed', 'preparing'] }, // Not completed yet
      $or: [
        // New orders with pickupDate field
        { 'fulfillment.pickupDate': { $gte: nextSaturday.toISOString(), $lt: dayAfterSaturday.toISOString() } },
        // Legacy orders: fallback to createdAt within last 7 days (assumes next Saturday)
        { 
          'fulfillment.pickupDate': { $exists: false },
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      ]
    }).toArray();
    
    debug(`📦 Found ${pickupOrders.length} pickup orders to remind`);
    
    const results = {
      total: pickupOrders.length,
      sent: 0,
      failed: 0,
      errors: []
    };
    
    // Send reminders
    for (const order of pickupOrders) {
      try {
        const isSerenbe = order.fulfillment.type === 'pickup_market';
        const location = isSerenbe ? 'Serenbe Farmers Market' : 'DHA Dunwoody Farmers Market';
        const hours = isSerenbe ? '9:00 AM - 1:00 PM' : '9:00 AM - 12:00 PM';
        const readyBy = '9:30 AM';
        
        const message = SMS_TEMPLATES.PICKUP_DAY_BEFORE_REMINDER({
          customerName: order.customer.name.split(' ')[0], // First name only
          orderNumber: order.orderNumber,
          location,
          hours,
          readyBy
        });
        
        await sendSMS(order.customer.phone, message);
        
        // Log reminder sent
        await db.collection('sms_logs').insertOne({
          orderId: order.id,
          orderNumber: order.orderNumber,
          phone: order.customer.phone,
          type: 'pickup_day_before_reminder',
          sentAt: new Date(),
          message
        });
        
        results.sent++;
        debug(`✅ Reminder sent: ${order.orderNumber} → ${order.customer.phone}`);
        
      } catch (smsError) {
        results.failed++;
        results.errors.push({
          orderId: order.id,
          error: smsError.message
        });
        console.error(`❌ Failed to send reminder for ${order.orderNumber}:`, smsError.message);
      }
    }
    
    debug('📊 Day-before reminders completed:', results);
    
    return NextResponse.json({
      success: true,
      message: 'Pickup day-before reminders processed',
      results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Pickup reminders cron job error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process reminders',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check cron job status
export async function GET(request) {
  return NextResponse.json({
    service: 'Pickup Day-Before Reminders Cron',
    status: 'active',
    schedule: 'Fridays at 6:00 PM',
    description: 'Sends SMS reminders to customers with Saturday pickup orders',
    endpoint: '/api/cron/pickup-reminders',
    method: 'POST',
    authentication: 'Bearer token required',
    timestamp: new Date().toISOString()
  });
}
