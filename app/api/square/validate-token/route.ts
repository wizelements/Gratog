import { NextRequest, NextResponse } from 'next/server';
import { validateToken, runScopeSmokeTests } from '@/lib/square-oauth-helper';
import { logger } from '@/lib/logger';

/**
 * Square Token Validation Endpoint
 * Tests token validity and scopes using official Square endpoints
 * 
 * GET /api/square/validate-token?comprehensive=true
 * 
 * This helps distinguish:
 * - 401 UNAUTHORIZED: Invalid/expired token or wrong environment
 * - 403 FORBIDDEN: Valid token but missing required scope
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const comprehensive = searchParams.get('comprehensive') === 'true';
  
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  const environment = (process.env.SQUARE_ENVIRONMENT as 'sandbox' | 'production') || 'production';

  if (!accessToken) {
    return NextResponse.json(
      { error: 'SQUARE_ACCESS_TOKEN not configured in environment' },
      { status: 500 }
    );
  }

  try {
    if (comprehensive) {
      // Run full scope smoke tests
      logger.info('SQUARE-TOKEN', 'Running comprehensive scope tests...');
      const results = await runScopeSmokeTests(accessToken, environment);
      
      return NextResponse.json({
        timestamp: new Date().toISOString(),
        environment,
        testType: 'comprehensive',
        ...results
      });
    } else {
      // Quick token validation only
      logger.info('SQUARE-TOKEN', 'Running quick token validation...');
      const result = await validateToken(accessToken, environment);
      
      if (!result.valid) {
        return NextResponse.json({
          timestamp: new Date().toISOString(),
          environment,
          valid: false,
          error: result.error,
          recommendations: [
            'Token is invalid or expired',
            'Verify SQUARE_ENVIRONMENT matches token type',
            'Regenerate access token in Square Developer Dashboard'
          ]
        }, { status: 401 });
      }

      const tokenScopes = result.status?.scopes || [];
      const hasAllRequired = [
        'MERCHANT_PROFILE_READ',
        'ITEMS_READ',
        'ORDERS_READ',
        'ORDERS_WRITE',
        'PAYMENTS_READ',
        'PAYMENTS_WRITE'
      ].every(scope => tokenScopes.includes(scope));

      return NextResponse.json({
        timestamp: new Date().toISOString(),
        environment,
        valid: true,
        tokenStatus: result.status,
        hasAllRequiredScopes: hasAllRequired,
        recommendations: hasAllRequired 
          ? ['✅ Token has all required scopes'] 
          : [
              '⚠️  Token is missing some required scopes',
              'Enable missing scopes in Square Developer Dashboard',
              'Generate new access token after enabling scopes'
            ]
      });
    }

  } catch (error) {
    logger.error('SQUARE-TOKEN', 'Token validation error', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Token validation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * Test specific token (useful for testing new tokens before deploying)
 * POST /api/square/validate-token
 * Body: { "accessToken": "...", "environment": "production" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accessToken, environment = 'production' } = body;

    if (!accessToken) {
      return NextResponse.json(
        { error: 'accessToken is required in request body' },
        { status: 400 }
      );
    }

    // Run comprehensive tests on provided token
    const results = await runScopeSmokeTests(accessToken, environment);
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      environment,
      testType: 'comprehensive',
      ...results,
      note: 'This token was tested but NOT saved to environment'
    });

  } catch (error) {
    logger.error('SQUARE-TOKEN', 'Token validation error', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Token validation failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
