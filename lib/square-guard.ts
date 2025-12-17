const DEBUG = process.env.DEBUG === "true" || process.env.VERBOSE === "true";
const debug = (...args) => { if (DEBUG) debug(...args); };

/**
 * Square Production Safety Guard
 * Prevents fallback payments and provides clear error messages in production
 */

const SQUARE_ENVIRONMENT = process.env.SQUARE_ENVIRONMENT || 'sandbox';
const SQUARE_MOCK_MODE = process.env.SQUARE_MOCK_MODE === 'true';

export interface SquareGuardConfig {
  allowFallback: boolean;
  environment: 'production' | 'sandbox';
  mockMode: boolean;
}

export function getSquareGuardConfig(): SquareGuardConfig {
  const isProduction = SQUARE_ENVIRONMENT === 'production';
  
  // In production, never allow fallback mode
  const allowFallback = !isProduction && SQUARE_MOCK_MODE;
  
  return {
    allowFallback,
    environment: isProduction ? 'production' : 'sandbox',
    mockMode: SQUARE_MOCK_MODE
  };
}

export function shouldAllowFallback(): boolean {
  const config = getSquareGuardConfig();
  return config.allowFallback;
}

export function getAuthFailureResponse(error: any) {
  const config = getSquareGuardConfig();
  
  if (!config.allowFallback) {
    // Production mode - return clear error
    return {
      success: false,
      error: 'Payment processing temporarily unavailable',
      details: 'Square API authentication failed. Please contact support.',
      serviceStatus: 'unavailable',
      retryable: false
    };
  }
  
  // Development/sandbox with fallback allowed
  return {
    success: true,
    fallbackMode: true,
    warning: 'Using fallback mode - no real charges will be processed',
    details: error.message
  };
}

export function validateProductionReadiness(): {
  ready: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  
  const accessToken = process.env.SQUARE_ACCESS_TOKEN || '';
  const appId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID || '';
  const locationId = process.env.SQUARE_LOCATION_ID || '';
  
  // Check credentials exist
  if (!accessToken) {
    issues.push('SQUARE_ACCESS_TOKEN not configured');
  }
  
  if (!appId) {
    issues.push('NEXT_PUBLIC_SQUARE_APPLICATION_ID not configured');
  }
  
  if (!locationId) {
    issues.push('SQUARE_LOCATION_ID not configured');
  }
  
  // Check credential types
  if (accessToken.startsWith('sq0csp-')) {
    issues.push('SQUARE_ACCESS_TOKEN is a Client Secret - use Access Token instead');
  }
  
  if (accessToken.startsWith('sq0idp-') || accessToken.startsWith('sq0idb-')) {
    issues.push('SQUARE_ACCESS_TOKEN appears to be Application ID - use Access Token instead');
  }
  
  // Check production consistency
  if (SQUARE_ENVIRONMENT === 'production') {
    if (!appId.startsWith('sq0idp-')) {
      issues.push('Production environment requires production Application ID (sq0idp-)');
    }
    
    if (accessToken.toLowerCase().includes('sandbox')) {
      issues.push('Sandbox token detected in production environment');
    }
  }
  
  return {
    ready: issues.length === 0,
    issues
  };
}

export function logSquareOperation(
  operation: string,
  success: boolean,
  details?: any
) {
  const config = getSquareGuardConfig();
  const prefix = success ? '✅' : '❌';
  
  debug(`${prefix} [Square ${config.environment}] ${operation}`, {
    success,
    mockMode: config.mockMode,
    allowFallback: config.allowFallback,
    ...details
  });
}
