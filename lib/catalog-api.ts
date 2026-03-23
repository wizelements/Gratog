'use client';

import { Product, CatalogResponse } from '@/types/product';
import useSWR from 'swr';

// API base configuration
const API_BASE = process.env.NODE_ENV === 'production' 
  ? process.env.NEXT_PUBLIC_BASE_URL + '/api/v1'
  : '/api/v1';

// SWR fetcher with error handling
const fetcher = async (url: string) => {
  const response = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'Cache-Control': 'no-cache'
    }
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  
  return response.json();
};

// Hooks for catalog data
export function useCatalog(params?: {
  q?: string;
  category?: string;
  in_stock?: boolean;
  limit?: number;
  cursor?: string;
}) {
  const queryParams = new URLSearchParams();
  
  if (params?.q) queryParams.set('q', params.q);
  if (params?.category) queryParams.set('category', params.category);
  if (params?.in_stock !== undefined) queryParams.set('in_stock', params.in_stock ? '1' : '0');
  if (params?.limit) queryParams.set('limit', params.limit.toString());
  if (params?.cursor) queryParams.set('cursor', params.cursor);
  
  const url = `${API_BASE}/catalog?${queryParams.toString()}`;
  
  const { data, error, isLoading, mutate } = useSWR<CatalogResponse>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 30000, // 30 seconds
      errorRetryInterval: 5000,
      errorRetryCount: 3
    }
  );
  
  return {
    products: data?.items || [],
    nextCursor: data?.nextCursor,
    total: data?.total,
    isLoading,
    error,
    refresh: mutate,
    meta: data?.meta
  };
}

export function useProduct(slug: string, validate?: boolean) {
  const queryParams = validate ? '?validate=1' : '';
  const url = slug ? `${API_BASE}/products/${encodeURIComponent(slug)}${queryParams}` : null;
  
  const { data, error, isLoading, mutate } = useSWR<Product & { meta?: any }>(
    url,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: validate ? 10000 : 60000, // Shorter cache for validated requests
      errorRetryInterval: 3000,
      errorRetryCount: 2
    }
  );
  
  return {
    product: data,
    isLoading,
    error,
    refresh: mutate,
    meta: data?.meta
  };
}

// Health check hook
export function useHealth() {
  const { data, error, isLoading } = useSWR(
    `${API_BASE}/health`,
    fetcher,
    {
      refreshInterval: 30000, // Check every 30 seconds
      revalidateOnFocus: false
    }
  );
  
  return {
    health: data,
    isHealthy: data?.status === 'healthy',
    isDegraded: data?.status === 'degraded',
    isUnhealthy: data?.status === 'unhealthy',
    isLoading,
    error
  };
}

// Admin API functions
export async function reingestProduct(url: string, force: boolean = false): Promise<any> {
  const apiKey = process.env.NEXT_PUBLIC_ADMIN_API_KEY;
  if (!apiKey) {
    throw new Error('Admin API key not configured');
  }
  
  const response = await fetch(`${API_BASE}/admin/reingest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({ url, force })
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  
  return response.json();
}

export async function reindexCatalog(full: boolean = false, category?: string): Promise<any> {
  const apiKey = process.env.NEXT_PUBLIC_ADMIN_API_KEY;
  if (!apiKey) {
    throw new Error('Admin API key not configured');
  }
  
  const response = await fetch(`${API_BASE}/admin/reindex`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({ full, category })
  });
  
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  
  return response.json();
}

// Source toggle utilities
export function getCatalogSource(): 'product_link' | 'square' {
  return (process.env.NEXT_PUBLIC_CATALOG_SOURCE as 'product_link' | 'square') || 'product_link';
}

export function isUsingProductLink(): boolean {
  return getCatalogSource() === 'product_link';
}

export function isUsingSquare(): boolean {
  return getCatalogSource() === 'square';
}

// Utility functions
export function buildProductUrl(slug: string): string {
  return `/product/${encodeURIComponent(slug)}`;
}

export function buildCatalogUrl(params?: {
  q?: string;
  category?: string;
  in_stock?: boolean;
}): string {
  const queryParams = new URLSearchParams();
  
  if (params?.q) queryParams.set('q', params.q);
  if (params?.category) queryParams.set('category', params.category);
  if (params?.in_stock !== undefined) queryParams.set('in_stock', params.in_stock ? '1' : '0');
  
  const query = queryParams.toString();
  return `/catalog${query ? `?${query}` : ''}`;
}

// Format helpers
export function formatPrice(cents: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(cents / 100);
}

export function formatAvailability(availability: string): {
  label: string;
  color: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
} {
  switch (availability) {
    case 'in_stock':
      return {
        label: 'In Stock',
        color: 'text-green-600',
        badgeVariant: 'default'
      };
    case 'low':
      return {
        label: 'Low Stock',
        color: 'text-yellow-600',
        badgeVariant: 'secondary'
      };
    case 'out':
      return {
        label: 'Available for Preorder',
        color: 'text-emerald-600',
        badgeVariant: 'secondary'
      };
    default:
      return {
        label: 'Check Availability',
        color: 'text-gray-600',
        badgeVariant: 'outline'
      };
  }
}

// Error boundary for SWR - removed JSX from this file
// Use a separate component file if needed
