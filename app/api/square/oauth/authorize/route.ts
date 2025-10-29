import { NextRequest, NextResponse } from 'next/server';
import { generateOAuthUrl, REQUIRED_SCOPES } from '@/lib/square-oauth-helper';

/**
 * Square OAuth Authorization URL Generator
 * GET /api/square/oauth/authorize
 * 
 * Query params:
 * - environment: 'sandbox' | 'production' (default: production)
 * - redirect_uri: OAuth callback URL (default: from env)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  const environment = (searchParams.get('environment') as 'sandbox' | 'production') || 'production';
  const redirectUri = searchParams.get('redirect_uri') || 
    `${process.env.NEXT_PUBLIC_BASE_URL}/api/square/oauth/callback`;
  
  const clientId = environment === 'sandbox'
    ? process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID // If you have sandbox app ID
    : process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID;

  if (!clientId) {
    return NextResponse.json(
      { error: 'Square Application ID not configured' },
      { status: 500 }
    );
  }

  try {
    // Generate OAuth URL with required scopes
    const oauthUrl = generateOAuthUrl({
      clientId,
      redirectUri,
      scopes: REQUIRED_SCOPES,
      environment
    });

    return NextResponse.json({
      success: true,
      oauthUrl,
      environment,
      redirectUri,
      scopes: REQUIRED_SCOPES,
      instructions: [
        '1. Visit the oauthUrl in a browser',
        '2. Log in with your Square account',
        '3. Authorize the application',
        '4. You will be redirected to the callback URL with authorization code',
        '5. Exchange code for access token using POST /oauth2/token'
      ],
      note: 'For personal access tokens, use Square Developer Dashboard → Credentials instead'
    });

  } catch (error) {
    console.error('OAuth URL generation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate OAuth URL',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
