import { SquareClient, SquareEnvironment } from 'square';

// Initialize Square client with proper authentication (server-only)
export const square = new SquareClient({
  accessToken: process.env.SQUARE_ACCESS_TOKEN!,
  environment: process.env.SQUARE_ENVIRONMENT === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
});

// Required Square configuration
export const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID!;
export const SQUARE_APPLICATION_ID = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID!;

// Webhook signature verification key (server-only)
export const SQUARE_WEBHOOK_SIGNATURE_KEY = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY!;

// Helper to validate Square environment configuration
export function validateSquareConfig() {
  const required = {
    SQUARE_ACCESS_TOKEN: process.env.SQUARE_ACCESS_TOKEN,
    SQUARE_LOCATION_ID: process.env.SQUARE_LOCATION_ID,
    SQUARE_APPLICATION_ID: process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID,
    SQUARE_ENVIRONMENT: process.env.SQUARE_ENVIRONMENT || 'sandbox'
  };
  
  const missing = Object.entries(required)
    .filter(([key, value]) => !value)
    .map(([key]) => key);
  
  if (missing.length > 0) {
    throw new Error(`Missing required Square configuration: ${missing.join(', ')}`);
  }
  
  return {
    environment: process.env.SQUARE_ENVIRONMENT || 'sandbox',
    isProduction: process.env.SQUARE_ENVIRONMENT === 'production',
    locationId: SQUARE_LOCATION_ID,
    applicationId: SQUARE_APPLICATION_ID
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