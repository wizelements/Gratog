import { NextRequest, NextResponse } from 'next/server';

/**
 * Public endpoint to get Square configuration for Web Payments SDK
 * Only exposes public/client-safe values - never access tokens
 */
export async function GET(request: NextRequest) {
  try {
    const applicationId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID || '';
    const locationId = process.env.SQUARE_LOCATION_ID || '';
    const environment = (process.env.SQUARE_ENVIRONMENT || 'sandbox').toLowerCase();

    if (!applicationId) {
      return NextResponse.json(
        { error: 'Square application ID not configured' },
        { status: 500 }
      );
    }

    if (!locationId) {
      return NextResponse.json(
        { error: 'Square location ID not configured' },
        { status: 500 }
      );
    }

    const isSandbox = environment === 'sandbox' || applicationId.startsWith('sandbox-');

    return NextResponse.json({
      applicationId,
      locationId,
      environment: isSandbox ? 'sandbox' : 'production',
      sdkUrl: isSandbox 
        ? 'https://sandbox.web.squarecdn.com/v1/square.js'
        : 'https://web.squarecdn.com/v1/square.js'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to retrieve Square configuration' },
      { status: 500 }
    );
  }
}
