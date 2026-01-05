/**
 * Centralized Square Payment Configuration
 * 
 * All Square credentials and config MUST come through this module.
 * Never read SQUARE_* env vars directly in components or API routes.
 * 
 * Server-side: Use getSquareServerConfig()
 * Client-side: Fetch from /api/square/config
 */

const REQUIRED_SERVER_VARS = [
  'SQUARE_ACCESS_TOKEN',
  'SQUARE_LOCATION_ID',
] as const;

const REQUIRED_PUBLIC_VARS = [
  'NEXT_PUBLIC_SQUARE_APPLICATION_ID',
] as const;

type ServerEnvKey = (typeof REQUIRED_SERVER_VARS)[number];
type PublicEnvKey = (typeof REQUIRED_PUBLIC_VARS)[number];

export interface SquareServerConfig {
  accessToken: string;
  locationId: string;
  applicationId: string;
  environment: 'sandbox' | 'production';
  baseUrl: string;
}

export interface SquarePublicConfig {
  applicationId: string;
  locationId: string;
  environment: 'sandbox' | 'production';
  sdkUrl: string;
}

export interface ConfigValidationResult {
  valid: boolean;
  missing: string[];
  warnings: string[];
}

/**
 * Get a required env var or throw
 */
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required Square env var: ${key}`);
  }
  return value;
}

/**
 * Get an optional env var with fallback
 */
function getOptionalEnv(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

/**
 * Determine environment from app ID or explicit setting
 */
function determineEnvironment(appId: string): 'sandbox' | 'production' {
  const explicitEnv = process.env.SQUARE_ENVIRONMENT?.toLowerCase();
  if (explicitEnv === 'production') return 'production';
  if (explicitEnv === 'sandbox') return 'sandbox';
  
  // Infer from app ID
  return appId.startsWith('sandbox-') ? 'sandbox' : 'production';
}

/**
 * Get full server-side Square configuration
 * Use this in API routes that need to make Square API calls
 */
export function getSquareServerConfig(): SquareServerConfig {
  const accessToken = getRequiredEnv('SQUARE_ACCESS_TOKEN');
  const locationId = getRequiredEnv('SQUARE_LOCATION_ID');
  const applicationId = getRequiredEnv('NEXT_PUBLIC_SQUARE_APPLICATION_ID');
  
  const environment = determineEnvironment(applicationId);
  const baseUrl = environment === 'sandbox' 
    ? 'https://connect.squareupsandbox.com'
    : 'https://connect.squareup.com';
  
  return {
    accessToken,
    locationId,
    applicationId,
    environment,
    baseUrl,
  };
}

/**
 * Get client-safe Square configuration
 * This is returned by /api/square/config for client-side SDK initialization
 */
export function getSquarePublicConfig(): SquarePublicConfig {
  const applicationId = getRequiredEnv('NEXT_PUBLIC_SQUARE_APPLICATION_ID');
  const locationId = getRequiredEnv('SQUARE_LOCATION_ID');
  
  const environment = determineEnvironment(applicationId);
  const sdkUrl = environment === 'sandbox'
    ? 'https://sandbox.web.squarecdn.com/v1/square.js'
    : 'https://web.squarecdn.com/v1/square.js';
  
  return {
    applicationId,
    locationId,
    environment,
    sdkUrl,
  };
}

/**
 * Validate that all required env vars are set
 * Use this at startup or in health checks
 */
export function validateSquareConfig(): ConfigValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Check server-side vars
  for (const key of REQUIRED_SERVER_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }
  
  // Check public vars
  for (const key of REQUIRED_PUBLIC_VARS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }
  
  // CRITICAL: Check for client secret misuse (common mistake)
  const accessToken = process.env.SQUARE_ACCESS_TOKEN || '';
  if (accessToken.startsWith('sq0csp-')) {
    errors.push('FATAL: SQUARE_ACCESS_TOKEN is a Client Secret (sq0csp-). Use Production Access Token (EAAA... or sq0atp-...) instead!');
  }
  
  // Warnings for deprecated patterns
  if (process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID) {
    warnings.push('NEXT_PUBLIC_SQUARE_LOCATION_ID is deprecated; use SQUARE_LOCATION_ID (server-side) instead');
  }
  
  // Check for environment mismatch
  const appId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID || '';
  const explicitEnv = process.env.SQUARE_ENVIRONMENT?.toLowerCase();
  const inferredEnv = appId.startsWith('sandbox-') ? 'sandbox' : 'production';
  
  if (explicitEnv && explicitEnv !== inferredEnv) {
    warnings.push(`SQUARE_ENVIRONMENT (${explicitEnv}) doesn't match application ID pattern (${inferredEnv})`);
  }
  
  // Add domain registration reminder for production
  if (inferredEnv === 'production') {
    warnings.push('Ensure your domain is registered in Square Dashboard > Applications > Web Payments SDK');
  }
  
  return {
    valid: missing.length === 0 && errors.length === 0,
    missing: [...missing, ...errors],
    warnings,
  };
}

/**
 * Get a health summary for monitoring
 */
export function getSquareHealthStatus(): {
  ok: boolean;
  environment: string;
  hasAccessToken: boolean;
  hasLocationId: boolean;
  hasApplicationId: boolean;
  configErrors: string[];
  warnings: string[];
} {
  const validation = validateSquareConfig();
  
  return {
    ok: validation.valid,
    environment: process.env.SQUARE_ENVIRONMENT || 'unknown',
    hasAccessToken: !!process.env.SQUARE_ACCESS_TOKEN,
    hasLocationId: !!process.env.SQUARE_LOCATION_ID,
    hasApplicationId: !!process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID,
    configErrors: validation.missing,
    warnings: validation.warnings,
  };
}
