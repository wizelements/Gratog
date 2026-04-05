/**
 * API Versioning for Validation Schemas
 * 
 * Allows schemas to evolve between API versions while maintaining backward compatibility.
 */

import { z } from 'zod';

// Current version schemas (import from main validation)
import {
  ProductUpdateSchema,
  CampaignCreateSchema,
  CouponCreateSchema,
  ReviewBulkActionSchema,
  InventoryAdjustmentSchema,
  OrderStatusUpdateSchema,
} from './index';

// ============================================================================
// V1 SCHEMAS (Current)
// ============================================================================

export const V1Schemas = {
  products: {
    update: ProductUpdateSchema,
    create: ProductUpdateSchema.extend({
      name: z.string().min(1).max(200),
      price: z.number().min(0).max(999999.99),
    }),
  },
  campaigns: {
    create: CampaignCreateSchema,
  },
  coupons: {
    create: CouponCreateSchema,
  },
  reviews: {
    bulkAction: ReviewBulkActionSchema,
  },
  inventory: {
    adjust: InventoryAdjustmentSchema,
  },
  orders: {
    updateStatus: OrderStatusUpdateSchema,
  },
} as const;

// ============================================================================
// V2 SCHEMAS (Future - Placeholder)
// ============================================================================

// When v2 is needed, define schemas here with breaking changes
// For now, v2 = v1 (backward compatible)
export const V2Schemas = V1Schemas;

// ============================================================================
// SCHEMA REGISTRY
// ============================================================================

export const SchemaRegistry = {
  v1: V1Schemas,
  v2: V2Schemas,
} as const;

export type SchemaVersion = keyof typeof SchemaRegistry;

/**
 * Get schema for specific API version
 */
export function getSchemaForVersion<T extends keyof typeof V1Schemas, K extends keyof typeof V1Schemas[T]>(
  version: SchemaVersion,
  domain: T,
  action: K
): typeof V1Schemas[T][K] | null {
  const versionedSchemas = SchemaRegistry[version];
  if (!versionedSchemas) return null;
  
  const domainSchemas = versionedSchemas[domain];
  if (!domainSchemas) return null;
  
  return domainSchemas[action] as typeof V1Schemas[T][K] || null;
}

/**
 * Validate with version awareness
 */
export function validateWithVersion<T>(
  body: unknown,
  version: SchemaVersion,
  domain: keyof typeof V1Schemas,
  action: string
): { success: true; data: T } | { success: false; error: string } {
  const schema = getSchemaForVersion(version, domain, action as any);
  
  if (!schema) {
    return { success: false, error: `No schema found for ${version}/${domain}/${action}` };
  }
  
  const result = schema.safeParse(body);
  
  if (!result.success) {
    const errorMessage = result.error.errors
      .map(e => `${e.path.join('.')}: ${e.message}`)
      .join('; ');
    return { success: false, error: errorMessage };
  }
  
  return { success: true, data: result.data as T };
}

// ============================================================================
// VERSION MIGRATION HELPERS
// ============================================================================

/**
 * Transform v1 request to v2 format
 * Add migration logic here when v2 is created
 */
export function migrateRequestV1ToV2<T>(data: T): T {
  // For now, no transformation needed
  // When v2 is created, add transformation logic here
  return data;
}

/**
 * Transform v2 response to v1 format (backward compatibility)
 */
export function migrateResponseV2ToV1<T>(data: T): T {
  // For now, no transformation needed
  return data;
}
