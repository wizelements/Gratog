import { describe, it, expect } from 'vitest';
import { 
  validateEmail, 
  validatePassword, 
  validateName, 
  validatePhone,
  validateConfirmPassword,
  getPasswordStrength
} from '@/lib/auth/validation';

describe('Registration Validation', () => {
  describe('Name Validation', () => {
    it('should accept valid names', () => {
      const result = validateName('John Doe');
      expect(result.valid).toBe(true);
    });

    it('should reject empty name', () => {
      const result = validateName('');
      expect(result.valid).toBe(false);
    });

    it('should reject names that are too short', () => {
      const result = validateName('J');
      expect(result.valid).toBe(false);
    });
  });

  describe('Email Validation', () => {
    it('should accept valid emails', () => {
      const result = validateEmail('user@example.com');
      expect(result.valid).toBe(true);
    });

    it('should reject invalid email formats', () => {
      const result = validateEmail('invalid-email');
      expect(result.valid).toBe(false);
    });

    it('should reject empty email', () => {
      const result = validateEmail('');
      expect(result.valid).toBe(false);
    });
  });

  describe('Password Validation', () => {
    it('should accept strong passwords', () => {
      const result = validatePassword('SecurePass123!');
      expect(result.valid).toBe(true);
    });

    it('should reject weak passwords', () => {
      const result = validatePassword('123');
      expect(result.valid).toBe(false);
    });

    it('should provide password strength score', () => {
      const strength = getPasswordStrength('SecurePass123!');
      expect(strength).toBeGreaterThan(0);
    });
  });

  describe('Confirm Password Validation', () => {
    it('should accept matching passwords', () => {
      const result = validateConfirmPassword('SecurePass123!', 'SecurePass123!');
      expect(result.valid).toBe(true);
    });

    it('should reject non-matching passwords', () => {
      const result = validateConfirmPassword('SecurePass123!', 'DifferentPass123!');
      expect(result.valid).toBe(false);
    });

    it('should reject empty confirm password', () => {
      const result = validateConfirmPassword('SecurePass123!', '');
      expect(result.valid).toBe(false);
    });
  });

  describe('Phone Validation', () => {
    it('should accept valid phone numbers', () => {
      const result = validatePhone('(404) 555-0123');
      expect(result.valid).toBe(true);
    });

    it('should accept various phone formats', () => {
      const formats = [
        '404-555-0123',
        '4045550123',
        '+1 404 555 0123',
        '(404)555-0123'
      ];
      
      formats.forEach(phone => {
        const result = validatePhone(phone);
        expect(result.valid).toBe(true);
      });
    });

    it('should reject invalid phone numbers', () => {
      const result = validatePhone('123');
      expect(result.valid).toBe(false);
    });
  });
});
