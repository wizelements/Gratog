/**
 * Response Sanitizer
 * Ensures API responses don't leak sensitive information
 */

interface SanitizationConfig {
  allowedFields?: string[];
  blockedPatterns?: RegExp[];
}

const DEFAULT_BLOCKED_PATTERNS = [
  /api[_-]?key/gi,
  /secret/gi,
  /token/gi,
  /password/gi,
  /bearer/gi,
  /mongodb/gi,
  /database[_-]?url/gi,
  /connection[_-]?string/gi,
  /env\./gi,
  /process\.env/gi
];

/**
 * Sanitize an error message to remove sensitive information
 */
export function sanitizeErrorMessage(message: string): string {
  if (!message) return 'An error occurred';
  
  let sanitized = message;
  
  // Remove common sensitive patterns
  DEFAULT_BLOCKED_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]');
  });
  
  // Truncate very long messages
  if (sanitized.length > 500) {
    sanitized = sanitized.substring(0, 497) + '...';
  }
  
  return sanitized;
}

/**
 * Sanitize an entire object/response
 */
export function sanitizeResponse<T>(data: T, config?: SanitizationConfig): T {
  if (typeof data !== 'object' || data === null) {
    return data;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeResponse(item, config)) as T;
  }
  
  const sanitized: any = {};
  
  for (const [key, value] of Object.entries(data)) {
    // Check if key matches blocked patterns
    const isBlocked = DEFAULT_BLOCKED_PATTERNS.some(pattern => 
      pattern.test(key)
    );
    
    if (isBlocked) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'string') {
      sanitized[key] = sanitizeErrorMessage(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeResponse(value, config);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized as T;
}

/**
 * Create a safe error response
 */
export function createSafeErrorResponse(
  error: Error | unknown,
  defaultMessage: string = 'An error occurred'
) {
  let message = defaultMessage;
  
  if (error instanceof Error) {
    message = sanitizeErrorMessage(error.message);
  } else if (typeof error === 'string') {
    message = sanitizeErrorMessage(error);
  }
  
  return {
    error: message,
    success: false
  };
}
