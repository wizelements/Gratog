import { NextResponse } from 'next/server';
import { generateCsrfToken, verifyRequestAuthentication } from '@/lib/rewards-security';

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
    // Get session identifier (cookie-based for consistency)
    const cookies = request.headers.get('cookie') || '';
    const sessionMatch = cookies.match(/(?:next-auth\.session-token|customer_email)=([^;]+)/);
    
    // Allow CSRF token generation even without auth (for forms before login)
    // But include session binding when available
    const sessionId = sessionMatch 
      ? decodeURIComponent(sessionMatch[1]).substring(0, 32)
      : request.headers.get('x-forwarded-for')?.split(',')[0] || 'anonymous';
    
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
