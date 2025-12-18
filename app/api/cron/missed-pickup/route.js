
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { sendSMS } from '@/lib/sms';
import { SMS_TEMPLATES } from '@/lib/message-templates';

const CRON_SECRET = process.env.CRON_SECRET || 'cron-secret-taste-of-gratitude-2024';

/**
 * Missed Pickup Follow-up Cron Job
 * 
 * Schedule: Saturdays at 7:00 PM (after market closes)
 * Purpose: Send follow-up SMS to customers who didn't pick up their orders
 * 
 * Setup in cron service (e.g., cron-job.org or Vercel Cron):
 * - URL: https://your-domain.com/api/cron/missed-pickup
 * - Schedule: 0 19 * * 6 (Saturdays at 7 PM)
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

    console.log('🔔 [CRON] Missed pickup follow-up job started');

    const { db } = await connectToDatabase();
    
    // Get today's date range
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    console.log('📅 Looking for missed pickup orders for TODAY:', today.toDateString());
    
    // Find all pickup orders that were scheduled for today but NOT picked up
    const missedOrders = await db.collection('orders').find({
      'fulfillment.type': { $in: ['pickup_market', 'pickup_browns_mill'] },
      // Orders that should have been picked up today but weren't
      status: { $in: ['pending', 'confirmed', 'preparing', 'ready'] },
      $or: [
        // New orders with pickupDate field
        { 'fulfillment.pickupDate': { $gte: today.toISOString(), $lt: tomorrow.toISOString() } },
        // Legacy orders: fallback to createdAt within last 7 days
        { 
          'fulfillment.pickupDate': { $exists: false },
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }
      ]
    }).toArray();
    
    console.log(`📦 Found ${missedOrders.length} missed pickup orders`);
    
    const results = {
      total: missedOrders.length,
      sent: 0,
      failed: 0,
      errors: []
    };
    
    // Send missed pickup follow-up
    for (const order of missedOrders) {
      try {
        const firstName = order.customer.name.split(' ')[0];
        
        const message = SMS_TEMPLATES.MISSED_PICKUP({
          customerName: firstName,
          orderNumber: order.orderNumber
        });
        
        await sendSMS(order.customer.phone, message);
        
        // Update order status to missed_pickup
        await db.collection('orders').updateOne(
          { _id: order._id },
          { 
            $set: { 
              status: 'missed_pickup',
              missedPickupAt: new Date(),
              updatedAt: new Date()
            }
          }
        );
        
        // Log notification sent
        await db.collection('sms_logs').insertOne({
          orderId: order.id,
          orderNumber: order.orderNumber,
          phone: order.customer.phone,
          type: 'missed_pickup_followup',
          sentAt: new Date(),
          message
        });
        
        results.sent++;
        console.log(`✅ Missed pickup SMS sent: ${order.orderNumber} → ${order.customer.phone}`);
        
      } catch (smsError) {
        results.failed++;
        results.errors.push({
          orderId: order.id,
          error: smsError.message
        });
        console.error(`❌ Failed to send missed pickup notification for ${order.orderNumber}:`, smsError.message);
      }
    }
    
    console.log('📊 Missed pickup follow-up completed:', results);
    
    return NextResponse.json({
      success: true,
      message: 'Missed pickup follow-up processed',
      results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Missed pickup cron job error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process missed pickup follow-up',
        details: error.message
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check cron job status
export async function GET(request) {
  return NextResponse.json({
    service: 'Missed Pickup Follow-up Cron',
    status: 'active',
    schedule: 'Saturdays at 7:00 PM',
    description: 'Sends follow-up SMS to customers who missed their pickup and updates order status',
    endpoint: '/api/cron/missed-pickup',
    method: 'POST',
    authentication: 'Bearer token required',
    timestamp: new Date().toISOString()
  });
}
