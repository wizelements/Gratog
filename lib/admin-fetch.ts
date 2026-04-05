/**
 * Hardened Admin Fetch Client
 * 
 * Automatically handles CSRF tokens, authentication, and error handling.
 * This is the ONLY way admin pages should make API calls.
 */

import { logger } from '@/lib/logger';

// ============================================================================
// CSRF TOKEN MANAGEMENT
// ============================================================================

let csrfToken: string | null = null;
let csrfPromise: Promise<string | null> | null = null;

/**
 * Initialize CSRF token from cookie or fetch fresh
 */
async function getCsrfToken(): Promise<string | null> {
  // Return cached token
  if (csrfToken) {
    return csrfToken;
  }
  
  // Return pending promise
  if (csrfPromise) {
    return csrfPromise;
  }
  
  // Try to get from cookie first
  const cookieMatch = document.cookie.match(/admin_csrf=([^;]+)/);
  if (cookieMatch) {
    csrfToken = cookieMatch[1];
    return csrfToken;
  }
  
  // Fetch new token
  csrfPromise = fetchCsrfToken();
  return csrfPromise;
}

/**
 * Fetch CSRF token from server
 */
async function fetchCsrfToken(): Promise<string | null> {
  try {
    const response = await fetch('/api/admin/auth/csrf', {
      method: 'GET',
      credentials: 'include',
    });
    
    if (!response.ok) {
      logger.error('CSRF', 'Failed to fetch CSRF token', { status: response.status });
      return null;
    }
    
    const data = await response.json();
    
    if (data.success && data.csrfToken) {
      csrfToken = data.csrfToken;
      return csrfToken;
    }
    
    return null;
    
  } catch (error) {
    logger.error('CSRF', 'CSRF token fetch error', error);
    return null;
    
  } finally {
    csrfPromise = null;
  }
}

/**
 * Clear CSRF token (e.g., after logout)
 */
export function clearCsrfToken(): void {
  csrfToken = null;
  csrfPromise = null;
}

// ============================================================================
// ADMIN FETCH
// ============================================================================

interface FetchOptions extends Omit<RequestInit, 'headers'> {
  skipCsrf?: boolean; // Skip CSRF for GET requests
  retryCount?: number;
  headers?: Record<string, string>;
}

interface FetchResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  status: number;
  rateLimited?: boolean;
  retryAfter?: number;
}

/**
 * Make an authenticated admin API request
 * Automatically handles CSRF tokens for mutations
 */
export async function adminFetch<T>(
  url: string,
  options: FetchOptions = {}
): Promise<FetchResult<T>> {
  const {
    skipCsrf = false,
    retryCount = 0,
    headers = {},
    ...fetchOptions
  } = options;
  
  // Determine if this is a mutation
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(fetchOptions.method || 'GET');
  
  // Build headers
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...headers,
  };
  
  // Add CSRF token for mutations
  if (isMutation && !skipCsrf) {
    const token = await getCsrfToken();
    
    if (!token) {
      logger.error('CSRF', 'CSRF token not available');
      return {
        success: false,
        error: 'Security token not available. Please refresh the page.',
        status: 403,
      };
    }
    
    requestHeaders['x-csrf-token'] = token;
  }
  
  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers: requestHeaders,
      credentials: 'include',
    });
    
    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      
      return {
        success: false,
        error: 'Rate limit exceeded. Please try again later.',
        status: 429,
        rateLimited: true,
        retryAfter: retryAfter ? parseInt(retryAfter, 10) : 60,
      };
    }
    
    // Handle CSRF errors (token may have expired)
    if (response.status === 403) {
      const data = await response.json().catch(() => ({}));
      
      if (data.code === 'CSRF_INVALID' && retryCount < 1) {
        // Clear token and retry once
        clearCsrfToken();
        return adminFetch(url, { ...options, retryCount: retryCount + 1 });
      }
    }
    
    // Handle auth errors
    if (response.status === 401) {
      // Redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/admin/login?redirect=' + encodeURIComponent(window.location.pathname);
      }
      
      return {
        success: false,
        error: 'Session expired. Please log in again.',
        status: 401,
      };
    }
    
    // Parse response
    const data = await response.json();
    
    return {
      success: response.ok && data.success,
      data: data.data || data,
      error: data.error,
      status: response.status,
    };
    
  } catch (error) {
    logger.error('FETCH', 'Admin fetch error', { url, error });
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
      status: 0,
    };
  }
}

/**
 * Convenience methods
 */
export const adminApi = {
  get: <T>(url: string, options?: Omit<FetchOptions, 'method'>) =>
    adminFetch<T>(url, { ...options, method: 'GET', skipCsrf: true }),
    
  post: <T>(url: string, body: unknown, options?: Omit<FetchOptions, 'method' | 'body'>) =>
    adminFetch<T>(url, { ...options, method: 'POST', body: JSON.stringify(body) }),
    
  put: <T>(url: string, body: unknown, options?: Omit<FetchOptions, 'method' | 'body'>) =>
    adminFetch<T>(url, { ...options, method: 'PUT', body: JSON.stringify(body) }),
    
  patch: <T>(url: string, body: unknown, options?: Omit<FetchOptions, 'method' | 'body'>) =>
    adminFetch<T>(url, { ...options, method: 'PATCH', body: JSON.stringify(body) }),
    
  delete: <T>(url: string, options?: Omit<FetchOptions, 'method'>) =>
    adminFetch<T>(url, { ...options, method: 'DELETE' }),
};

// ============================================================================
// HOOK FOR REACT
// ============================================================================

import { useState, useEffect, useCallback } from 'react';

interface UseAdminFetchOptions<T> {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  deps?: unknown[];
  enabled?: boolean;
}

interface UseAdminFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useAdminFetch<T>(options: UseAdminFetchOptions<T>): UseAdminFetchResult<T> {
  const { url, method = 'GET', body, deps = [], enabled = true } = options;
  
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fetchData = useCallback(async () => {
    if (!enabled) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let result: FetchResult<T>;
      
      switch (method) {
        case 'GET':
          result = await adminApi.get<T>(url);
          break;
        case 'POST':
          result = await adminApi.post<T>(url, body);
          break;
        case 'PUT':
          result = await adminApi.put<T>(url, body);
          break;
        case 'PATCH':
          result = await adminApi.patch<T>(url, body);
          break;
        case 'DELETE':
          result = await adminApi.delete<T>(url);
          break;
        default:
          throw new Error(`Unsupported method: ${method}`);
      }
      
      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.error || 'Request failed');
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [url, method, body, enabled, ...deps]);
  
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  return { data, loading, error, refetch: fetchData };
}
