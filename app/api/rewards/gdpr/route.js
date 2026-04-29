/**
 * GDPR Compliance Endpoints
 * 
 * Provides:
 * - Data export (Right to Portability)
 * - Data deletion (Right to be Forgotten)
 * - Consent management
 * 
 * SECURITY:
 * - Requires authentication
 * - User can only access own data
 * - All actions are audit logged
 */

export const dynamic = 'force-dynamic';

import { connectToDatabase } from '@/lib/db-optimized';
import {
  verifyRequestAuthentication,
  createErrorResponse,
  createSecureResponse,
  generateIdempotencyKey
} from '@/lib/rewards-security';
import { AuditLogger, EventCategory, LogLevel } from '@/lib/rewards-audit-logger';

/**
 * GET - Export user's reward data (Right to Portability)
 */
export async function GET(request) {
  const correlationId = AuditLogger.setCorrelationId();
  
  try {
    // ====================================================================
    // 1. AUTHENTICATION
    // ====================================================================
    const auth = await verifyRequestAuthentication(request);
    if (!auth.authenticated) {
      await AuditLogger.logAuthFailed(null, 'no_session');
      return createErrorResponse('Unauthorized', 401);
    }

    const userEmail = auth.userEmail;
    await AuditLogger.log(LogLevel.INFO, EventCategory.PASSPORT, 'gdpr_export_requested', {
      email: userEmail
    });

    // ====================================================================
    // 2. GATHER ALL USER DATA
    // ====================================================================
    const { db } = await connectToDatabase();

    // Get passport data
    const passport = await db.collection('passports').findOne({
      customerEmail: userEmail
    });

    // Get audit logs for this user (hashed)
    const emailHash = AuditLogger.hashEmail(userEmail);
    const auditLogs = await db.collection('audit_logs')
      .find({ 'data.emailHash': emailHash })
      .sort({ timestamp: -1 })
      .limit(1000)
      .toArray();

    // Get any pending activities
    const pendingActivities = await db.collection('pending_activities')
      .find({ email: userEmail })
      .toArray();

    // ====================================================================
    // 3. FORMAT EXPORT DATA
    // ====================================================================
    const exportData = {
      exportId: generateIdempotencyKey(),
      exportedAt: new Date().toISOString(),
      requestedBy: userEmail,
      dataCategories: [],
      data: {}
    };

    // Passport data
    if (passport) {
      exportData.dataCategories.push('passport');
      exportData.data.passport = {
        email: passport.customerEmail,
        name: passport.customerName,
        level: passport.level,
        totalStamps: passport.totalStamps,
        xpPoints: passport.xpPoints,
        createdAt: passport.createdAt,
        lastActivity: passport.lastActivity,
        stamps: passport.stamps.map(s => ({
          id: s.id,
          marketName: s.marketName,
          activityType: s.activityType,
          timestamp: s.timestamp,
          xpValue: s.xpValue
        })),
        vouchers: passport.vouchers.map(v => ({
          id: v.id,
          type: v.type,
          title: v.title,
          description: v.description,
          code: v.code,
          awardedAt: v.awardedAt,
          used: v.used,
          usedAt: v.usedAt,
          expiresAt: v.expiresAt
        }))
      };
    }

    // Activity logs (sanitized)
    if (auditLogs.length > 0) {
      exportData.dataCategories.push('activity_logs');
      exportData.data.activityLogs = auditLogs.map(log => ({
        event: log.event,
        category: log.category,
        timestamp: log.timestamp,
        data: log.data
      }));
    }

    // Pending activities
    if (pendingActivities.length > 0) {
      exportData.dataCategories.push('pending_activities');
      exportData.data.pendingActivities = pendingActivities;
    }

    await AuditLogger.log(LogLevel.INFO, EventCategory.PASSPORT, 'gdpr_export_completed', {
      email: userEmail,
      categories: exportData.dataCategories,
      exportId: exportData.exportId
    });

    // ====================================================================
    // 4. RETURN EXPORT
    // ====================================================================
    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="rewards-export-${exportData.exportId}.json"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });

  } catch (error) {
    await AuditLogger.logError(error, { action: 'gdpr_export' });
    return createErrorResponse('Failed to export data', 500, error);
  }
}

/**
 * DELETE - Delete user's reward data (Right to be Forgotten)
 */
export async function DELETE(request) {
  const correlationId = AuditLogger.setCorrelationId();
  
  try {
    // ====================================================================
    // 1. AUTHENTICATION
    // ====================================================================
    const auth = await verifyRequestAuthentication(request);
    if (!auth.authenticated) {
      await AuditLogger.logAuthFailed(null, 'no_session');
      return createErrorResponse('Unauthorized', 401);
    }

    const userEmail = auth.userEmail;

    // ====================================================================
    // 2. PARSE REQUEST
    // ====================================================================
    const body = await request.json().catch(() => ({}));
    const { confirmEmail, reason } = body;

    // Require email confirmation for deletion
    if (confirmEmail !== userEmail) {
      return createErrorResponse(
        'Please confirm your email address to delete data',
        400
      );
    }

    await AuditLogger.log(LogLevel.SECURITY, EventCategory.PASSPORT, 'gdpr_deletion_requested', {
      email: userEmail,
      reason: reason || 'not_specified'
    });

    // ====================================================================
    // 3. DELETE ALL USER DATA
    // ====================================================================
    const { db } = await connectToDatabase();
    const deletionResults = {};

    // Delete passport
    const passportResult = await db.collection('passports').deleteOne({
      customerEmail: userEmail
    });
    deletionResults.passport = passportResult.deletedCount;

    // Delete from customer_passports (enhanced rewards)
    const enhancedResult = await db.collection('customer_passports').deleteOne({
      email: userEmail
    });
    deletionResults.enhancedPassport = enhancedResult.deletedCount;

    // Delete pending activities
    const pendingResult = await db.collection('pending_activities').deleteMany({
      email: userEmail
    });
    deletionResults.pendingActivities = pendingResult.deletedCount;

    // Anonymize audit logs (keep for compliance, but remove identifying info)
    const emailHash = AuditLogger.hashEmail(userEmail);
    const auditResult = await db.collection('audit_logs').updateMany(
      { 'data.emailHash': emailHash },
      {
        $set: {
          'data.emailHash': 'DELETED',
          'data.deleted': true,
          'data.deletedAt': new Date()
        }
      }
    );
    deletionResults.auditLogsAnonymized = auditResult.modifiedCount;

    // Delete fraud fingerprints
    const fingerprintResult = await db.collection('fraud_fingerprints').deleteMany({
      email: userEmail
    });
    deletionResults.fraudFingerprints = fingerprintResult.deletedCount;

    // Log deletion completion
    await AuditLogger.log(LogLevel.SECURITY, EventCategory.PASSPORT, 'gdpr_deletion_completed', {
      email: userEmail,
      deletionResults,
      correlationId
    });

    // ====================================================================
    // 4. RETURN CONFIRMATION
    // ====================================================================
    return createSecureResponse({
      success: true,
      message: 'Your data has been deleted',
      deletionId: correlationId,
      deletedAt: new Date().toISOString(),
      summary: {
        passportDeleted: deletionResults.passport > 0,
        activityLogsAnonymized: deletionResults.auditLogsAnonymized,
        note: 'Some anonymized records may be retained for legal compliance purposes'
      }
    });

  } catch (error) {
    await AuditLogger.logError(error, { action: 'gdpr_deletion' });
    return createErrorResponse('Failed to delete data', 500, error);
  }
}

/**
 * POST - Update consent preferences
 */
export async function POST(request) {
  const correlationId = AuditLogger.setCorrelationId();
  
  try {
    // ====================================================================
    // 1. AUTHENTICATION
    // ====================================================================
    const auth = await verifyRequestAuthentication(request);
    if (!auth.authenticated) {
      return createErrorResponse('Unauthorized', 401);
    }

    const userEmail = auth.userEmail;

    // ====================================================================
    // 2. PARSE CONSENT PREFERENCES
    // ====================================================================
    const body = await request.json();
    const {
      marketingEmails = false,
      analyticsTracking = true,
      thirdPartySharing = false
    } = body;

    // ====================================================================
    // 3. UPDATE CONSENT RECORD
    // ====================================================================
    const { db } = await connectToDatabase();

    const consentRecord = {
      email: userEmail,
      preferences: {
        marketingEmails,
        analyticsTracking,
        thirdPartySharing
      },
      updatedAt: new Date(),
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown',
      userAgent: request.headers.get('user-agent')?.substring(0, 200)
    };

    await db.collection('consent_records').updateOne(
      { email: userEmail },
      {
        $set: consentRecord,
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    );

    await AuditLogger.log(LogLevel.INFO, EventCategory.PASSPORT, 'consent_updated', {
      email: userEmail,
      preferences: consentRecord.preferences
    });

    // ====================================================================
    // 4. RETURN CONFIRMATION
    // ====================================================================
    return createSecureResponse({
      success: true,
      message: 'Consent preferences updated',
      preferences: consentRecord.preferences,
      updatedAt: consentRecord.updatedAt
    });

  } catch (error) {
    await AuditLogger.logError(error, { action: 'consent_update' });
    return createErrorResponse('Failed to update consent', 500, error);
  }
}
