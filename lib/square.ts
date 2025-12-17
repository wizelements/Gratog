const DEBUG = process.env.DEBUG === "true" || process.env.VERBOSE === "true";
const debug = (...args) => { if (DEBUG) debug(...args); };

import { SquareClient, SquareEnvironment } from 'square';

const LOG_PREFIX = '[SQUARE]';

// Re-export for use in other files
export { SquareClient, SquareEnvironment };

/**
 * Get Square client instance with fresh environment variables
 * Creates a new client on each call to avoid Next.js module caching issues
 */
export function getSquareClient(): SquareClient {
  // Trim and normalize environment variables to avoid whitespace issues
  const accessToken = (process.env.SQUARE_ACCESS_TOKEN || '').trim();
  const envRaw = process.env.SQUARE_ENVIRONMENT || 'sandbox';
  const environment = envRaw.trim().toLowerCase();

  debug(`${LOG_PREFIX} 🔍 Square client configuration:`, {
    tokenPrefix: accessToken.substring(0, 10),
    tokenLength: accessToken.length,
    envRaw,
    envNormalized: environment,
    willUseEnvironment: environment === 'production' ? 'Production' : 'Sandbox'
  });

  if (!accessToken) {
    throw new Error('SQUARE_ACCESS_TOKEN is not configured');
  }

  // Validate environment value
  if (!['production', 'sandbox'].includes(environment)) {
    console.error(`${LOG_PREFIX} ❌ Invalid SQUARE_ENVIRONMENT="${envRaw}"`);
    throw new Error(
      `Invalid SQUARE_ENVIRONMENT="${envRaw}". Must be exactly "production" or "sandbox" (lowercase).`
    );
  }

  // Detect token/environment mismatch
  const tokenLooksSandbox = accessToken.startsWith('sandbox-');
  const tokenLooksProduction = accessToken.startsWith('EAAA') || accessToken.startsWith('sq0atp-');

  if (environment === 'production' && tokenLooksSandbox) {
    console.error(`${LOG_PREFIX} ❌ Sandbox token with production environment`);
    throw new Error(
      'Token/Environment mismatch: Sandbox token detected while SQUARE_ENVIRONMENT=production'
    );
  }

  if (environment === 'sandbox' && tokenLooksProduction) {
    console.warn(`${LOG_PREFIX} ⚠️  Production token with sandbox environment - this will cause 401 errors!`);
    console.warn(`${LOG_PREFIX} Fix: Set SQUARE_ENVIRONMENT=production in Vercel`);
  }

  const squareEnvironment = environment === 'production' 
    ? SquareEnvironment.Production 
    : SquareEnvironment.Sandbox;

  debug(`${LOG_PREFIX} ✅ Creating Square client for ${squareEnvironment}`);

  return new SquareClient({
    accessToken,
    environment: squareEnvironment,
  });
}

// Lazy getters for Square configuration - only validate when accessed
export function getSquareLocationId(): string {
  const locationId = process.env.SQUARE_LOCATION_ID;
  if (!locationId) {
    throw new Error('SQUARE_LOCATION_ID is not configured');
  }
  return locationId;
}

export function getSquareApplicationId(): string {
  const appId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID;
  if (!appId) {
    throw new Error('NEXT_PUBLIC_SQUARE_APPLICATION_ID is not configured');
  }
  return appId;
}

export function getSquareWebhookSignatureKey(): string {
  const key = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  if (!key) {
    throw new Error('SQUARE_WEBHOOK_SIGNATURE_KEY is not configured');
  }
  return key;
}

// Export for backwards compatibility
export const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID || '';
export const SQUARE_APPLICATION_ID = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID || '';
export const SQUARE_WEBHOOK_SIGNATURE_KEY = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || '';

// Helper to validate Square environment configuration
export function validateSquareConfig() {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN || '';
  const appId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID || '';
  const locationId = process.env.SQUARE_LOCATION_ID || '';
  const environment = process.env.SQUARE_ENVIRONMENT || 'sandbox';
  
  const required = {
    SQUARE_ACCESS_TOKEN: accessToken,
    SQUARE_LOCATION_ID: locationId,
    SQUARE_APPLICATION_ID: appId,
    SQUARE_ENVIRONMENT: environment
  };
  
  const missing = Object.entries(required)
    .filter(([key, value]) => !value)
    .map(([key]) => key);
  
  if (missing.length > 0) {
    throw new Error(`❌ Missing required Square configuration: ${missing.join(', ')}`);
  }
  
  // Validate token type - prevent using wrong credential types
  if (accessToken.startsWith('sq0csp-')) {
    throw new Error(
      '❌ SQUARE_ACCESS_TOKEN is a Client Secret (sq0csp-). ' +
      'Use Production Access Token (EAAA... or sq0atp-...) instead. ' +
      'Get it from Square Developer Dashboard → Credentials → Production.'
    );
  }
  
  if (accessToken.startsWith('sq0idp-') || accessToken.startsWith('sq0idb-')) {
    throw new Error(
      '❌ SQUARE_ACCESS_TOKEN appears to be an Application ID. ' +
      'Use Production Access Token (EAAA... or sq0atp-...) instead.'
    );
  }
  
  // Validate production environment consistency
  if (environment === 'production') {
    if (!appId.startsWith('sq0idp-')) {
      console.warn(
        '⚠️ Production environment but Application ID does not start with sq0idp-. ' +
        'This may indicate a sandbox Application ID in production.'
      );
    }
    
    if (accessToken.toLowerCase().includes('sandbox') || accessToken.startsWith('sandbox-')) {
      throw new Error(
        '❌ Sandbox token detected in production environment. ' +
        'Use production credentials for SQUARE_ENVIRONMENT=production.'
      );
    }
  }
  
  debug('✅ Square configuration validated:', {
    environment,
    tokenPrefix: accessToken.substring(0, 10) + '...',
    tokenLength: accessToken.length,
    applicationIdPrefix: appId.substring(0, 10) + '...',
    locationId: locationId
  });
  
  return {
    environment,
    isProduction: environment === 'production',
    locationId,
    applicationId: appId
  };
}

// Error handling helper for Square API responses
export function handleSquareError(error: any) {
  console.error('Square API Error:', error);
  
  if (error.errors && Array.isArray(error.errors)) {
    const errorMessages = error.errors.map((e: any) => e.detail || e.code || 'Unknown error');
    return {
      success: false,
      error: errorMessages.join(', '),
      details: error.errors
    };
  }
  
  return {
    success: false,
    error: error.message || 'Square API request failed',
    details: error
  };
}

// Type definitions for better type safety
export interface SquareLineItem {
  catalogObjectId: string;
  quantity: string;
  basePriceMoney?: {
    amount: bigint;
    currency: string;
  };
  name?: string;
  variationName?: string;
  metadata?: Record<string, string>;
}

export interface SquareOrderRequest {
  locationId: string;
  lineItems: SquareLineItem[];
  pricingOptions: {
    autoApplyTaxes: boolean;
    autoApplyDiscounts: boolean;
  };
  metadata?: Record<string, string>;
}

// Inventory management helpers
export interface InventoryCount {
  catalogObjectId: string;
  variationId: string;
  locationId: string;
  quantity: number;
  state: 'IN_STOCK' | 'SOLD' | 'RETURNED_BY_CUSTOMER' | 'RESERVED_FOR_SALE' | 'SOLD_ONLINE' | 'ORDERED_FROM_VENDOR' | 'RECEIVED_FROM_VENDOR';
}

// Catalog object types
export interface CatalogItem {
  id: string;
  type: 'ITEM';
  itemData: {
    name: string;
    description?: string;
    categoryId?: string;
    variations: CatalogItemVariation[];
  };
}

export interface CatalogItemVariation {
  id: string;
  type: 'ITEM_VARIATION';
  itemVariationData: {
    itemId: string;
    name?: string;
    sku?: string;
    priceMoney?: {
      amount: bigint;
      currency: string;
    };
    locationOverrides?: Array<{
      locationId: string;
      trackQuantity?: boolean;
      inventoryAlertType?: string;
      inventoryAlertThreshold?: number;
    }>;
  };
}
