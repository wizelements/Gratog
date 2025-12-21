# VORAX Hardening Action Plan

**Status:** TEST RESULTS IDENTIFIED - ACTION PLAN CREATED  
**Date:** December 21, 2025  
**Priority:** CRITICAL SECURITY ITEMS

---

## Overview

Full hardening test execution has revealed several security issues requiring immediate attention. This document outlines the recommended security hardening steps and implementation plan.

---

## Critical Issues Identified

### 🔴 CRITICAL (Fix Immediately)

#### 1. **Missing/Weak Content Security Policy**
- **Issue:** eval() execution allowed, dynamic functions allowed
- **Impact:** High security risk - JavaScript injection possible
- **Tests Failing:**
  - "should not allow eval execution"
  - "should not allow function execution from strings"
  - "should have content security policy"
- **Fix:** Implement strict CSP headers
- **Effort:** 1-2 hours

#### 2. **DOM Property Injection Vulnerability**
- **Issue:** XSS payload detected in DOM text content
- **Impact:** High security risk - reflected XSS possible
- **Tests Failing:**
  - "should properly sanitize DOM properties"
- **Fix:** Implement input sanitization
- **Effort:** 2-3 hours

### 🟠 HIGH (Fix Soon)

#### 3. **Missing Security Headers**
- **Issue:** Several security headers not configured
- **Tests Affected:**
  - Content Security Policy header
  - X-Content-Type-Options
  - X-Frame-Options
  - X-XSS-Protection
- **Fix:** Configure headers in next.config.js
- **Effort:** 1-2 hours

#### 4. **Input Validation Gaps**
- **Issue:** XSS payloads in customer name field not sanitized
- **Impact:** Reflected XSS vulnerability
- **Fix:** Implement server-side input validation
- **Effort:** 2-3 hours

### 🟡 MEDIUM (Address This Week)

#### 5. **API Security Enhancements**
- **Issue:** API endpoints may lack proper validation
- **Fix:** Add rate limiting, input validation
- **Effort:** 3-4 hours

---

## Security Fixes Required

### Fix #1: Implement Content Security Policy

**File:** `next.config.js`

**Implementation:**
```javascript
// Add to next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: "default-src 'self'; script-src 'self' https://web.squarecdn.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https:; frame-ancestors 'none';"
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-Frame-Options',
    value: 'DENY'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains'
  }
];

module.exports = {
  // ... existing config
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders
      }
    ];
  }
};
```

**Timeline:** 30 minutes  
**Priority:** CRITICAL

---

### Fix #2: Implement Input Sanitization

**File:** Create `lib/sanitize.ts`

**Implementation:**
```typescript
// lib/sanitize.ts
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  // Remove HTML tags and dangerous characters
  const cleaned = input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
  
  return cleaned.substring(0, 255); // Limit length
}

export function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html, { 
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: []
  });
}
```

**Installation:**
```bash
npm install isomorphic-dompurify
```

**Usage:**
```typescript
import { sanitizeInput } from '@/lib/sanitize';

// In API routes
const sanitizedName = sanitizeInput(req.body.name);
const sanitizedEmail = sanitizeInput(req.body.email);
```

**Timeline:** 1-2 hours  
**Priority:** CRITICAL

---

### Fix #3: Server-Side Input Validation

**File:** `app/api/checkout/route.ts` (or relevant endpoints)

**Implementation:**
```typescript
import { sanitizeInput } from '@/lib/sanitize';

const validateCheckoutData = (data: any) => {
  const errors = [];
  
  // Email validation
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.push('Invalid email format');
  }
  
  // Name validation
  if (!data.name || data.name.length < 2 || data.name.length > 100) {
    errors.push('Name must be 2-100 characters');
  }
  
  // Phone validation
  if (data.phone && !/^\d{10,}$/.test(data.phone.replace(/\D/g, ''))) {
    errors.push('Invalid phone number');
  }
  
  // Sanitize inputs
  return {
    email: sanitizeInput(data.email),
    name: sanitizeInput(data.name),
    phone: sanitizeInput(data.phone || '')
  };
};

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Validate and sanitize
    const validated = validateCheckoutData(data);
    
    // Process payment
    // ...
  } catch (error) {
    return new Response('Invalid request', { status: 400 });
  }
}
```

**Timeline:** 1-2 hours  
**Priority:** CRITICAL

---

### Fix #4: Add Rate Limiting

**File:** Create `lib/rateLimit.ts`

**Implementation:**
```typescript
// lib/rateLimit.ts
import { LRUCache } from 'lru-cache';

const rateLimit = new LRUCache({
  max: 500,
  ttl: 1000 * 60 // 1 minute
});

export function checkRateLimit(identifier: string, limit: number = 10): boolean {
  const current = (rateLimit.get(identifier) as number) || 0;
  
  if (current >= limit) {
    return false; // Rate limit exceeded
  }
  
  rateLimit.set(identifier, current + 1);
  return true;
}
```

**Usage:**
```typescript
import { checkRateLimit } from '@/lib/rateLimit';

export async function POST(request: Request) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';
  
  if (!checkRateLimit(ip, 10)) {
    return new Response('Too many requests', { status: 429 });
  }
  
  // Process request
}
```

**Installation:**
```bash
npm install lru-cache
```

**Timeline:** 30 minutes  
**Priority:** HIGH

---

## Implementation Timeline

### Phase 1: Critical Fixes (Day 1)
- [ ] Implement CSP headers
- [ ] Add input sanitization
- [ ] Deploy server-side validation
- [ ] Run tests to verify fixes

**Estimated Time:** 3-4 hours

### Phase 2: Enhanced Security (Day 2)
- [ ] Add rate limiting
- [ ] Implement CSRF tokens
- [ ] Add API authentication checks
- [ ] Run full test suite

**Estimated Time:** 2-3 hours

### Phase 3: Optimization (Day 3)
- [ ] Address remaining test failures
- [ ] Optimize performance
- [ ] Add monitoring
- [ ] Achieve 95%+ test pass rate

**Estimated Time:** 2-3 hours

---

## Testing & Verification

### After Each Fix

1. **Run targeted tests:**
```bash
npx playwright test --config=playwright.hardening.config.ts -g "security policy"
npx playwright test --config=playwright.hardening.config.ts e2e/hardening/frontend-security.spec.ts
```

2. **Run full suite:**
```bash
npx playwright test --config=playwright.hardening.config.ts
```

3. **View results:**
```bash
npx playwright show-report playwright-report-hardening
```

### Success Metrics
- ✅ 95%+ test pass rate
- ✅ All critical issues resolved
- ✅ No console errors
- ✅ CSP passes validation
- ✅ Input validation working

---

## Files to Modify

| File | Action | Priority |
|------|--------|----------|
| next.config.js | Add security headers | CRITICAL |
| middleware.ts | Add CSP validation | HIGH |
| lib/sanitize.ts | Create sanitization module | CRITICAL |
| lib/rateLimit.ts | Create rate limiting | HIGH |
| app/api/checkout/route.ts | Add validation | CRITICAL |
| app/api/\*\*/route.ts | Add validation to all | HIGH |
| package.json | Add dependencies | CRITICAL |

---

## Dependencies to Add

```json
{
  "dependencies": {
    "isomorphic-dompurify": "^2.x.x",
    "lru-cache": "^10.x.x",
    "helmet": "^7.x.x"  // Optional, for additional security
  }
}
```

**Installation:**
```bash
npm install isomorphic-dompurify lru-cache
npm install -D @types/lru-cache
```

---

## Security Best Practices

### Always Do:
- ✅ Validate on server-side (not just client)
- ✅ Sanitize all user inputs
- ✅ Use secure headers
- ✅ Implement rate limiting
- ✅ Log security events
- ✅ Keep dependencies updated
- ✅ Test security regularly

### Never Do:
- ❌ Trust client-side validation alone
- ❌ Render user input without sanitization
- ❌ Allow eval() or dynamic Function()
- ❌ Expose error details
- ❌ Store sensitive data in localStorage
- ❌ Allow unlimited requests
- ❌ Skip security testing

---

## Monitoring & Maintenance

### Daily
- Monitor error logs
- Check for security alerts
- Review failed tests

### Weekly
- Run full hardening test suite
- Review security metrics
- Update dependencies

### Monthly
- Security audit
- Penetration testing
- Compliance check

### Quarterly
- External security assessment
- Vulnerability scanning
- Security training

---

## Success Criteria

### Phase 1 (Critical - Day 1)
- [ ] CSP headers implemented
- [ ] XSS protection working
- [ ] Input sanitization in place
- [ ] 75%+ test pass rate

### Phase 2 (Important - Day 2)
- [ ] Rate limiting active
- [ ] CSRF tokens working
- [ ] API validation complete
- [ ] 90%+ test pass rate

### Phase 3 (Complete - Day 3)
- [ ] All critical fixes deployed
- [ ] 95%+ test pass rate
- [ ] Zero P1/P2 security issues
- [ ] Ready for production

---

## Contact & Support

For security issues during implementation:
1. Check test failure details in playwright-report-hardening
2. Review error traces in test-results/
3. Consult security documentation
4. Run specific failing tests with --debug flag

---

## Appendix: Quick Reference

### Run All Tests
```bash
npx playwright test --config=playwright.hardening.config.ts
```

### Run Specific Suite
```bash
npx playwright test --config=playwright.hardening.config.ts e2e/hardening/frontend-security.spec.ts
```

### Run Specific Test
```bash
npx playwright test -g "should have content security policy"
```

### View HTML Report
```bash
npx playwright show-report playwright-report-hardening
```

### Debug Mode
```bash
npx playwright test --config=playwright.hardening.config.ts --debug
```

### Update Configuration
```bash
# Edit playwright.hardening.config.ts to change:
# - timeout
# - retries
# - workers
# - reporters
```

---

**Created:** December 21, 2025  
**Status:** READY FOR IMPLEMENTATION  
**Next Action:** Begin Phase 1 critical fixes  

Estimated Total Implementation Time: 7-10 hours  
Expected Timeline: 3 days
