import { NextResponse } from 'next/server';
import {
  generateCsrfToken,
  resolveCsrfSessionId,
  verifyRequestAuthentication,
} from '@/lib/rewards-security';

/**
 * GET /api/csrf - Get a new CSRF token for authenticated users
 * 
 * USAGE:
 * 1. Call GET /api/csrf before any state-changing request (POST, PUT, DELETE)
 * 2. Include the token in request body or header: x-csrf-token
 * 3. Token expires in 30 minutes and is single-use
 */
export async function GET(request) {
  try {
    const auth = await verifyRequestAuthentication(request, { allowPublic: true });
    const sessionId = resolveCsrfSessionId(request, auth);
    
    const csrfToken = generateCsrfToken(sessionId);
    
    const response = NextResponse.json(
      { csrfToken },
      { status: 200 }
    );
    
    // Set CSRF token in cookie as well (double-submit pattern)
    response.cookies.set('csrf_token', csrfToken, {
      httpOnly: false, // Needs to be readable by JS
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 1800, // 30 minutes
      path: '/'
    });
    
    return response;
  } catch (error) {
    console.error('CSRF token generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
}
