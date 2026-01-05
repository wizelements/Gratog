import { NextRequest, NextResponse } from 'next/server';
import { getSquarePublicConfig, validateSquareConfig } from '@/lib/payments/config';

/**
 * Public endpoint to get Square configuration for Web Payments SDK
 * Only exposes public/client-safe values - never access tokens
 * 
 * Uses centralized config module to ensure consistency across all payment code.
 */
export async function GET(request: NextRequest) {
  try {
    // Validate config first
    const validation = validateSquareConfig();
    
    if (!validation.valid) {
      console.error('Square config validation failed:', validation.missing);
      return NextResponse.json(
        { 
          error: 'Payment system not configured',
          details: process.env.NODE_ENV === 'development' ? validation.missing : undefined
        },
        { status: 500 }
      );
    }
    
    // Get public config (no secrets)
    const config = getSquarePublicConfig();
    
    return NextResponse.json(config);
    
  } catch (error) {
    console.error('Square config error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve payment configuration' },
      { status: 500 }
    );
  }
}
