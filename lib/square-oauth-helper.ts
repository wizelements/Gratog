/**
 * Square OAuth Helper Utilities
 * Tools for OAuth flow, token validation, and scope testing
 */

import { randomBytes } from 'crypto';

// Current Square API version (update as needed)
export const SQUARE_API_VERSION = '2025-10-16';

// Required scopes for Taste of Gratitude application
export const REQUIRED_SCOPES = [
  'MERCHANT_PROFILE_READ',  // Read location info
  'ITEMS_READ',             // Read catalog products
  'ORDERS_READ',            // Query order status
  'ORDERS_WRITE',           // Create orders
  'PAYMENTS_READ',          // Query payment status
  'PAYMENTS_WRITE',         // Process payments
  'INVENTORY_READ',         // Check stock levels (optional but recommended)
  'CUSTOMERS_READ',         // Access customer data (optional)
  'CUSTOMERS_WRITE'         // Create customers (optional)
];

// Minimal scopes for basic functionality
export const MINIMAL_SCOPES = [
  'MERCHANT_PROFILE_READ',
  'ITEMS_READ',
  'ORDERS_READ',
  'ORDERS_WRITE',
  'PAYMENTS_READ',
  'PAYMENTS_WRITE'
];

export interface OAuthConfig {
  clientId: string;
  redirectUri: string;
  scopes?: string[];
  state?: string;
  environment?: 'sandbox' | 'production';
}

export interface TokenStatus {
  scopes: string[];
  expires_at: string | null;
  client_id: string;
  merchant_id: string;
}

export interface ScopeTestResult {
  scope: string;
  status: 'PASS' | 'FAIL' | 'MISSING';
  error?: string;
  statusCode?: number;
}

/**
 * Generate OAuth authorization URL
 * Use this to redirect users for OAuth flow
 */
export function generateOAuthUrl(config: OAuthConfig): string {
  const {
    clientId,
    redirectUri,
    scopes = REQUIRED_SCOPES,
    state = randomBytes(16).toString('hex'),
    environment = 'production'
  } = config;

  const baseUrl = environment === 'sandbox'
    ? 'https://connect.squareupsandbox.com'
    : 'https://connect.squareup.com';

  // Space-delimited scopes as per Square OAuth spec
  const scopeString = scopes.join(' ');

  const params = new URLSearchParams({
    client_id: clientId,
    scope: scopeString,
    session: 'false',
    state: state,
    redirect_uri: redirectUri
  });

  return `${baseUrl}/oauth2/authorize?${params.toString()}`;
}

/**
 * Validate access token and retrieve scopes
 * Uses Square's official token-status endpoint
 */
export async function validateToken(
  accessToken: string,
  environment: 'sandbox' | 'production' = 'production'
): Promise<{ valid: boolean; status?: TokenStatus; error?: string }> {
  const baseUrl = environment === 'sandbox'
    ? 'https://connect.squareupsandbox.com'
    : 'https://connect.squareup.com';

  try {
    const response = await fetch(`${baseUrl}/oauth2/token/status`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': SQUARE_API_VERSION
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        valid: false,
        error: `Token validation failed: ${response.status} - ${JSON.stringify(errorData)}`
      };
    }

    const status: TokenStatus = await response.json();
    return { valid: true, status };

  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Test specific API endpoint to verify scope permissions
 * Helps distinguish between:
 * - 401 UNAUTHORIZED: Invalid/expired token or wrong environment
 * - 403 FORBIDDEN: Valid token but missing required scope
 */
export async function testScope(
  accessToken: string,
  scopeTest: { scope: string; endpoint: string; method?: string },
  environment: 'sandbox' | 'production' = 'production'
): Promise<ScopeTestResult> {
  const baseUrl = environment === 'sandbox'
    ? 'https://connect.squareupsandbox.com'
    : 'https://connect.squareup.com';

  try {
    const response = await fetch(`${baseUrl}${scopeTest.endpoint}`, {
      method: scopeTest.method || 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': SQUARE_API_VERSION
      }
    });

    // Success or expected 404 (e.g., testing with non-existent payment ID)
    if (response.ok || response.status === 404) {
      return {
        scope: scopeTest.scope,
        status: 'PASS'
      };
    }

    // 401 = Invalid/expired token or wrong environment
    if (response.status === 401) {
      return {
        scope: scopeTest.scope,
        status: 'FAIL',
        error: '401 UNAUTHORIZED - Invalid/expired token or wrong environment',
        statusCode: 401
      };
    }

    // 403 = Valid token but missing required scope
    if (response.status === 403) {
      return {
        scope: scopeTest.scope,
        status: 'MISSING',
        error: `403 FORBIDDEN - Valid token but missing ${scopeTest.scope} scope`,
        statusCode: 403
      };
    }

    // Other error
    const errorData = await response.json().catch(() => ({}));
    return {
      scope: scopeTest.scope,
      status: 'FAIL',
      error: `${response.status} - ${JSON.stringify(errorData)}`,
      statusCode: response.status
    };

  } catch (error) {
    return {
      scope: scopeTest.scope,
      status: 'FAIL',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Run comprehensive scope smoke tests
 * Tests baseline (locations) + each required scope to distinguish 401 vs 403
 */
export async function runScopeSmokeTests(
  accessToken: string,
  environment: 'sandbox' | 'production' = 'production'
): Promise<{
  overall: 'PASS' | 'FAIL';
  tokenValid: boolean;
  tokenStatus?: TokenStatus;
  scopeTests: ScopeTestResult[];
  recommendations: string[];
}> {
  const recommendations: string[] = [];
  const scopeTests: ScopeTestResult[] = [];

  // Step 1: Validate token and get scopes
  console.log('🔍 Validating token...');
  const tokenValidation = await validateToken(accessToken, environment);

  if (!tokenValidation.valid) {
    return {
      overall: 'FAIL',
      tokenValid: false,
      scopeTests: [],
      recommendations: [
        '❌ Token validation failed',
        tokenValidation.error || 'Unknown error',
        'Check that you are using the correct environment (sandbox vs production)',
        'Regenerate access token in Square Developer Dashboard'
      ]
    };
  }

  console.log('✅ Token is valid');
  console.log('📋 Token scopes:', tokenValidation.status?.scopes);

  // Check for missing scopes
  const tokenScopes = tokenValidation.status?.scopes || [];
  const missingScopes = REQUIRED_SCOPES.filter(scope => !tokenScopes.includes(scope));

  if (missingScopes.length > 0) {
    recommendations.push(
      `⚠️  Missing required scopes: ${missingScopes.join(', ')}`,
      'Enable these scopes in Square Developer Dashboard',
      'Generate new access token after enabling scopes'
    );
  }

  // Step 2: Test baseline - Locations API (requires MERCHANT_PROFILE_READ)
  console.log('🧪 Testing baseline: Locations API...');
  const locationsTest = await testScope(
    accessToken,
    { scope: 'MERCHANT_PROFILE_READ', endpoint: '/v2/locations' },
    environment
  );
  scopeTests.push(locationsTest);

  if (locationsTest.status === 'FAIL' && locationsTest.statusCode === 401) {
    return {
      overall: 'FAIL',
      tokenValid: false,
      tokenStatus: tokenValidation.status,
      scopeTests,
      recommendations: [
        '❌ 401 UNAUTHORIZED on baseline test',
        'Token is invalid, expired, or for wrong environment',
        `Current environment: ${environment}`,
        'Verify token is for correct environment',
        'Regenerate access token if needed'
      ]
    };
  }

  // Step 3: Test Payments API (requires PAYMENTS_READ)
  console.log('🧪 Testing: Payments API...');
  const paymentsTest = await testScope(
    accessToken,
    { scope: 'PAYMENTS_READ', endpoint: '/v2/payments?limit=1' },
    environment
  );
  scopeTests.push(paymentsTest);

  // Step 4: Test Catalog API (requires ITEMS_READ)
  console.log('🧪 Testing: Catalog API...');
  const catalogTest = await testScope(
    accessToken,
    { scope: 'ITEMS_READ', endpoint: '/v2/catalog/list?types=ITEM&limit=1' },
    environment
  );
  scopeTests.push(catalogTest);

  // Step 5: Test Orders API (requires ORDERS_READ)
  console.log('🧪 Testing: Orders API...');
  const ordersTest = await testScope(
    accessToken,
    { scope: 'ORDERS_READ', endpoint: '/v2/orders/search' },
    environment
  );
  scopeTests.push(ordersTest);

  // Determine overall result
  const allPassed = scopeTests.every(test => test.status === 'PASS');
  const hasMissing = scopeTests.some(test => test.status === 'MISSING');

  if (allPassed) {
    recommendations.push('✅ All scope tests passed!', 'Token is ready for production use');
  } else if (hasMissing) {
    const missingScopesList = scopeTests
      .filter(test => test.status === 'MISSING')
      .map(test => test.scope);
    recommendations.push(
      `⚠️  Token missing scopes: ${missingScopesList.join(', ')}`,
      'Enable these scopes in Square Developer Dashboard → OAuth',
      'Generate NEW access token (old tokens do not inherit new scopes)'
    );
  }

  return {
    overall: allPassed ? 'PASS' : 'FAIL',
    tokenValid: true,
    tokenStatus: tokenValidation.status,
    scopeTests,
    recommendations
  };
}

/**
 * Helper to check if error is 401 vs 403
 */
export function categorizeAuthError(statusCode: number): {
  category: '401_UNAUTHORIZED' | '403_FORBIDDEN' | 'OTHER';
  meaning: string;
  action: string;
} {
  if (statusCode === 401) {
    return {
      category: '401_UNAUTHORIZED',
      meaning: 'Invalid/expired token OR wrong environment (sandbox vs production)',
      action: 'Use RetrieveTokenStatus to verify token validity and environment match'
    };
  }

  if (statusCode === 403) {
    return {
      category: '403_FORBIDDEN',
      meaning: 'Valid token but missing required scope for this endpoint',
      action: 'Enable required scope in Square Dashboard and regenerate token'
    };
  }

  return {
    category: 'OTHER',
    meaning: `Unexpected status code: ${statusCode}`,
    action: 'Check Square API documentation for this error code'
  };
}
