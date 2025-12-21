/**
 * Smoke Tests - Critical Path Validation
 * 
 * These tests verify that core functionality works and the site won't crash.
 * Run these before every deployment to catch breaking changes.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock browser APIs for SSR testing
const mockBrowserAPIs = () => {
  const originalWindow = global.window;
  const originalDocument = global.document;
  const originalLocalStorage = global.localStorage;
  
  return {
    mockSSR: () => {
      // @ts-ignore
      delete global.window;
      // @ts-ignore
      delete global.document;
      // @ts-ignore
      delete global.localStorage;
    },
    restore: () => {
      global.window = originalWindow;
      global.document = originalDocument;
      global.localStorage = originalLocalStorage;
    }
  };
};

describe('Critical Component Imports', () => {
  it('should have CustomerLayout file exist', () => {
    const fs = require('fs');
    const path = require('path');
    expect(fs.existsSync(path.join(process.cwd(), 'components/CustomerLayout.jsx'))).toBe(true);
  });
  
  it('should have Header file exist', () => {
    const fs = require('fs');
    const path = require('path');
    expect(fs.existsSync(path.join(process.cwd(), 'components/Header.jsx'))).toBe(true);
  });
  
  it('should have Footer file exist', () => {
    const fs = require('fs');
    const path = require('path');
    expect(fs.existsSync(path.join(process.cwd(), 'components/Footer.jsx'))).toBe(true);
  });
});

describe('Store Initialization', () => {
  it('rewards store should initialize without errors', async () => {
    const { useRewardsStore } = await import('../stores/rewards');
    expect(useRewardsStore).toBeDefined();
    expect(typeof useRewardsStore).toBe('function');
  });
  
  it('checkout store should initialize without errors', async () => {
    const { useCheckoutStore } = await import('../stores/checkout');
    expect(useCheckoutStore).toBeDefined();
  });
  
  it('wishlist store should initialize without errors', async () => {
    const { useWishlistStore } = await import('../stores/wishlist');
    expect(useWishlistStore).toBeDefined();
  });
});

describe('Utility Functions', () => {
  it('secure-storage should handle SSR gracefully', async () => {
    const mock = mockBrowserAPIs();
    mock.mockSSR();
    
    const { rewardsStorage } = await import('../lib/secure-storage');
    
    // Should not throw when window is undefined
    expect(() => rewardsStorage.get('test')).not.toThrow();
    expect(rewardsStorage.get('test')).toBeNull();
    
    mock.restore();
  });
  
  it('rewards-security should export all required functions', async () => {
    const security = await import('../lib/rewards-security');
    
    expect(security.verifyRequestAuthentication).toBeDefined();
    expect(security.generateCsrfToken).toBeDefined();
    expect(security.verifyCsrfToken).toBeDefined();
    expect(security.validateEmail).toBeDefined();
    expect(security.sanitizeString).toBeDefined();
  });
});

describe('API Route Handlers', () => {
  it('health API should be importable', async () => {
    // This tests that the route module can be loaded
    await expect(import('../app/api/health/route')).resolves.toBeDefined();
  });
});

describe('Environment Consistency', () => {
  it('should not have production URLs pointing to preview domains', () => {
    const fs = require('fs');
    const path = require('path');
    
    const vercelJsonPath = path.join(process.cwd(), 'vercel.json');
    if (fs.existsSync(vercelJsonPath)) {
      const content = fs.readFileSync(vercelJsonPath, 'utf8');
      
      // Should not contain preview domain references in env section
      expect(content).not.toContain('preview.emergentagent.com');
      // Note: gratog.vercel.app may be in redirects section (to redirect old URLs)
      // Only check env section doesn't have it
      const parsed = JSON.parse(content);
      if (parsed.env) {
        const envStr = JSON.stringify(parsed.env);
        expect(envStr).not.toContain('gratog.vercel.app');
      }
    }
  });
  
  it('layout.js should have correct metadataBase', () => {
    const fs = require('fs');
    const path = require('path');
    
    const layoutPath = path.join(process.cwd(), 'app/layout.js');
    const content = fs.readFileSync(layoutPath, 'utf8');
    
    // Should contain production domain
    expect(content).toContain('tasteofgratitude.shop');
    // Should not contain old Vercel domain
    expect(content).not.toContain('gratog.vercel.app');
  });
  
  it('robots.txt should point to production domain', () => {
    const fs = require('fs');
    const path = require('path');
    
    const robotsPath = path.join(process.cwd(), 'public/robots.txt');
    const content = fs.readFileSync(robotsPath, 'utf8');
    
    expect(content).toContain('tasteofgratitude.shop');
    expect(content).not.toContain('gratog.vercel.app');
  });
});

describe('Error Boundary', () => {
  it('global-error.js should exist', () => {
    const fs = require('fs');
    const path = require('path');
    expect(fs.existsSync(path.join(process.cwd(), 'app/global-error.js'))).toBe(true);
  });
  
  it('error.js should exist for app-level error handling', () => {
    const fs = require('fs');
    const path = require('path');
    expect(fs.existsSync(path.join(process.cwd(), 'app/error.js'))).toBe(true);
  });
  
  it('global-error.js should have proper structure', () => {
    const fs = require('fs');
    const path = require('path');
    const content = fs.readFileSync(path.join(process.cwd(), 'app/global-error.js'), 'utf8');
    
    expect(content).toContain("'use client'");
    expect(content).toContain('export default function');
    expect(content).toContain('reset');
  });
});

describe('No Hydration Mismatches in Server Components', () => {
  it('privacy page should not use dynamic Date', () => {
    const fs = require('fs');
    const path = require('path');
    
    const privacyPath = path.join(process.cwd(), 'app/privacy/page.js');
    const content = fs.readFileSync(privacyPath, 'utf8');
    
    // Should not have dynamic date that causes hydration mismatch
    expect(content).not.toMatch(/new Date\(\)\.toLocale/);
  });
  
  it('terms page should not use dynamic Date', () => {
    const fs = require('fs');
    const path = require('path');
    
    const termsPath = path.join(process.cwd(), 'app/terms/page.js');
    const content = fs.readFileSync(termsPath, 'utf8');
    
    expect(content).not.toMatch(/new Date\(\)\.toLocale/);
  });
  
  it('policies page should not use dynamic Date', () => {
    const fs = require('fs');
    const path = require('path');
    
    const policiesPath = path.join(process.cwd(), 'app/policies/page.js');
    const content = fs.readFileSync(policiesPath, 'utf8');
    
    expect(content).not.toMatch(/new Date\(\)\.toLocale/);
  });
});

describe('Critical Files Exist', () => {
  const criticalFiles = [
    'app/layout.js',
    'app/page.js',
    'app/global-error.js',
    'middleware.ts',
    'next.config.js',
    'vercel.json',
    'public/robots.txt',
  ];
  
  criticalFiles.forEach(file => {
    it(`${file} should exist`, () => {
      const fs = require('fs');
      const path = require('path');
      
      const filePath = path.join(process.cwd(), file);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });
});
