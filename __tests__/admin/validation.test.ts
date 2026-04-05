/**
 * Admin Validation Tests
 * 
 * Tests input validation, sanitization, and injection prevention.
 */

import { describe, it, expect } from 'vitest';
import {
  ProductUpdateSchema,
  CampaignCreateSchema,
  ReviewBulkActionSchema,
  sanitizeHtml,
  validateBody,
  ObjectIdSchema,
} from '@/lib/validation';
import { ObjectId } from 'mongodb';

describe('Input Validation', () => {
  describe('ProductUpdateSchema', () => {
    it('should validate valid product updates', () => {
      const valid = {
        name: 'Test Product',
        description: 'A test product',
        price: 29.99,
        category: 'Test Category',
      };
      
      const result = ProductUpdateSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
    
    it('should reject protected fields', () => {
      const withProtected = {
        name: 'Test',
        _id: 'should-not-be-allowed',
      };
      
      const result = ProductUpdateSchema.safeParse(withProtected);
      expect(result.success).toBe(false);
    });
    
    it('should reject unknown fields', () => {
      const withUnknown = {
        name: 'Test',
        maliciousField: 'hacked',
      };
      
      const result = ProductUpdateSchema.safeParse(withUnknown);
      expect(result.success).toBe(false);
    });
    
    it('should validate price constraints', () => {
      const negativePrice = { price: -10 };
      const result = ProductUpdateSchema.safeParse(negativePrice);
      expect(result.success).toBe(false);
      
      const tooHigh = { price: 9999999 };
      const result2 = ProductUpdateSchema.safeParse(tooHigh);
      expect(result2.success).toBe(false);
    });
    
    it('should validate name length', () => {
      const empty = { name: '' };
      expect(ProductUpdateSchema.safeParse(empty).success).toBe(false);
      
      const tooLong = { name: 'a'.repeat(201) };
      expect(ProductUpdateSchema.safeParse(tooLong).success).toBe(false);
    });
  });
  
  describe('CampaignCreateSchema', () => {
    it('should validate valid campaign', () => {
      const valid = {
        name: 'Test Campaign',
        subject: 'Test Subject',
        body: 'Hello world',
      };
      
      const result = CampaignCreateSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
    
    it('should require name, subject, and body', () => {
      const missingName = { subject: 'Test', body: 'Body' };
      expect(CampaignCreateSchema.safeParse(missingName).success).toBe(false);
      
      const missingSubject = { name: 'Test', body: 'Body' };
      expect(CampaignCreateSchema.safeParse(missingSubject).success).toBe(false);
    });
    
    it('should validate scheduled date', () => {
      const withDate = {
        name: 'Test',
        subject: 'Test',
        body: 'Body',
        scheduledFor: '2025-12-25T10:00:00Z',
      };
      
      expect(CampaignCreateSchema.safeParse(withDate).success).toBe(true);
      
      const invalidDate = {
        name: 'Test',
        subject: 'Test',
        body: 'Body',
        scheduledFor: 'not-a-date',
      };
      
      expect(CampaignCreateSchema.safeParse(invalidDate).success).toBe(false);
    });
  });
  
  describe('ReviewBulkActionSchema', () => {
    it('should validate bulk actions', () => {
      const valid = {
        reviewIds: ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
        action: 'approve',
      };
      
      const result = ReviewBulkActionSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
    
    it('should reject invalid ObjectIds', () => {
      const invalid = {
        reviewIds: ['not-valid-id', '507f1f77bcf86cd799439011'],
        action: 'approve',
      };
      
      expect(ReviewBulkActionSchema.safeParse(invalid).success).toBe(false);
    });
    
    it('should reject invalid actions', () => {
      const invalidAction = {
        reviewIds: ['507f1f77bcf86cd799439011'],
        action: 'hack',
      };
      
      expect(ReviewBulkActionSchema.safeParse(invalidAction).success).toBe(false);
    });
    
    it('should limit bulk action size', () => {
      const tooMany = {
        reviewIds: Array(1001).fill('507f1f77bcf86cd799439011'),
        action: 'approve',
      };
      
      expect(ReviewBulkActionSchema.safeParse(tooMany).success).toBe(false);
    });
  });
  
  describe('ObjectIdSchema', () => {
    it('should validate valid ObjectIds', () => {
      const validId = new ObjectId().toString();
      expect(ObjectIdSchema.safeParse(validId).success).toBe(true);
    });
    
    it('should reject invalid ObjectIds', () => {
      expect(ObjectIdSchema.safeParse('not-valid').success).toBe(false);
      expect(ObjectIdSchema.safeParse('123').success).toBe(false);
      expect(ObjectIdSchema.safeParse('').success).toBe(false);
    });
    
    it('should reject MongoDB operator injection attempts', () => {
      const injectionAttempts = [
        '{"$gt": ""}',
        '{"$ne": null}',
        '{"$exists": true}',
        '507f1f77bcf86cd799439011&$gt=',
      ];
      
      for (const attempt of injectionAttempts) {
        expect(ObjectIdSchema.safeParse(attempt).success).toBe(false);
      }
    });
  });
});

describe('HTML Sanitization', () => {
  it('should remove script tags', () => {
    const input = '<script>alert("xss")</script><p>Hello</p>';
    const sanitized = sanitizeHtml(input);
    expect(sanitized).not.toContain('<script>');
    expect(sanitized).toContain('<p>Hello</p>');
  });
  
  it('should remove event handlers', () => {
    const input = '<div onclick="alert(1)">Click me</div>';
    const sanitized = sanitizeHtml(input);
    expect(sanitized).not.toContain('onclick');
  });
  
  it('should remove javascript: URLs', () => {
    const input = '<a href="javascript:alert(1)">Link</a>';
    const sanitized = sanitizeHtml(input);
    expect(sanitized).not.toContain('javascript:');
  });
  
  it('should remove iframes', () => {
    const input = '<iframe src="https://evil.com"></iframe>';
    const sanitized = sanitizeHtml(input);
    expect(sanitized).not.toContain('<iframe>');
  });
  
  it('should preserve safe HTML', () => {
    const input = '<h1>Title</h1><p><strong>Bold</strong> text</p>';
    const sanitized = sanitizeHtml(input);
    expect(sanitized).toContain('<h1>Title</h1>');
    expect(sanitized).toContain('<strong>Bold</strong>');
  });
});

describe('validateBody helper', () => {
  it('should return success for valid data', () => {
    const schema = ProductUpdateSchema;
    const body = { name: 'Test' };
    
    const result = validateBody(body, schema);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Test');
    }
  });
  
  it('should return error for invalid data', () => {
    const schema = ProductUpdateSchema;
    const body = { maliciousField: 'hack' };
    
    const result = validateBody(body, schema);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Unknown fields');
    }
  });
});
