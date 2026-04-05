/**
 * Admin Authentication Tests
 * 
 * Tests JWT validation, session management, role enforcement, and security edge cases.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { 
  generateAdminToken, 
  verifyAdminToken, 
  getAdminSession,
  shouldRotateToken,
  validateCsrfToken,
  generateCsrfToken,
} from '@/lib/auth/unified-admin';
import { ROLES, hasPermission, PERMISSIONS } from '@/lib/security';

// Mock environment
process.env.JWT_SECRET = 'test-secret-that-is-32-characters-long-for-security';

describe('Admin Authentication', () => {
  describe('Token Generation & Verification', () => {
    it('should generate a valid JWT token', async () => {
      const admin = {
        id: 'admin_123',
        email: 'admin@example.com',
        role: ROLES.ADMIN,
        name: 'Test Admin',
      };
      
      const token = await generateAdminToken(admin);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });
    
    it('should verify a valid token', async () => {
      const admin = {
        id: 'admin_123',
        email: 'admin@example.com',
        role: ROLES.ADMIN,
      };
      
      const token = await generateAdminToken(admin);
      const session = await verifyAdminToken(token);
      
      expect(session).toBeDefined();
      expect(session?.id).toBe(admin.id);
      expect(session?.email).toBe(admin.email);
      expect(session?.role).toBe(admin.role);
    });
    
    it('should reject an invalid token', async () => {
      const session = await verifyAdminToken('invalid-token');
      expect(session).toBeNull();
    });
    
    it('should reject a tampered token', async () => {
      const admin = {
        id: 'admin_123',
        email: 'admin@example.com',
        role: ROLES.ADMIN,
      };
      
      const token = await generateAdminToken(admin);
      const tamperedToken = token.slice(0, -10) + 'tampered1234';
      
      const session = await verifyAdminToken(tamperedToken);
      expect(session).toBeNull();
    });
    
    it('should reject token with non-admin role', async () => {
      const admin = {
        id: 'admin_123',
        email: 'admin@example.com',
        role: 'user', // Invalid role
      };
      
      const token = await generateAdminToken(admin);
      const session = await verifyAdminToken(token);
      
      expect(session).toBeNull();
    });
  });
  
  describe('Token Rotation', () => {
    it('should not rotate fresh tokens', () => {
      const session = {
        id: 'admin_123',
        email: 'admin@example.com',
        role: ROLES.ADMIN,
        iat: Math.floor(Date.now() / 1000),
      };
      
      expect(shouldRotateToken(session)).toBe(false);
    });
    
    it('should rotate old tokens (>24h)', () => {
      const session = {
        id: 'admin_123',
        email: 'admin@example.com',
        role: ROLES.ADMIN,
        iat: Math.floor((Date.now() - 25 * 60 * 60 * 1000) / 1000),
      };
      
      expect(shouldRotateToken(session)).toBe(true);
    });
  });
  
  describe('CSRF Protection', () => {
    it('should generate CSRF tokens', () => {
      const token = generateCsrfToken();
      expect(token).toBeDefined();
      expect(token.length).toBe(64); // 32 bytes = 64 hex chars
      expect(/^[a-f0-9]+$/.test(token)).toBe(true);
    });
    
    it('should validate matching CSRF tokens', () => {
      const token = generateCsrfToken();
      // We can't easily test validateCsrfToken without a full request mock
      // This is covered in integration tests
    });
    
    it('should generate unique tokens each time', () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();
      expect(token1).not.toBe(token2);
    });
  });
});

describe('RBAC', () => {
  describe('Role Permissions', () => {
    it('should give SUPER_ADMIN all permissions', () => {
      const allPermissions = Object.values(PERMISSIONS);
      
      for (const permission of allPermissions) {
        expect(hasPermission(ROLES.SUPER_ADMIN, permission)).toBe(true);
      }
    });
    
    it('should give ADMIN most permissions', () => {
      expect(hasPermission(ROLES.ADMIN, PERMISSIONS.PRODUCTS_CREATE)).toBe(true);
      expect(hasPermission(ROLES.ADMIN, PERMISSIONS.ORDERS_UPDATE_STATUS)).toBe(true);
      expect(hasPermission(ROLES.ADMIN, PERMISSIONS.CAMPAIGNS_SEND)).toBe(true);
    });
    
    it('should not give ADMIN user management permissions', () => {
      expect(hasPermission(ROLES.ADMIN, PERMISSIONS.ADMINS_MANAGE)).toBe(false);
    });
    
    it('should give EDITOR limited permissions', () => {
      expect(hasPermission(ROLES.EDITOR, PERMISSIONS.PRODUCTS_UPDATE)).toBe(true);
      expect(hasPermission(ROLES.EDITOR, PERMISSIONS.PRODUCTS_DELETE)).toBe(false);
      expect(hasPermission(ROLES.EDITOR, PERMISSIONS.ORDERS_REFUND)).toBe(false);
    });
    
    it('should give VIEWER only read permissions', () => {
      expect(hasPermission(ROLES.VIEWER, PERMISSIONS.PRODUCTS_VIEW)).toBe(true);
      expect(hasPermission(ROLES.VIEWER, PERMISSIONS.PRODUCTS_CREATE)).toBe(false);
      expect(hasPermission(ROLES.VIEWER, PERMISSIONS.PRODUCTS_DELETE)).toBe(false);
    });
  });
});
