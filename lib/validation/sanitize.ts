/**
 * Input Sanitization
 * Protects against XSS, SQL injection, and other malicious input
 */

/**
 * Sanitizes a string by removing potentially dangerous characters
 * Use this for user-provided text that will be stored or displayed
 */
export function sanitizeString(input: string | undefined | null): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    // Remove script tags and their content
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    // Remove iframe tags
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    // Remove event handlers
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove data: protocol (can be used for XSS)
    .replace(/data:text\/html/gi, '')
    // Remove other potentially dangerous HTML tags
    .replace(/<(object|embed|applet|meta|link|style)[^>]*>/gi, '')
    // Trim whitespace
    .trim();
}

/**
 * Sanitizes SQL-like input (prevents SQL injection attempts)
 */
export function sanitizeSQLInput(input: string | undefined | null): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    // Remove SQL comments
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // Remove dangerous SQL keywords (keep simple ones like SELECT for search)
    .replace(/;\s*(DROP|DELETE|TRUNCATE|ALTER|CREATE|INSERT|UPDATE)\s+/gi, '')
    // Remove escape sequences that might bypass filters
    .replace(/\\x[0-9A-Fa-f]{2}/g, '')
    .replace(/\\u[0-9A-Fa-f]{4}/g, '')
    .trim();
}

/**
 * Sanitizes HTML by stripping all tags
 * Use this when you want plain text only
 */
export function stripHTML(input: string | undefined | null): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    // Remove all HTML tags
    .replace(/<[^>]+>/g, '')
    // Decode common HTML entities
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .trim();
}

/**
 * Sanitizes a phone number to digits only
 */
export function sanitizePhone(phone: string | undefined | null): string {
  if (!phone || typeof phone !== 'string') {
    return '';
  }

  // Keep only digits
  return phone.replace(/\D/g, '');
}

/**
 * Sanitizes an email address
 */
export function sanitizeEmail(email: string | undefined | null): string {
  if (!email || typeof email !== 'string') {
    return '';
  }

  return email
    .toLowerCase()
    .trim()
    // Remove any characters that shouldn't be in an email
    .replace(/[<>()[\]\\,;:\s@"]+/g, (match) => {
      // Keep @ symbol and dots
      if (match === '@' || match === '.') return match;
      return '';
    });
}

/**
 * Sanitizes object by applying appropriate sanitization to each field
 */
export function sanitizeObject(obj: any, options: {
  stripHTML?: boolean;
  preventSQL?: boolean;
} = {}): any {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  const { stripHTML: shouldStripHTML = false, preventSQL = true } = options;

  const sanitized: any = Array.isArray(obj) ? [] : {};

  for (const key in obj) {
    const value = obj[key];

    if (typeof value === 'string') {
      let sanitizedValue = value;

      // Apply SQL sanitization if enabled
      if (preventSQL) {
        sanitizedValue = sanitizeSQLInput(sanitizedValue);
      }

      // Apply HTML stripping if enabled
      if (shouldStripHTML) {
        sanitizedValue = stripHTML(sanitizedValue);
      } else {
        // Otherwise just remove dangerous tags
        sanitizedValue = sanitizeString(sanitizedValue);
      }

      sanitized[key] = sanitizedValue;
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitizeObject(value, options);
    } else {
      // Keep other types as-is
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Validates that a string doesn't contain XSS attempts
 */
export function containsXSS(input: string | undefined | null): boolean {
  if (!input || typeof input !== 'string') {
    return false;
  }

  const xssPatterns = [
    /<script/i,
    /<iframe/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /<object/i,
    /<embed/i,
    /data:text\/html/i
  ];

  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Validates that a string doesn't contain SQL injection attempts
 */
export function containsSQLInjection(input: string | undefined | null): boolean {
  if (!input || typeof input !== 'string') {
    return false;
  }

  const sqlPatterns = [
    /;\s*DROP\s+/i,
    /;\s*DELETE\s+/i,
    /;\s*TRUNCATE\s+/i,
    /UNION\s+SELECT/i,
    /--/,
    /\/\*/,
    /\*\//,
    /'\s*OR\s+'1'\s*=\s*'1/i,
    /'\s*OR\s+1\s*=\s*1/i
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}
