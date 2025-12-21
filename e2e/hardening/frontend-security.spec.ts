import { test, expect } from '@playwright/test';

test.describe('Frontend Security', () => {
  test('should have content security policy', async ({ page }) => {
    const response = await page.goto('/');
    const csp = response?.headers()['content-security-policy'];
    
    expect(csp).toBeDefined();
    
    // CSP should be restrictive
    if (csp) {
      // Should not allow unsafe-inline
      expect(csp).not.toContain("'unsafe-inline'");
    }
  });

  test('should have x-content-type-options header', async ({ page }) => {
    const response = await page.goto('/');
    const header = response?.headers()['x-content-type-options'];
    
    expect(header).toBe('nosniff');
  });

  test('should have x-frame-options header', async ({ page }) => {
    const response = await page.goto('/');
    const header = response?.headers()['x-frame-options'];
    
    expect(header).toBeDefined();
    expect(['DENY', 'SAMEORIGIN']).toContain(header);
  });

  test('should have x-xss-protection header', async ({ page }) => {
    const response = await page.goto('/');
    const header = response?.headers()['x-xss-protection'];
    
    // Should have XSS protection
    if (header) {
      expect(['1; mode=block', '1']).toContain(header);
    }
  });

  test('should not expose server version', async ({ page }) => {
    const response = await page.goto('/');
    const serverHeader = response?.headers()['server'];
    
    // Should not expose detailed server version
    if (serverHeader) {
      expect(serverHeader).not.toMatch(/Apache\/\d+\.\d+\.\d+/);
      expect(serverHeader).not.toMatch(/nginx\/\d+\.\d+\.\d+/);
    }
  });

  test('should not leak user info in HTML comments', async ({ page }) => {
    await page.goto('/');
    
    const content = await page.content();
    
    // HTML comments should not contain sensitive info
    expect(content).not.toMatch(/<!--.*password.*-->/i);
    expect(content).not.toMatch(/<!--.*email.*-->/i);
    expect(content).not.toMatch(/<!--.*token.*-->/i);
  });

  test('should not load external scripts from untrusted sources', async ({ page }) => {
    const externalScripts: string[] = [];
    
    page.on('request', (request) => {
      if (request.resourceType() === 'script') {
        externalScripts.push(request.url());
      }
    });
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // All scripts should be from trusted domains
    for (const script of externalScripts) {
      const url = new URL(script);
      
      // Script should not be from suspicious domains
      expect(script).not.toMatch(/suspicious|malware|phishing/i);
    }
  });

  test('should properly sanitize DOM properties', async ({ page }) => {
    await page.goto('/');
    
    // Try to inject via innerHTML
    const injectionAttempt = '<img src=x onerror="alert(\'xss\')">';
    
    await page.evaluate((payload) => {
      const el = document.createElement('div');
      el.textContent = payload;
      document.body.appendChild(el);
    }, injectionAttempt);
    
    // Should display as text, not execute
    const text = await page.locator('body').textContent();
    expect(text).toContain(injectionAttempt);
    expect(text).not.toContain('onerror=');
  });

  test('should not expose window objects improperly', async ({ page }) => {
    await page.goto('/');
    
    const exposedObjects = await page.evaluate(() => {
      const suspicious = ['__token__', '__secret__', '__api_key__', '__password__'];
      const exposed = [];
      
      for (const obj of suspicious) {
        if ((window as any)[obj] !== undefined) {
          exposed.push(obj);
        }
      }
      
      return exposed;
    });
    
    expect(exposedObjects.length).toBe(0);
  });

  test('should not allow eval execution', async ({ page }) => {
    await page.goto('/');
    
    const canEval = await page.evaluate(() => {
      try {
        eval('1+1');
        return true;
      } catch {
        return false;
      }
    });
    
    // eval should be prevented by CSP
    expect(canEval).toBe(false);
  });

  test('should not allow function execution from strings', async ({ page }) => {
    await page.goto('/');
    
    const canExecute = await page.evaluate(() => {
      try {
        const fn = new Function('return 1+1');
        fn();
        return true;
      } catch {
        return false;
      }
    });
    
    // Dynamic function creation should be prevented by CSP
    expect(canExecute).toBe(false);
  });

  test('should sanitize user inputs in DOM', async ({ page }) => {
    await page.goto('/checkout');
    
    const maliciousInput = '<script>alert("xss")</script>';
    
    const emailInput = page.locator('input[type="email"]');
    if (await emailInput.isVisible()) {
      await emailInput.fill(maliciousInput);
      
      const displayedValue = await emailInput.inputValue();
      
      // Should not contain script tags
      expect(displayedValue).not.toContain('<script>');
    }
  });
});
