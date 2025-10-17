import { z } from "zod";

export const ImageZ = z.object({
  url: z.string().url(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  alt: z.string().optional(),
  position: z.number().int().optional()
});

export const VariantZ = z.object({
  sku: z.string().min(1),
  options: z.record(z.string(), z.string()),
  price_cents: z.number().int().nonnegative(),
  currency: z.string().length(3),
  compare_at_cents: z.number().int().nonnegative().optional(),
  availability: z.enum(["in_stock", "low", "out", "unknown"]).default("unknown")
});

export const ProductZ = z.object({
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().default(""),
  brand: z.string().optional(),
  category: z.string().optional(),
  images: z.array(ImageZ).default([]),
  variants: z.array(VariantZ).min(1),
  source_url: z.string().url(),
  handle: z.string().optional(),
  active: z.boolean().default(true)
});

export const CatalogQueryZ = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  in_stock: z.enum(["1", "0"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional()
});

export const ReingestRequestZ = z.object({
  url: z.string().url(),
  force: z.boolean().default(false)
});

export const ReindexRequestZ = z.object({
  full: z.boolean().default(false),
  category: z.string().optional()
});

// Type exports
export type Product = z.infer<typeof ProductZ>;
export type Variant = z.infer<typeof VariantZ>;
export type ProductImage = z.infer<typeof ImageZ>;
export type CatalogQuery = z.infer<typeof CatalogQueryZ>;
export type ReingestRequest = z.infer<typeof ReingestRequestZ>;
export type ReindexRequest = z.infer<typeof ReindexRequestZ>;

// Database types
export interface DBProduct {
  id: string;
  slug: string;
  title: string;
  description: string;
  brand?: string;
  category?: string;
  handle?: string;
  source_id: string;
  active: boolean;
  first_seen_at: Date;
  last_seen_at: Date;
  version: number;
  hash: string;
}

export interface DBVariant {
  id: string;
  product_id: string;
  sku: string;
  option_values: Record<string, string>;
  price_cents: number;
  currency: string;
  compare_at_cents?: number;
}

export interface DBInventoryLevel {
  id: string;
  variant_id: string;
  quantity: number;
  status: 'in_stock' | 'low' | 'out' | 'unknown';
  last_checked_at: Date;
}

export interface DBImage {
  id: string;
  product_id: string;
  url: string;
  width?: number;
  height?: number;
  alt?: string;
  position?: number;
}

export interface DBLink {
  id: string;
  product_id: string;
  url: string;
  last_crawled_at?: Date;
  last_hash?: string;
  etag?: string;
  last_modified?: string;
  crawl_status: 'pending' | 'success' | 'failed' | 'quarantined';
}

export interface CatalogResponse {
  items: Product[];
  nextCursor?: string;
  total?: number;
  meta?: {
    source?: string;
    cached?: boolean;
    timestamp?: string;
    [key: string]: any;
  };
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: boolean;
    redis: boolean;
    ingestion: boolean;
  };
  metrics: {
    total_products: number;
    total_variants: number;
    crawl_success_rate: number;
    avg_freshness_minutes: number;
    unknown_stock_percentage: number;
  };
  lag: {
    oldest_crawl_minutes: number;
    pending_crawls: number;
  };
}
