import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-session';
import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';

/**
 * GET /api/admin/campaigns/diagnose - Diagnostic endpoint for campaign system
 * Helps identify configuration issues
 */
export async function GET(request) {
  try {
    const admin = await requireAdmin(request);
    
    const diagnostics = {
      timestamp: new Date().toISOString(),
      admin: { id: admin.id, email: admin.email },
      environment: {},
      database: {},
      email: {},
      issues: []
    };

    // Check environment variables
    diagnostics.environment = {
      RESEND_API_KEY: !!process.env.RESEND_API_KEY ? 'configured' : 'MISSING',
      RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || 'using default: hello@tasteofgratitude.net',
      OPENAI_API_KEY: !!process.env.OPENAI_API_KEY ? 'configured' : 'MISSING',
      MONGODB_URI: !!process.env.MONGODB_URI ? 'configured' : 'MISSING',
      DATABASE_NAME: process.env.DATABASE_NAME || process.env.DB_NAME || 'using default',
      NEXT_PUBLIC_BASE_URL: process.env.NEXT_PUBLIC_BASE_URL || 'NOT SET',
      JWT_SECRET: !!process.env.JWT_SECRET ? 'configured' : 'using fallback (insecure)'
    };

    if (!process.env.RESEND_API_KEY) {
      diagnostics.issues.push('CRITICAL: RESEND_API_KEY not configured - emails will NOT be sent');
    }
    if (!process.env.OPENAI_API_KEY) {
      diagnostics.issues.push('WARNING: OPENAI_API_KEY not configured - AI generation will fail');
    }
    if (!process.env.NEXT_PUBLIC_BASE_URL) {
      diagnostics.issues.push('WARNING: NEXT_PUBLIC_BASE_URL not set - unsubscribe links may be broken');
    }

    // Test database connection
    try {
      const { db } = await connectToDatabase();
      diagnostics.database.connected = true;
      
      // Get collection stats
      const [campaignCount, userCount, emailLogCount] = await Promise.all([
        db.collection('campaigns').countDocuments(),
        db.collection('users').countDocuments(),
        db.collection('email_logs').countDocuments()
      ]);
      
      diagnostics.database.collections = {
        campaigns: campaignCount,
        users: userCount,
        email_logs: emailLogCount
      };

      // Check for users with marketing enabled
      const marketingEnabled = await db.collection('users').countDocuments({
        $or: [
          { 'emailPreferences.marketing': true },
          { 'emailPreferences.marketing': { $exists: false } }
        ]
      });
      diagnostics.database.usersWithMarketingEnabled = marketingEnabled;

      // Get recent campaign statuses
      const recentCampaigns = await db.collection('campaigns')
        .find({}, { projection: { id: 1, name: 1, status: 1, 'stats.sent': 1, 'stats.failed': 1, lastError: 1 } })
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray();
      diagnostics.database.recentCampaigns = recentCampaigns;

      // Check for failed emails
      const recentFailures = await db.collection('email_logs')
        .find({ status: { $in: ['failed', 'mock_not_sent'] } })
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray();
      
      if (recentFailures.length > 0) {
        diagnostics.email.recentFailures = recentFailures.map(f => ({
          to: f.to,
          status: f.status,
          error: f.error,
          date: f.createdAt
        }));
        
        if (recentFailures.some(f => f.status === 'mock_not_sent')) {
          diagnostics.issues.push('WARNING: Emails are in mock mode (RESEND_API_KEY may not be set in production)');
        }
      }

      // Check email_sends for campaign issues
      const recentSends = await db.collection('email_sends')
        .find({ status: { $in: ['failed', 'not_sent', 'skipped'] } })
        .sort({ sentAt: -1 })
        .limit(10)
        .toArray();
      
      if (recentSends.length > 0) {
        const reasons = {};
        recentSends.forEach(s => {
          const reason = s.reason || s.error || 'unknown';
          reasons[reason] = (reasons[reason] || 0) + 1;
        });
        diagnostics.email.failureReasons = reasons;
        
        if (reasons['infra_error']) {
          diagnostics.issues.push('CRITICAL: Infrastructure errors detected - check database connectivity');
        }
        if (reasons['No RESEND_API_KEY - email NOT sent']) {
          diagnostics.issues.push('CRITICAL: RESEND_API_KEY not configured on server');
        }
      }

    } catch (dbError) {
      diagnostics.database.connected = false;
      diagnostics.database.error = dbError.message;
      diagnostics.issues.push(`CRITICAL: Database connection failed - ${dbError.message}`);
    }

    // Test Resend client
    try {
      const resend = (await import('@/lib/email/resend-client')).default;
      diagnostics.email.resendConfigured = !!resend;
      if (!resend) {
        diagnostics.issues.push('CRITICAL: Resend client is null - RESEND_API_KEY not set');
      }
    } catch (resendError) {
      diagnostics.email.resendError = resendError.message;
    }

    // Summary
    diagnostics.summary = {
      status: diagnostics.issues.length === 0 ? 'healthy' : 
              diagnostics.issues.some(i => i.startsWith('CRITICAL')) ? 'critical' : 'warning',
      issueCount: diagnostics.issues.length
    };

    logger.info('Admin', `Campaign diagnostics run by ${admin.email}`, {
      status: diagnostics.summary.status,
      issues: diagnostics.issues.length
    });

    return NextResponse.json(diagnostics);

  } catch (error) {
    if (error.name === 'AdminAuthError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.statusCode || 401 }
      );
    }
    logger.error('Admin', 'Campaign diagnostics error:', error);
    return NextResponse.json(
      { error: 'Diagnostics failed', details: error.message },
      { status: 500 }
    );
  }
}
