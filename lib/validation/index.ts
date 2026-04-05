/**
 * Unified Validation Layer for Gratog Admin
 * 
 * Uses Zod for type-safe, schema-based validation
 * All admin request bodies and query parameters must be validated
 */

import { z } from 'zod';

// ============================================================================
// COMMON VALIDATORS
// ============================================================================

export const ObjectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format');

export const EmailSchema = z.string().email('Invalid email address');

export const PasswordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

export const UrlSchema = z.string().url('Invalid URL format');

export const PriceSchema = z.number().min(0).max(999999.99);

export const StockSchema = z.number().int().min(0).max(999999);

// ============================================================================
// PRODUCT VALIDATION SCHEMAS
// ============================================================================

export const ProductUpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional(),
  category: z.string().min(1).max(100).optional(),
  price: PriceSchema.optional(),
  inStock: z.boolean().optional(),
  lowStockThreshold: z.number().int().min(0).max(10000).optional(),
  featured: z.boolean().optional(),
  // Explicitly reject protected fields
  id: z.never().optional(),
  _id: z.never().optional(),
  squareId: z.never().optional(),
  createdAt: z.never().optional(),
  updatedAt: z.never().optional(),
  syncedAt: z.never().optional(),
}).strict('Unknown fields are not allowed');

export const ProductCreateSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  category: z.string().min(1).max(100),
  price: PriceSchema,
  inStock: z.boolean().default(true),
  stock: StockSchema.default(0),
  lowStockThreshold: z.number().int().min(0).max(10000).default(5),
  images: z.array(UrlSchema).max(10).optional(),
  featured: z.boolean().default(false),
}).strict();

// ============================================================================
// INVENTORY VALIDATION SCHEMAS
// ============================================================================

export const InventoryAdjustmentSchema = z.object({
  adjustment: z.number().int().min(-10000).max(10000),
  reason: z.string().min(1).max(500).optional(),
}).strict();

// ============================================================================
// CAMPAIGN VALIDATION SCHEMAS
// ============================================================================

export const CampaignCreateSchema = z.object({
  name: z.string().min(1).max(200),
  subject: z.string().min(1).max(200),
  preheader: z.string().max(200).optional(),
  body: z.string().min(1).max(50000),
  segmentCriteria: z.object({
    purchaseFrequency: z.enum(['first-time', 'repeat', 'loyal']).optional(),
    purchaseAmount: z.enum(['low', 'medium', 'high']).optional(),
    rewardsTier: z.enum(['bronze', 'silver', 'gold', 'platinum']).optional(),
    challengeParticipation: z.enum(['active', 'completed', 'none']).optional(),
    inactive: z.boolean().optional(),
    productPreferences: z.array(z.string()).optional(),
  }).optional(),
  scheduledFor: z.string().datetime().optional(),
}).strict();

export const CampaignSendSchema = z.object({
  campaignId: z.string().min(1),
}).strict();

// ============================================================================
// REVIEW VALIDATION SCHEMAS
// ============================================================================

export const ReviewBulkActionSchema = z.object({
  reviewIds: z.array(ObjectIdSchema).min(1).max(1000),
  action: z.enum(['approve', 'reject', 'hide', 'unhide']),
}).strict();

export const ReviewQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional(),
  productId: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
}).strict();

// ============================================================================
// COUPON VALIDATION SCHEMAS
// ============================================================================

export const CouponCreateSchema = z.object({
  code: z.string().min(3).max(50).regex(/^[A-Z0-9_-]+$/, 'Coupon code must be alphanumeric'),
  discountAmount: z.number().min(0).max(10000).optional(),
  discountPercent: z.number().min(0).max(100).optional(),
  freeShipping: z.boolean().default(false),
  maxUses: z.number().int().min(1).optional(),
  expiresAt: z.string().datetime().optional(),
  minimumOrderAmount: z.number().min(0).optional(),
}).strict().refine(
  data => data.discountAmount || data.discountPercent || data.freeShipping,
  { message: 'Coupon must have a discount amount, percentage, or free shipping' }
);

// ============================================================================
// ORDER VALIDATION SCHEMAS
// ============================================================================

export const OrderStatusUpdateSchema = z.object({
  status: z.enum([
    'pending',
    'confirmed',
    'preparing',
    'ready',
    'delivered',
    'picked_up',
    'shipped',
    'cancelled',
    'refunded',
  ]),
  notes: z.string().max(1000).optional(),
}).strict();

export const OrderRefundSchema = z.object({
  amount: z.number().int().min(1).optional(), // in cents, optional for full refund
  reason: z.string().min(1).max(500),
}).strict();

// ============================================================================
// USER/ADMIN VALIDATION SCHEMAS
// ============================================================================

export const AdminCreateSchema = z.object({
  email: EmailSchema,
  name: z.string().min(1).max(100),
  password: PasswordSchema,
  role: z.enum(['admin', 'editor', 'viewer']),
}).strict();

export const AdminUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  role: z.enum(['admin', 'editor', 'viewer']).optional(),
  isActive: z.boolean().optional(),
  password: PasswordSchema.optional(),
}).strict();

// ============================================================================
// SETUP/INIT VALIDATION SCHEMAS
// ============================================================================

export const SetupSchema = z.object({
  secret: z.string().min(1),
}).strict();

export const EmergencyInitSchema = z.object({
  emergencySecret: z.string().min(1),
  email: EmailSchema,
  password: PasswordSchema,
  name: z.string().min(1).max(100).optional(),
}).strict();

// ============================================================================
// SANITIZATION HELPERS
// ============================================================================

/**
 * Sanitize HTML content to prevent XSS
 * Removes script tags and dangerous attributes
 */
export function sanitizeHtml(input: string): string {
  return input
    // Remove script tags and their contents
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    // Remove event handlers
    .replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '')
    // Remove javascript: URLs
    .replace(/javascript:/gi, '')
    // Remove data: URLs that could execute JS
    .replace(/data:text\/html[^,]*/gi, '')
    // Remove iframe tags
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    // Remove object/embed tags
    .replace(/<(object|embed)[^>]*>.*?<\/\1>/gi, '')
    // Remove form tags (to prevent CSRF via form submission)
    .replace(/<(form|input|button|textarea)[^>]*>/gi, '')
    // Remove style tags that could hide content
    .replace(/<style[^>]*>.*?<\/style>/gi, '');
}

/**
 * Validate and sanitize a request body
 * Returns { success, data, error }
 */
export function validateBody<T>(
  body: unknown,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(body);
  
  if (!result.success) {
    const errorMessage = result.error.errors
      .map(e => `${e.path.join('.')}: ${e.message}`)
      .join('; ');
    return { success: false, error: errorMessage };
  }
  
  return { success: true, data: result.data };
}

/**
 * Validate and sanitize query parameters
 */
export function validateQuery<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  const obj: Record<string, string | null> = {};
  searchParams.forEach((value, key) => {
    obj[key] = value;
  });
  
  const result = schema.safeParse(obj);
  
  if (!result.success) {
    const errorMessage = result.error.errors
      .map(e => `${e.path.join('.')}: ${e.message}`)
      .join('; ');
    return { success: false, error: errorMessage };
  }
  
  return { success: true, data: result.data };
}

/**
 * Strip unknown fields from an object
 * Only keeps fields defined in the whitelist
 */
export function whitelistFields<T extends Record<string, unknown>>(
  obj: T,
  allowedFields: string[]
): Partial<T> {
  const result: Partial<T> = {};
  
  for (const field of allowedFields) {
    if (field in obj) {
      result[field as keyof T] = obj[field as keyof T];
    }
  }
  
  return result;
}

/**
 * Check if a string is a valid MongoDB ObjectId
 */
export function isValidObjectId(id: string): boolean {
  return ObjectIdSchema.safeParse(id).success;
}

/**
 * Validate a product ID format
 * Supports both MongoDB ObjectId and custom IDs
 */
export function validateProductId(id: string): boolean {
  // Allow MongoDB ObjectId format
  if (isValidObjectId(id)) return true;
  
  // Allow Square catalog item IDs (alphanumeric with hyphens)
  if (/^[A-Za-z0-9_-]+$/.test(id) && id.length >= 8 && id.length <= 64) {
    return true;
  }
  
  return false;
}

/**
 * Clean and normalize a search query string
 */
export function normalizeSearchQuery(query: string): string {
  return query
    .trim()
    .replace(/[\s]+/g, ' ') // Collapse multiple spaces
    .slice(0, 200); // Limit length
}

/**
 * Validate file upload metadata
 */
export const FileUploadSchema = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  size: z.number().int().min(1).max(10 * 1024 * 1024), // Max 10MB
}).strict();
