/**
 * Square API retry logic with exponential backoff
 * Retries transient failures while avoiding auth/validation errors
 */

import { sqFetch } from './square-rest';

const TRANSIENT_ERRORS = [
  'timeout',
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  'ENETUNREACH',
  '429', // Rate limit
  '503', // Service unavailable
  '504', // Gateway timeout
];

function isTransientError(error: Error): boolean {
  const message = error.message || '';
  
  // Check for Square API status codes that are transient
  if (error instanceof Error && (error as any).status) {
    const status = (error as any).status;
    // Only retry 5xx errors and 429 (rate limit)
    return [429, 500, 502, 503, 504].includes(status);
  }
  
  // Check for network-level errors
  return TRANSIENT_ERRORS.some(err => message.includes(err));
}

/**
 * Retry a Square API call with exponential backoff
 * - Max 2 retries (3 attempts total)
 * - Exponential backoff: 100ms * 2^(attempt-1) + jitter
 * - Never retries auth errors (401, 403) or validation errors (400)
 */
export async function sqFetchWithRetry<T>(
  env: 'sandbox' | 'production',
  path: string,
  token: string,
  init: RequestInit = {},
  maxRetries: number = 2
): Promise<T> {
  let lastError: Error = new Error('Unknown error');
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await sqFetch<T>(env, path, token, init);
    } catch (error) {
      lastError = error as Error;
      
      // Never retry auth errors
      if ((error as any)?.status === 401 || (error as any)?.status === 403) {
        console.error(`Square API auth error (${(error as any).status}):`, (error as Error).message);
        throw error;
      }
      
      // Never retry validation errors (except 429)
      if ((error as any)?.status === 400) {
        console.error(`Square API validation error:`, (error as Error).message);
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === maxRetries + 1) {
        console.error(`Square API request failed after ${attempt} attempts:`, (error as Error).message);
        throw lastError;
      }
      
      // Check if this is a transient error worth retrying
      if (!isTransientError(error as Error)) {
        console.error(`Square API non-transient error:`, (error as Error).message);
        throw error;
      }
      
      // Calculate exponential backoff with jitter
      const baseDelay = 100 * Math.pow(2, attempt - 1);
      const jitter = Math.random() * 100;
      const delay = baseDelay + jitter;
      
      console.log(
        `Square API request failed (attempt ${attempt}/${maxRetries + 1}), ` +
        `retrying in ${Math.round(delay)}ms...`,
        (error as Error).message
      );
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

/**
 * Example usage in square-ops.ts:
 * 
 * export async function createPayment(input: {...}) {
 *   return sqFetchWithRetry(env, "/v2/payments", token, {
 *     method: "POST",
 *     body: JSON.stringify(paymentBody),
 *   });
 * }
 */
