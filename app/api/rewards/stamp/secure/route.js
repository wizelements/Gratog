/**
 * Secure Stamp API Endpoint
 * 
 * Features:
 * - Authentication required (NextAuth)
 * - Input validation with Zod
 * - Rate limiting
 * - Transaction-safe with idempotency
 * - CSRF protection
 * - No PII exposed
 * - Proper error handling
 */

import { NextResponse } from 'next/server';
import SecureRewardsSystem from '@/lib/rewards-secure';
import {
  verifyRequestAuthentication,
  authorizePassportAccess,
  StampRequestSchema,
  validateRequest,
  createErrorResponse,
  createSecureResponse,
  checkStampRateLimit,
  generateIdempotencyKey
} from '@/lib/rewards-security';

export async function POST(request) {
  try {
    // ====================================================================
    // 1. AUTHENTICATION
    // ====================================================================
    const auth = await verifyRequestAuthentication(request);
    if (!auth.authenticated) {
      return createErrorResponse(
        'Unauthorized - Please log in',
        401,
        new Error('No session')
      );
    }

    const userEmail = auth.userEmail;

    // ====================================================================
    // 2. INPUT VALIDATION
    // ====================================================================
    const body = await request.json();

    // Add idempotency key if not provided
    const requestData = {
      ...body,
      idempotencyKey: body.idempotencyKey || generateIdempotencyKey()
    };

    const validation = validateRequest(requestData, StampRequestSchema);
    if (!validation.valid) {
      return createErrorResponse(
        'Invalid request',
        400,
        new Error(`Validation failed: ${JSON.stringify(validation.error)}`)
      );
    }

    const { email, passportId, marketName, activityType, idempotencyKey } =
      validation.data;

    // ====================================================================
    // 3. AUTHORIZATION
    // ====================================================================
    // User can only stamp their own passport
    const stampEmail = email || userEmail;
    if (!authorizePassportAccess(userEmail, stampEmail)) {
      return createErrorResponse(
        'Forbidden - Cannot modify other users\' passports',
        403,
        new Error(`Unauthorized access attempt: ${userEmail} -> ${stampEmail}`)
      );
    }

    // ====================================================================
    // 4. RATE LIMITING
    // ====================================================================
    const rateLimit = checkStampRateLimit(userEmail, marketName);
    if (!rateLimit.allowed) {
      return createErrorResponse(
        rateLimit.error,
        429,
        new Error(`Rate limit exceeded for ${userEmail} at ${marketName}`)
      );
    }

    // ====================================================================
    // 5. GET OR CREATE PASSPORT
    // ====================================================================
    let passport = null;

    if (passportId) {
      passport = await SecureRewardsSystem.getPassportByEmail(userEmail);
      if (!passport) {
        return createErrorResponse(
          'Passport not found',
          404,
          new Error(`Passport not found for ${userEmail}`)
        );
      }
    } else {
      // Create passport if needed (with idempotency)
      passport = await SecureRewardsSystem.createPassport(
        userEmail,
        null,
        `passport_${userEmail}_${Date.now()}`
      );
    }

    // ====================================================================
    // 6. ADD STAMP (WITH TRANSACTION SAFETY)
    // ====================================================================
    const result = await SecureRewardsSystem.addStamp(
      passport._id.toString(),
      marketName,
      activityType,
      idempotencyKey
    );

    if (!result.success) {
      return createErrorResponse(
        'Failed to add stamp',
        500,
        new Error('Transaction failed')
      );
    }

    // ====================================================================
    // 7. RETURN SECURE RESPONSE (NO PII)
    // ====================================================================
    return createSecureResponse({
      success: true,
      stamp: {
        id: result.stamp.id,
        marketName: result.stamp.marketName,
        activityType: result.stamp.activityType,
        timestamp: result.stamp.timestamp,
        xpValue: result.stamp.xpValue
      },
      rewards: result.rewards.map(r => ({
        type: r.type,
        title: r.title,
        description: r.description,
        code: r.code,
        ...(r.discountPercent && { discountPercent: r.discountPercent }),
        ...(r.newLevel && { newLevel: r.newLevel }),
        expiresAt: r.expiresAt
      })),
      passport: {
        totalStamps: result.passport.totalStamps,
        xpPoints: result.passport.xpPoints,
        level: result.passport.level,
        vouchersCount: result.passport.vouchers.length
      },
      rateLimitInfo: {
        remaining: rateLimit.remainingToday,
        resetTime: new Date(Date.now() + 3600000) // 1 hour
      }
    });
  } catch (error) {
    console.error('Stamp endpoint error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date()
    });

    return createErrorResponse(
      'Internal server error',
      500,
      error
    );
  }
}

/**
 * GET endpoint for passport info (with authentication)
 */
export async function GET(request) {
  try {
    // Authentication required
    const auth = await verifyRequestAuthentication(request);
    if (!auth.authenticated) {
      return createErrorResponse('Unauthorized', 401);
    }

    const userEmail = auth.userEmail;

    // Get passport
    const passport = await SecureRewardsSystem.getPassportByEmail(userEmail);

    if (!passport) {
      return createErrorResponse('Passport not found', 404);
    }

    // Return safe response
    return createSecureResponse({
      success: true,
      passport: {
        totalStamps: passport.totalStamps,
        xpPoints: passport.xpPoints,
        level: passport.level,
        vouchersAvailable: passport.vouchers.filter(
          v => !v.used && (!v.expiresAt || v.expiresAt > new Date())
        ).length
      }
    });
  } catch (error) {
    console.error('Get passport error:', error);
    return createErrorResponse('Internal server error', 500, error);
  }
}
