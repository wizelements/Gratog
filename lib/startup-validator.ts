const DEBUG = process.env.DEBUG === "true" || process.env.VERBOSE === "true";
const debug = (...args) => { if (DEBUG) debug(...args); };

/**
 * Production Startup Validator
 * Validates critical configuration before accepting requests
 */

import { validateSquareConfig } from './square';

export interface StartupValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  environment: string;
}

export function validateStartupConfig(): StartupValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const environment = process.env.NODE_ENV || 'development';
  const isProduction = environment === 'production';
  
  debug('🔍 Running startup validation...');
  
  // 1. Database Configuration
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URL;
  if (!mongoUri) {
    errors.push('MONGODB_URI is not configured');
  } else if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
    errors.push('MONGODB_URI has invalid format');
  }
  
  const dbName = process.env.DATABASE_NAME || process.env.DB_NAME;
  if (!dbName) {
    warnings.push('DATABASE_NAME not set, using default');
  }
  
  // 2. Square Configuration
  try {
    validateSquareConfig();
    debug('  ✅ Square configuration valid');
  } catch (error) {
    if (isProduction) {
      errors.push(`Square config error: ${(error as Error).message}`);
    } else {
      warnings.push(`Square config error: ${(error as Error).message}`);
    }
  }
  
  // 3. Email Service Configuration
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey && isProduction) {
    warnings.push('RESEND_API_KEY not configured - email notifications will fail');
  }
  
  // 4. Application URLs
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (!baseUrl) {
    warnings.push('NEXT_PUBLIC_BASE_URL not set');
  } else if (!baseUrl.startsWith('http')) {
    errors.push('NEXT_PUBLIC_BASE_URL must start with http:// or https://');
  }
  
  // 5. Fulfillment Configuration
  const deliveryEnabled = process.env.NEXT_PUBLIC_FULFILLMENT_DELIVERY;
  const deliveryZips = process.env.DELIVERY_ZIP_WHITELIST;
  
  if (deliveryEnabled === 'enabled' && !deliveryZips) {
    warnings.push('Delivery enabled but DELIVERY_ZIP_WHITELIST not configured');
  }
  
  // 6. Security Configuration
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret && isProduction) {
    warnings.push('ADMIN_SECRET not configured - admin features may not work');
  }
  
  // 7. Feature Flags
  const checkoutV2 = process.env.FEATURE_CHECKOUT_V2;
  if (checkoutV2 !== 'on') {
    warnings.push('FEATURE_CHECKOUT_V2 not enabled');
  }
  
  // Summary
  const valid = errors.length === 0;
  
  if (valid) {
    debug('  ✅ Startup validation passed');
    if (warnings.length > 0) {
      debug(`  ⚠️  ${warnings.length} warnings:`);
      warnings.forEach(w => debug(`     - ${w}`));
    }
  } else {
    console.error('  ❌ Startup validation failed:');
    errors.forEach(e => console.error(`     - ${e}`));
  }
  
  return {
    valid,
    errors,
    warnings,
    environment
  };
}

export function requireValidStartup() {
  const result = validateStartupConfig();
  
  if (!result.valid) {
    console.error('❌ CRITICAL: Application cannot start due to configuration errors');
    console.error('Errors:', result.errors);
    
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        `Production startup failed: ${result.errors.join(', ')}`
      );
    }
  }
  
  return result;
}

// Log startup validation on module load (runtime only, not during build)
if (process.env.NODE_ENV !== 'test' && typeof window === 'undefined' && process.env.VERCEL_ENV !== undefined) {
  try {
    validateStartupConfig();
  } catch (error) {
    console.error('Startup validation error:', { error: error instanceof Error ? error.message : error, stack: error instanceof Error ? error.stack : undefined });
  }
}
