
import { logger } from '@/lib/logger';
import { NextRequest, NextResponse } from 'next/server';
import { SquareClient, SquareEnvironment } from 'square';

/**
 * Square OAuth Callback Handler
 * Receives authorization code and exchanges it for access token
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    
    // Handle authorization errors
    if (error) {
      console.error('Square OAuth error:', error, errorDescription);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/admin?oauth_error=${encodeURIComponent(error)}&message=${encodeURIComponent(errorDescription || 'Authorization failed')}`
      );
    }
    
    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/admin?oauth_error=missing_code&message=No authorization code received`
      );
    }
    
    logger.debug('API', 'Received authorization code:', code.substring(0, 20) + '...');
    
    // Validate state (CSRF protection)
    // In production, validate against stored state
    // For now, we'll accept any state
    
    // Determine environment based on code format or use production as default
    const isProduction = true; // Assume production for now
    
    const clientId = isProduction
      ? (process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID || process.env.NEXT_PUBLIC_SQUARE_APP_ID)
      : process.env.NEXT_PUBLIC_SQUARE_SANDBOX_APPLICATION_ID;
    
    const clientSecret = process.env.SQUARE_CLIENT_SECRET || '';
    
    if (!clientSecret || !clientId) {
      console.error('SQUARE_CLIENT_SECRET or Application ID not configured');
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/admin?oauth_error=config&message=Square OAuth credentials not configured`
      );
    }
    
    // Exchange authorization code for access token
    const square = new SquareClient({
      environment: isProduction ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
    });
    
    logger.debug('API', 'Exchanging code for access token...');
    
    const response = await square.oAuth.obtainToken({
      clientId,
      clientSecret,
      code,
      grantType: 'authorization_code',
      redirectUri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/oauth/square/callback`
    });
    
    logger.debug('API', 'Token exchange response:', response);
    
    // Square returns tokens directly in response
    const accessToken = response.accessToken;
    const refreshToken = response.refreshToken;
    const expiresAt = response.expiresAt;
    const merchantId = response.merchantId;
    
    if (!accessToken) {
      console.error('No access token in response:', response);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_BASE_URL}/admin?oauth_error=token_exchange&message=Failed to obtain access token`
      );
    }
    
    logger.debug('API', '✅ Access token obtained successfully!');
    logger.debug('API', 'Merchant ID:', merchantId);
    logger.debug('API', 'Token expires:', expiresAt);
    
    // ISS-052 FIX: Never render raw tokens in HTML. Log server-side and redirect
    // to admin dashboard with success message. Tokens should be set via Vercel
    // env vars or .env — not copy-pasted from a browser page.
    logger.info('API', `Square OAuth success — merchant: ${merchantId}, expires: ${expiresAt}`);
    logger.info('API', `Set SQUARE_ACCESS_TOKEN in Vercel env vars (token starts with: ${accessToken.substring(0, 8)}...)`);
    if (refreshToken) {
      logger.info('API', `Set SQUARE_REFRESH_TOKEN in Vercel env vars (token starts with: ${refreshToken.substring(0, 8)}...)`);
    }

    const successUrl = new URL('/admin', process.env.NEXT_PUBLIC_BASE_URL);
    successUrl.searchParams.set('oauth_success', 'true');
    successUrl.searchParams.set('merchant', merchantId || '');
    return NextResponse.redirect(successUrl.toString());
    
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_BASE_URL}/admin?oauth_error=exception&message=${encodeURIComponent(error instanceof Error ? error.message : 'Unknown error')}`
    );
  }
}
