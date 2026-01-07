import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-session';
import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';

/**
 * POST /api/admin/setup-indexes - Create database indexes for email system
 * Requires admin authentication
 */
export async function POST(request) {
  try {
    await requireAdmin(request);

    const { db } = await connectToDatabase();
    
    const results = [];

    // Campaigns collection
    await db.collection('campaigns').createIndex({ id: 1 }, { unique: true });
    await db.collection('campaigns').createIndex({ status: 1 });
    await db.collection('campaigns').createIndex({ createdBy: 1 });
    await db.collection('campaigns').createIndex({ createdAt: -1 });
    await db.collection('campaigns').createIndex({ scheduledFor: 1 }, { sparse: true });
    await db.collection('campaigns').createIndex({ status: 1, scheduledFor: 1 });
    await db.collection('campaigns').createIndex({ status: 1, lastAttemptAt: 1 });
    results.push('campaigns: 7 indexes');

    // Email sends collection
    await db.collection('email_sends').createIndex({ id: 1 }, { unique: true });
    await db.collection('email_sends').createIndex({ campaignId: 1 });
    await db.collection('email_sends').createIndex({ userId: 1 });
    await db.collection('email_sends').createIndex({ email: 1 });
    await db.collection('email_sends').createIndex({ status: 1 });
    await db.collection('email_sends').createIndex({ resendId: 1 }, { sparse: true });
    await db.collection('email_sends').createIndex({ sentAt: -1 });
    results.push('email_sends: 7 indexes');

    // Email logs collection
    await db.collection('email_logs').createIndex({ id: 1 }, { unique: true });
    await db.collection('email_logs').createIndex({ to: 1 });
    await db.collection('email_logs').createIndex({ userId: 1 });
    await db.collection('email_logs').createIndex({ emailType: 1 });
    await db.collection('email_logs').createIndex({ status: 1 });
    await db.collection('email_logs').createIndex({ resendId: 1 }, { sparse: true });
    await db.collection('email_logs').createIndex({ createdAt: -1 });
    results.push('email_logs: 7 indexes');

    // Scheduled emails collection  
    await db.collection('scheduled_emails').createIndex({ status: 1, scheduledFor: 1 });
    await db.collection('scheduled_emails').createIndex({ 'recipient.email': 1 });
    await db.collection('scheduled_emails').createIndex({ quizId: 1 }, { sparse: true });
    await db.collection('scheduled_emails').createIndex({ createdAt: -1 });
    results.push('scheduled_emails: 4 indexes');

    // Users collection (email preferences)
    await db.collection('users').createIndex({ 'emailPreferences.marketing': 1 });
    await db.collection('users').createIndex({ email: 1 });
    results.push('users: 2 indexes');

    // Orders collection (for segmentation)
    await db.collection('orders').createIndex({ userId: 1 });
    await db.collection('orders').createIndex({ createdAt: -1 });
    await db.collection('orders').createIndex({ status: 1 });
    results.push('orders: 3 indexes');

    logger.info('API', 'Database indexes created successfully');

    return NextResponse.json({
      success: true,
      message: 'All email system indexes created successfully',
      indexes: results,
      totalCollections: 6,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    if (error.name === 'AdminAuthError') {
      return NextResponse.json({ error: error.message }, { status: error.statusCode || 401 });
    }
    logger.error('API', 'Setup indexes error:', error);
    return NextResponse.json({ 
      error: 'Failed to create indexes',
      details: error.message 
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    endpoint: '/api/admin/setup-indexes',
    method: 'POST',
    description: 'Creates database indexes for email system (campaigns, email_sends, etc.)',
    requires: 'Admin authentication'
  });
}
