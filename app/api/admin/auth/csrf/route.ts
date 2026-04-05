/**
 * CSRF Token Endpoint
 * 
 * Returns a fresh CSRF token for the frontend.
 * Requires authentication.
 */

import { NextResponse } from 'next/server';
import { generateCsrfToken } from '@/lib/auth/unified-admin';
import { withAdminMiddleware, AuthenticatedRequest } from '@/lib/middleware/admin';
import { PERMISSIONS } from '@/lib/security';
import { logger } from '@/lib/logger';

export const GET = withAdminMiddleware(
  async (request: AuthenticatedRequest) => {
    try {
      // Generate fresh CSRF token
      const csrfToken = generateCsrfToken();
      
      // Set cookie
      const response = NextResponse.json({
        success: true,
        csrfToken,
      });
      
      response.cookies.set('admin_csrf', csrfToken, {
        httpOnly: false, // Must be readable by JS
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 7 * 24 * 60 * 60, // 7 days
      });
      
      logger.debug('CSRF', `CSRF token generated for ${request.admin.email}`);
      
      return response;
      
    } catch (error) {
      logger.error('CSRF', 'Failed to generate CSRF token', error);
      return NextResponse.json(
        { success: false, error: 'Failed to generate CSRF token' },
        { status: 500 }
      );
    }
  },
  {
    permission: PERMISSIONS.DASHBOARD_VIEW,
    resource: 'auth',
    action: 'csrf',
    skipAudit: true, // Don't audit CSRF token generation (too noisy)
  }
);
