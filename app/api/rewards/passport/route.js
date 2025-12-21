import { NextResponse } from 'next/server';
import SecureRewardsSystem from '@/lib/rewards-secure';
import {
  verifyRequestAuthentication,
  PassportCreateSchema,
  validateRequest,
  createErrorResponse,
  createSecureResponse
} from '@/lib/rewards-security';

/**
 * CREATE PASSPORT - Secure Endpoint
 * 
 * SECURITY FIXES IMPLEMENTED:
 * ✓ Authentication required
 * ✓ Input validation (Zod schemas)
 * ✓ Email must be authenticated user's email
 * ✓ No PII in response
 * ✓ Transaction-safe creation
 */
export async function POST(request) {
  try {
    // ====================================================================
    // 1. AUTHENTICATION - Verify user is logged in
    // ====================================================================
    const auth = await verifyRequestAuthentication(request);
    if (!auth.authenticated) {
      return createErrorResponse('Unauthorized - Please log in', 401);
    }

    const userEmail = auth.userEmail;

    // ====================================================================
    // 2. INPUT VALIDATION
    // ====================================================================
    const body = await request.json();
    
    const validation = validateRequest(body, PassportCreateSchema);
    if (!validation.valid) {
      return createErrorResponse('Invalid request', 400);
    }

    const { email, name } = validation.data;

    // ====================================================================
    // 3. AUTHORIZATION - User can only create passport for themselves
    // ====================================================================
    if (email && email !== userEmail) {
      return createErrorResponse(
        'Forbidden - Can only create passport for yourself',
        403
      );
    }

    // ====================================================================
    // 4. CREATE PASSPORT - Use secure transaction-safe method
    // ====================================================================
    const passport = await SecureRewardsSystem.createPassport(
      userEmail,
      name,
      `passport_${userEmail}_${Date.now()}`
    );

    // ====================================================================
    // 5. RETURN SECURE RESPONSE
    // ====================================================================
    return createSecureResponse({
      success: true,
      message: 'Passport created successfully',
      passport: {
        totalStamps: passport.totalStamps,
        xpPoints: passport.xpPoints,
        level: passport.level,
        vouchersCount: passport.vouchers.length
      }
    });
  } catch (error) {
    console.error('Passport creation error:', {
      message: error.message,
      stack: error.stack
    });

    return createErrorResponse('Failed to create passport', 500, error);
  }
}

/**
 * GET PASSPORT - Retrieve passport info (authentication required)
 */
export async function GET(request) {
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
    // 2. GET PASSPORT
    // ====================================================================
    const passport = await SecureRewardsSystem.getPassportByEmail(userEmail);

    if (!passport) {
      return createErrorResponse('Passport not found', 404);
    }

    // ====================================================================
    // 3. RETURN SECURE RESPONSE
    // ====================================================================
    return createSecureResponse({
      success: true,
      passport: {
        totalStamps: passport.totalStamps,
        xpPoints: passport.xpPoints,
        level: passport.level,
        vouchersAvailable: passport.vouchers.filter(
          v => !v.used && (!v.expiresAt || v.expiresAt > new Date())
        ).length,
        vouchersTotal: passport.vouchers.length
      }
    });
  } catch (error) {
    console.error('Get passport error:', error);
    return createErrorResponse('Internal server error', 500, error);
  }
}