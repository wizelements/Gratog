import { NextRequest, NextResponse } from 'next/server';
import { getSquareClient, getSquareLocationId, getSquareApplicationId, validateSquareConfig } from '@/lib/square';
import { logger } from '@/lib/logger';

/**
 * Square Authentication Diagnostic Endpoint
 * Tests Square API connectivity and identifies authentication issues
 */

export async function GET(request: NextRequest) {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    environment: process.env.SQUARE_ENVIRONMENT || 'sandbox',
    tests: {},
    errors: [],
    recommendations: []
  };

  try {
    // Get fresh Square client instance
    const square = getSquareClient();

    // Test 1: Configuration validation
    logger.debug('Square', 'Testing Square configuration', {});
    try {
      const config = validateSquareConfig();
      diagnostics.tests.configuration = {
        status: 'PASS',
        details: config
      };
    } catch (configError: any) {
      diagnostics.tests.configuration = {
        status: 'FAIL',
        error: configError.message
      };
      diagnostics.errors.push('Configuration validation failed');
      diagnostics.recommendations.push('Check .env file for missing Square credentials');
    }

    // Test 2: Verify access token format
    logger.debug('Square', 'Validating access token format', {});
    const accessToken = process.env.SQUARE_ACCESS_TOKEN || '';
    const tokenPrefix = accessToken.substring(0, 10);
    
    const validTokenFormats = {
      'EAAA': 'Production token (legacy format)',
      'sandbox-sq0atb-': 'Sandbox token',
      'sq0atp-': 'Production token (OAuth)',
      'sq0csp-': 'Production token (OAuth Client-Side)'
    };
    
    let tokenType = 'Unknown';
    for (const [prefix, description] of Object.entries(validTokenFormats)) {
      if (accessToken.startsWith(prefix)) {
        tokenType = description;
        break;
      }
    }
    
    diagnostics.tests.tokenFormat = {
      status: tokenType !== 'Unknown' ? 'PASS' : 'WARN',
      tokenPrefix,
      tokenType,
      tokenLength: accessToken.length,
      expectedEnvironment: accessToken.startsWith('sandbox-') ? 'sandbox' : 'production',
      actualEnvironment: process.env.SQUARE_ENVIRONMENT || 'sandbox'
    };
    
    if (tokenType === 'Unknown') {
      diagnostics.errors.push('Unrecognized Square access token format');
      diagnostics.recommendations.push('Verify access token from Square Developer Dashboard');
    }

    // Test 3: Test Square API connectivity - Locations API (most basic)
    console.log('Testing Square API connectivity...');
    try {
      const response = await square.locations.list();
      
      if (response.locations) {
        diagnostics.tests.apiConnectivity = {
          status: 'PASS',
          locationsFound: response.locations.length,
          locations: response.locations.map((loc) => ({
            id: loc.id,
            name: loc.name,
            status: loc.status,
            capabilities: loc.capabilities
          }))
        };
        
        // Verify configured location exists
         const configuredLocationId = getSquareLocationId();
         const configuredLocation = response.locations?.find((loc) => loc.id === configuredLocationId);
         if (configuredLocation) {
           diagnostics.tests.locationValidation = {
             status: 'PASS',
             locationId: configuredLocationId,
             locationName: configuredLocation.name,
             locationStatus: configuredLocation.status
           };
         } else {
           diagnostics.tests.locationValidation = {
             status: 'FAIL',
             error: `Location ${configuredLocationId} not found in account`
           };
          diagnostics.errors.push('Configured location ID not found');
          diagnostics.recommendations.push('Verify SQUARE_LOCATION_ID matches a location in your Square account');
        }
      }
    } catch (apiError: any) {
      console.error('Square API connectivity test failed:', apiError);
      
      diagnostics.tests.apiConnectivity = {
        status: 'FAIL',
        error: apiError.message || 'Unknown error',
        statusCode: apiError.statusCode,
        body: apiError.body,
        errors: apiError.errors
      };
      
      // Parse specific error types
      if (apiError.statusCode === 401 || apiError.message?.includes('UNAUTHORIZED') || apiError.message?.includes('401')) {
        diagnostics.errors.push('AUTHENTICATION_ERROR: Square API returned 401 Unauthorized');
        diagnostics.recommendations.push('Access token is invalid, expired, or lacks permissions');
        diagnostics.recommendations.push('Regenerate access token in Square Developer Dashboard');
        diagnostics.recommendations.push('Verify token has required scopes: PAYMENTS_READ, PAYMENTS_WRITE, ORDERS_READ, ORDERS_WRITE');
      } else if (apiError.statusCode === 403) {
        diagnostics.errors.push('PERMISSION_ERROR: Access forbidden');
        diagnostics.recommendations.push('Verify app permissions in Square Developer Dashboard');
      } else if (apiError.statusCode === 404) {
        diagnostics.errors.push('NOT_FOUND: API endpoint not found');
        diagnostics.recommendations.push('Check Square API version and endpoint URLs');
      }
    }

    // Test 4: Test Catalog API (required for products)
    console.log('Testing Catalog API access...');
    try {
      const catalogPage = await square.catalog.list({ types: 'ITEM' });
      const items = [];
      for await (const item of catalogPage) {
        items.push(item);
        if (items.length >= 10) break; // Just check first 10 for diagnostic
      }
      
      diagnostics.tests.catalogAccess = {
        status: 'PASS',
        itemsFound: items.length
      };
      
      if (items.length === 0) {
        diagnostics.recommendations.push('No catalog items found - run syncCatalog.ts to import products');
      }
    } catch (catalogError: any) {
      diagnostics.tests.catalogAccess = {
        status: 'FAIL',
        error: catalogError.message,
        statusCode: catalogError.statusCode
      };
      
      if (catalogError.statusCode === 401) {
        diagnostics.errors.push('CATALOG_AUTH_ERROR: Cannot access catalog');
      }
    }

    // Test 5: Test Payments API capability (doesn't create payment, just checks access)
    console.log('Testing Payments API capability...');
    try {
      // Try to get a non-existent payment (should return 404, not 401)
      await square.payments.get({ paymentId: 'test-payment-id-that-does-not-exist' });
      diagnostics.tests.paymentsApiCapability = {
        status: 'PASS',
        note: 'Payments API accessible (expected 404 for test ID)'
      };
    } catch (paymentError: any) {
      if (paymentError.statusCode === 404) {
        // This is actually good - means we can access the API
        diagnostics.tests.paymentsApiCapability = {
          status: 'PASS',
          note: 'Payments API accessible (received expected 404)'
        };
      } else if (paymentError.statusCode === 401) {
        diagnostics.tests.paymentsApiCapability = {
          status: 'FAIL',
          error: 'UNAUTHORIZED - Cannot access Payments API',
          details: paymentError.message
        };
        diagnostics.errors.push('PAYMENTS_AUTH_ERROR: Cannot access payments');
        diagnostics.recommendations.push('Verify PAYMENTS_WRITE scope is enabled in Square Developer Dashboard');
      } else {
        diagnostics.tests.paymentsApiCapability = {
          status: 'WARN',
          error: paymentError.message,
          statusCode: paymentError.statusCode
        };
      }
    }

    // Test 6: Webhook signature key validation
    const webhookKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
    diagnostics.tests.webhookConfiguration = {
      status: webhookKey ? 'PASS' : 'WARN',
      hasSignatureKey: !!webhookKey,
      note: webhookKey ? 'Webhook signature key configured' : 'Webhook signature key not configured'
    };

    // Summary
    const totalTests = Object.keys(diagnostics.tests).length;
    const passedTests = Object.values(diagnostics.tests).filter((t: any) => t.status === 'PASS').length;
    const failedTests = Object.values(diagnostics.tests).filter((t: any) => t.status === 'FAIL').length;
    
    diagnostics.summary = {
      totalTests,
      passedTests,
      failedTests,
      overallStatus: failedTests === 0 ? 'HEALTHY' : (passedTests > 0 ? 'PARTIAL' : 'CRITICAL'),
      hasAuthenticationIssues: diagnostics.errors.some((e: string) => e.includes('AUTH')),
      canProcessPayments: diagnostics.tests.paymentsApiCapability?.status === 'PASS' && 
                          diagnostics.tests.apiConnectivity?.status === 'PASS'
    };

  } catch (error: any) {
    console.error('Diagnostic test failed:', error);
    diagnostics.criticalError = {
      message: error.message,
      stack: error.stack
    };
    diagnostics.summary = {
      overallStatus: 'CRITICAL',
      hasAuthenticationIssues: true,
      canProcessPayments: false
    };
  }

  // Determine HTTP status code
  const httpStatus = diagnostics.summary?.overallStatus === 'HEALTHY' ? 200 : 
                     (diagnostics.summary?.overallStatus === 'PARTIAL' ? 207 : 503);

  return NextResponse.json(diagnostics, { status: httpStatus });
}
