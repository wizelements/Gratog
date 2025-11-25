/**
 * Customer Data Validation
 * Ensures customer information meets requirements before payment processing
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates email address using RFC-compliant regex
 */
export function validateEmail(email: string | undefined | null): ValidationResult {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email address is required' };
  }

  const trimmedEmail = email.trim();
  
  if (trimmedEmail.length === 0) {
    return { valid: false, error: 'Email address is required' };
  }

  // RFC 5322 simplified regex for email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(trimmedEmail)) {
    return { valid: false, error: 'Valid email address is required (e.g., name@example.com)' };
  }

  // Additional checks
  if (trimmedEmail.length > 254) {
    return { valid: false, error: 'Email address is too long (max 254 characters)' };
  }

  // Check for common invalid patterns
  if (trimmedEmail.includes('..')) {
    return { valid: false, error: 'Email address contains invalid consecutive dots' };
  }

  if (trimmedEmail.startsWith('.') || trimmedEmail.endsWith('.')) {
    return { valid: false, error: 'Email address cannot start or end with a dot' };
  }

  return { valid: true };
}

/**
 * Validates phone number (US format with flexibility)
 * Accepts: 10 digits minimum, allows formatting characters (spaces, dashes, parentheses, plus for country code)
 */
export function validatePhone(phone: string | undefined | null): ValidationResult {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, error: 'Phone number is required' };
  }

  const trimmedPhone = phone.trim();
  
  if (trimmedPhone.length === 0) {
    return { valid: false, error: 'Phone number is required' };
  }

  // Only allow digits and common formatting characters: spaces, dashes, parentheses
  // Plus sign only allowed at the start for country code
  const validFormatRegex = /^(\+)?[\d\s\-()]+$/;
  if (!validFormatRegex.test(trimmedPhone)) {
    return { valid: false, error: 'Phone number contains invalid characters (only digits, spaces, dashes, and parentheses allowed)' };
  }

  // Reject multiple consecutive non-digit characters (e.g., "++", "--")
  if (/[^\d]{2,}/.test(trimmedPhone.replace(/[\s\-()]/g, ''))) {
    return { valid: false, error: 'Phone number format is invalid' };
  }

  // Extract only digits
  const digitsOnly = trimmedPhone.replace(/\D/g, '');

  if (digitsOnly.length < 10) {
    return { valid: false, error: 'Phone number must have at least 10 digits' };
  }

  if (digitsOnly.length > 15) {
    return { valid: false, error: 'Phone number is too long (max 15 digits)' };
  }

  // Check for obviously invalid patterns
  if (/^0+$/.test(digitsOnly)) {
    return { valid: false, error: 'Phone number cannot be all zeros' };
  }

  if (/^1+$/.test(digitsOnly)) {
    return { valid: false, error: 'Phone number cannot be all ones' };
  }

  return { valid: true };
}

/**
 * Validates customer name
 */
export function validateName(name: string | undefined | null): ValidationResult {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Name is required' };
  }

  const trimmedName = name.trim();
  
  if (trimmedName.length === 0) {
    return { valid: false, error: 'Name is required' };
  }

  if (trimmedName.length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters' };
  }

  if (trimmedName.length > 100) {
    return { valid: false, error: 'Name is too long (max 100 characters)' };
  }

  return { valid: true };
}

/**
 * Validates complete customer data object
 */
export function validateCustomerData(customer: any): ValidationResult {
  if (!customer || typeof customer !== 'object') {
    return { valid: false, error: 'Customer information is required' };
  }

  // Validate name
  const nameValidation = validateName(customer.name);
  if (!nameValidation.valid) {
    return nameValidation;
  }

  // Validate email
  const emailValidation = validateEmail(customer.email);
  if (!emailValidation.valid) {
    return emailValidation;
  }

  // Validate phone
  const phoneValidation = validatePhone(customer.phone);
  if (!phoneValidation.valid) {
    return phoneValidation;
  }

  return { valid: true };
}
