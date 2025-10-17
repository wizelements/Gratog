/**
 * Retry utility with exponential backoff and jitter
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  jitterMs?: number;
  retryableErrors?: (error: any) => boolean;
  onRetry?: (attempt: number, error: any) => void;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  jitterMs: 500,
  retryableErrors: () => true,
  onRetry: () => {},
};

/**
 * Retry an async operation with exponential backoff
 */
export async function retry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // Don't retry if this is the last attempt
      if (attempt === opts.maxAttempts) {
        break;
      }

      // Check if error is retryable
      if (!opts.retryableErrors(error)) {
        throw error;
      }

      // Calculate delay with exponential backoff
      const baseDelay = Math.min(
        opts.initialDelayMs * Math.pow(opts.backoffMultiplier, attempt - 1),
        opts.maxDelayMs
      );

      // Add jitter to prevent thundering herd
      const jitter = Math.random() * opts.jitterMs;
      const delay = baseDelay + jitter;

      opts.onRetry(attempt, error);

      // Wait before retrying
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Determine if an HTTP error is retryable
 */
export function isRetryableHttpError(error: any): boolean {
  // Retry on network errors
  if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
    return true;
  }

  // Retry on specific HTTP status codes
  if (error.response?.status) {
    const status = error.response.status;
    return (
      status === 408 || // Request Timeout
      status === 429 || // Too Many Requests
      status === 500 || // Internal Server Error
      status === 502 || // Bad Gateway
      status === 503 || // Service Unavailable
      status === 504    // Gateway Timeout
    );
  }

  return false;
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry wrapper specifically for Square API calls
 */
export async function retrySquareApi<T>(
  operation: () => Promise<T>
): Promise<T> {
  return retry(operation, {
    maxAttempts: 3,
    initialDelayMs: 1000,
    maxDelayMs: 5000,
    retryableErrors: (error) => {
      // Don't retry on client errors (4xx except 429)
      if (error.response?.status >= 400 && error.response?.status < 500) {
        return error.response.status === 429; // Only retry rate limits
      }
      return isRetryableHttpError(error);
    },
    onRetry: (attempt, error) => {
      console.warn(`Retrying Square API call (attempt ${attempt}):`, error.message);
    },
  });
}

/**
 * Retry wrapper for email sending
 */
export async function retryEmailSend<T>(
  operation: () => Promise<T>
): Promise<T> {
  return retry(operation, {
    maxAttempts: 3,
    initialDelayMs: 2000,
    maxDelayMs: 10000,
    retryableErrors: isRetryableHttpError,
    onRetry: (attempt, error) => {
      console.warn(`Retrying email send (attempt ${attempt}):`, error.message);
    },
  });
}

/**
 * Retry wrapper for SMS sending
 */
export async function retrySmsSend<T>(
  operation: () => Promise<T>
): Promise<T> {
  return retry(operation, {
    maxAttempts: 3,
    initialDelayMs: 2000,
    maxDelayMs: 10000,
    retryableErrors: isRetryableHttpError,
    onRetry: (attempt, error) => {
      console.warn(`Retrying SMS send (attempt ${attempt}):`, error.message);
    },
  });
}
