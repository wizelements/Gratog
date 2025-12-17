
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { sendSMS } from '@/lib/sms';
import { SMS_TEMPLATES } from '@/lib/message-templates';

const CRON_SECRET = process.env.CRON_SECRET || 'cron-secret-taste-of-gratitude-2024';

/**
 * Morning-Of Pickup Reminder Cron Job
 * 
 * Schedule: Saturdays at 8:30 AM
 * Purpose: Send "order ready!" SMS to all customers with today's pickup orders
 * 
 * Setup in cron service (e.g., cron-job.org or Vercel Cron):
 * - URL: https://your-domain.com/api/cron/morning-reminders
 * - Schedule: 30 8 * * 6 (Saturdays at 8:30 AM)
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

    debug('☀️ [CRON] Morning-of pickup reminders job started');

    const { db } = await connectToDatabase();
    
    // Get today's date
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    debug('📅 Looking for pickup orders for TODAY:', today.toDateString());
    
    // Find all pickup orders for today
    const pickupOrders = await db.collection('orders').find({
      'fulfillment.type': { $in: ['pickup_market', 'pickup_browns_mill'] },
      status: { $in: ['pending', 'confirmed', 'preparing', 'ready'] }, // Not picked up yet
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days
    }).toArray();
    
    debug(`📦 Found ${pickupOrders.length} pickup orders for today`);
    
    const results = {
      total: pickupOrders.length,
      sent: 0,
      failed: 0,
      errors: []
    };
    
    // Send morning reminders
    for (const order of pickupOrders) {
      try {
        const isSerenbe = order.fulfillment.type === 'pickup_market';
        const location = isSerenbe ? 'Serenbe Farmers Market (Booth #12)' : 'Browns Mill Community';
        const hours = isSerenbe ? '9:00 AM - 1:00 PM' : '3:00 PM - 6:00 PM';
        
        const message = SMS_TEMPLATES.PICKUP_MORNING_REMINDER({
          customerName: order.customer.name.split(' ')[0], // First name only
          orderNumber: order.orderNumber,
          location,
          hours
        });
        
        await sendSMS(order.customer.phone, message);
        
        // Log reminder sent
        await db.collection('sms_logs').insertOne({
          orderId: order.id,
          orderNumber: order.orderNumber,
          phone: order.customer.phone,
          type: 'pickup_morning_reminder',
          sentAt: new Date(),
          message
        });
        
        results.sent++;
        debug(`✅ Morning reminder sent: ${order.orderNumber} → ${order.customer.phone}`);
        
      } catch (smsError) {
        results.failed++;
        results.errors.push({
          orderId: order.id,
          error: smsError.message
        });
        console.error(`❌ Failed to send morning reminder for ${order.orderNumber}:`, smsError.message);
      }
    }
    
    debug('📊 Morning reminders completed:', results);
    
    return NextResponse.json({
      success: true,
      message: 'Morning pickup reminders processed',
      results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Morning reminders cron job error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process morning reminders',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check cron job status
export async function GET(request) {
  return NextResponse.json({
    service: 'Pickup Morning Reminders Cron',
    status: 'active',
    schedule: 'Saturdays at 8:30 AM',
    description: 'Sends "order ready!" SMS to customers with today\'s pickup orders',
    endpoint: '/api/cron/morning-reminders',
    method: 'POST',
    authentication: 'Bearer token required',
    timestamp: new Date().toISOString()
  });
}
