import SecureRewardsSystem from '@/lib/rewards-secure';
import {
  verifyRequestAuthentication,
  VoucherRedeemSchema,
  validateRequest,
  createErrorResponse,
  createSecureResponse
} from '@/lib/rewards-security';
import { ObjectId } from 'mongodb';

/**
 * REDEEM VOUCHER - Secure Endpoint
 * 
 * SECURITY FIXES IMPLEMENTED:
 * ✓ Authentication required
 * ✓ Input validation (Zod schemas)
 * ✓ User can only redeem own vouchers
 * ✓ Transaction-safe redemption (no double-spend)
 * ✓ No PII in response
 */
export async function POST(request) {
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
    // 2. INPUT VALIDATION
    // ====================================================================
    const body = await request.json();
    const validation = validateRequest(body, VoucherRedeemSchema);
    
    if (!validation.valid) {
      return createErrorResponse('Invalid request', 400);
    }

    const { voucherId, orderId } = validation.data;

    // ====================================================================
    // 3. GET PASSPORT FOR USER
    // ====================================================================
    const passport = await SecureRewardsSystem.getPassportByEmail(userEmail);
    
    if (!passport) {
      return createErrorResponse('Passport not found', 404);
    }

    // ====================================================================
    // 4. REDEEM VOUCHER - Transaction-safe
    // ====================================================================
    const result = await SecureRewardsSystem.redeemVoucher(
      passport._id.toString(),
      voucherId,
      orderId
    );

    // ====================================================================
    // 5. RETURN SECURE RESPONSE
    // ====================================================================
    return createSecureResponse({
      success: true,
      message: 'Voucher redeemed successfully',
      voucher: {
        code: result.voucher.code,
        type: result.voucher.type,
        value: result.voucher.discountPercent || result.voucher.value,
        usedAt: result.voucher.usedAt
      }
    });
  } catch (error) {
    console.error('Redeem error:', error);
    
    // Determine appropriate HTTP status
    let status = 500;
    let message = 'Failed to redeem voucher';
    
    if (error.message === 'Voucher not found') {
      status = 404;
      message = 'Voucher not found';
    } else if (error.message === 'Voucher already used') {
      status = 400;
      message = 'Voucher has already been used';
    } else if (error.message === 'Voucher expired') {
      status = 400;
      message = 'Voucher has expired';
    }
    
    return createErrorResponse(message, status, error);
  }
}

/**
 * GET AVAILABLE VOUCHERS
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
    // 3. FILTER AVAILABLE VOUCHERS
    // ====================================================================
    const now = new Date();
    const availableVouchers = passport.vouchers.filter(v => 
      !v.used &&                           // Not used yet
      (!v.expiresAt || v.expiresAt > now) // Not expired
    );

    // ====================================================================
    // 4. RETURN SECURE RESPONSE
    // ====================================================================
    return createSecureResponse({
      success: true,
      vouchers: availableVouchers.map(v => ({
        id: v.id,
        type: v.type,
        title: v.title,
        description: v.description,
        code: v.code,
        value: v.discountPercent || v.value,
        expiresAt: v.expiresAt,
        awardedAt: v.awardedAt
      }))
    });
  } catch (error) {
    console.error('Get vouchers error:', error);
    return createErrorResponse('Internal server error', 500, error);
  }
}
