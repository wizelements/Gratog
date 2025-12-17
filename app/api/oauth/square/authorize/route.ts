import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

/**
 * Square OAuth Authorization Initiator
 * Redirects admin/owner to Square's authorization page to grant permissions
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const env = searchParams.get('env') || 'production'; // 'production' or 'sandbox'
    
    // Get app credentials based on environment
    const clientId = env === 'production' 
      ? (process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID || process.env.NEXT_PUBLIC_SQUARE_APP_ID)
      : (process.env.NEXT_PUBLIC_SQUARE_SANDBOX_APPLICATION_ID || 'sandbox-sq0idb-yygbGJe58k9ZsmpZhJ6kjA');
    
    if (!clientId || clientId === 'NOT_CONFIGURED') {
      return NextResponse.json(
        { error: 'Square Application ID not configured' },
        { status: 500 }
      );
    }
    
    // Your app's redirect URL - must match EXACTLY in Square Dashboard
    const redirectUri = `${process.env.NEXT_PUBLIC_BASE_URL}/api/oauth/square/callback`;
    
    // Generate state for CSRF protection
    const state = randomUUID();
    
    // Store state in session/cookie for validation (simplified here)
    // In production, store in Redis or encrypted cookie
    
    // Required scopes for the application
    const scopes = [
      'MERCHANT_PROFILE_READ',
      'ITEMS_READ',
      'ITEMS_WRITE',
      'ORDERS_READ',
      'ORDERS_WRITE',
      'PAYMENTS_READ',
      'PAYMENTS_WRITE',
      'PAYMENTS_WRITE_IN_PERSON',
      'CUSTOMERS_READ',
      'CUSTOMERS_WRITE',
      'INVENTORY_READ',
      'INVENTORY_WRITE'
    ].join(' ');
    
    // Build Square authorization URL
    const baseUrl = env === 'production'
      ? 'https://connect.squareup.com/oauth2/authorize'
      : 'https://connect.squareupsandbox.com/oauth2/authorize';
    
    const authUrl = new URL(baseUrl);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    
    console.log('Redirecting to Square OAuth:', {
      environment: env,
      clientId,
      redirectUri,
      scopes: scopes.split(' ').length + ' scopes'
    });
    
    // Redirect to Square authorization page
    return NextResponse.redirect(authUrl.toString());
  } catch (error) {
    console.error('❌ OAuth authorize error:', { error: (error as Error).message, stack: (error as Error).stack });
    return NextResponse.json(
      { 
        error: 'Failed to initiate OAuth flow',
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}
