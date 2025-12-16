/**
 * Advanced validation utilities for registration and authentication
 */

// Email validation with RFC 5322 compliance
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const STRICT_EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' };
  }

  const trimmed = email.trim();
  
  if (!STRICT_EMAIL_REGEX.test(trimmed)) {
    return { valid: false, error: 'Invalid email format' };
  }

  if (trimmed.length > 254) {
    return { valid: false, error: 'Email is too long' };
  }

  const [localPart] = trimmed.split('@');
  if (localPart.length > 64) {
    return { valid: false, error: 'Email local part is too long' };
  }

  return { valid: true };
}

export function validatePassword(password) {
  const errors = [];

  if (!password) {
    return { valid: false, error: 'Password is required' };
  }

  if (typeof password !== 'string') {
    return { valid: false, error: 'Password must be a string' };
  }

  if (password.length < 8) {
    errors.push('At least 8 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('One uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('One lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('One number');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('One special character (!@#$%^&* etc)');
  }

  if (errors.length > 0) {
    return {
      valid: false,
      error: 'Password must contain: ' + errors.join(', ')
    };
  }

  return { valid: true };
}

export function validateName(name) {
  if (!name || typeof name !== 'string') {
    return { valid: false, error: 'Name is required' };
  }

  const trimmed = name.trim();

  if (trimmed.length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters' };
  }

  if (trimmed.length > 100) {
    return { valid: false, error: 'Name is too long' };
  }

  // Allow letters, spaces, hyphens, and apostrophes
  if (!/^[a-zA-Z\s\-']+$/.test(trimmed)) {
    return { valid: false, error: 'Name can only contain letters, spaces, hyphens, and apostrophes' };
  }

  return { valid: true };
}

export function validatePhone(phone) {
  if (!phone) {
    return { valid: true }; // Phone is optional
  }

  if (typeof phone !== 'string') {
    return { valid: false, error: 'Phone must be a string' };
  }

  const trimmed = phone.trim();
  
  // Remove common formatting characters
  const cleaned = trimmed.replace(/[\s\-().+]/g, '');

  if (!/^\d{10,15}$/.test(cleaned)) {
    return { valid: false, error: 'Phone must be 10-15 digits' };
  }

  return { valid: true };
}

export function validateConfirmPassword(password, confirmPassword) {
  if (password !== confirmPassword) {
    return { valid: false, error: 'Passwords do not match' };
  }
  return { valid: true };
}

/**
 * Validate entire registration form
 */
export function validateRegistration(data) {
  const { name, email, password, confirmPassword, phone } = data;
  const errors = {};

  // Validate name
  const nameValidation = validateName(name);
  if (!nameValidation.valid) {
    errors.name = nameValidation.error;
  }

  // Validate email
  const emailValidation = validateEmail(email);
  if (!emailValidation.valid) {
    errors.email = emailValidation.error;
  }

  // Validate password
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    errors.password = passwordValidation.error;
  }

  // Validate confirmation
  const confirmValidation = validateConfirmPassword(password, confirmPassword);
  if (!confirmValidation.valid) {
    errors.confirmPassword = confirmValidation.error;
  }

  // Validate phone
  if (phone) {
    const phoneValidation = validatePhone(phone);
    if (!phoneValidation.valid) {
      errors.phone = phoneValidation.error;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors: Object.keys(errors).length === 0 ? null : errors
  };
}

/**
 * Check password strength score (0-100)
 */
export function getPasswordStrength(password) {
  if (!password) return 0;

  let strength = 0;

  // Length scoring
  if (password.length >= 8) strength += 20;
  if (password.length >= 12) strength += 10;
  if (password.length >= 16) strength += 10;

  // Character variety scoring
  if (/[a-z]/.test(password)) strength += 15;
  if (/[A-Z]/.test(password)) strength += 15;
  if (/[0-9]/.test(password)) strength += 15;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength += 15;

  // No character repetition bonus
  const uniqueChars = new Set(password).size;
  if (uniqueChars >= password.length * 0.8) {
    strength += 10;
  }

  return Math.min(100, strength);
}
