# Square Payment Integration - Comprehensive Test Suite

## Overview

This test suite provides **extremely detailed and scrutinous** testing coverage for the entire Square payment integration. It identifies all potential issues, edge cases, and security vulnerabilities.

## Test Coverage

### Phase 1: Environment Configuration (01-environment-config.spec.ts)
**Tests: 15+**

- ✅ Critical environment variable presence
- ✅ Environment variable format validation  
- ✅ Token/environment consistency checks
- ✅ Credential format verification
- ✅ Detection of placeholder values
- ✅ Whitespace validation
- ✅ Token type detection (sandbox vs production)

**Issues Detected:**
- Missing `NEXT_PUBLIC_SQUARE_APPLICATION_ID`
- Missing `NEXT_PUBLIC_SQUARE_LOCATION_ID`
- Sandbox token with production environment
- Placeholder values not replaced
- Whitespace in credentials

### Phase 2: SDK Initialization (02-sdk-initialization.spec.ts)
**Tests: 18+**

- ✅ Square client creation
- ✅ API structure validation
- ✅ Error handling for missing credentials
- ✅ Environment validation
- ✅ Token/environment mismatch warnings
- ✅ API method availability
- ✅ Client instance independence

**Issues Detected:**
- Square client fails with invalid environment
- Missing access token crashes initialization
- Token trimming not applied
- API structure incompatibility

### Phase 3: API Endpoints (03-api-endpoints.spec.ts)
**Tests: 30+**

- ✅ `/api/payments` validation (sourceId, amount, currency)
- ✅ `/api/checkout` line item validation
- ✅ `/api/orders/create` complete validation
- ✅ `/api/cart/price` calculation validation
- ✅ `/api/webhooks/square` event processing
- ✅ Error response formats
- ✅ HTTP status code correctness

**Issues Detected:**
- Missing sourceId returns 400
- Zero/negative amounts rejected
- Invalid catalogObjectId format
- Email validation failures
- ZIP code not in whitelist
- Minimum order enforcement
- Malformed JSON handling

### Phase 4: Frontend Integration (04-frontend-integration.spec.ts)
**Tests: 25+**

- ✅ Square.js script loading
- ✅ Square object availability
- ✅ Payment form initialization
- ✅ Card tokenization
- ✅ Error state handling
- ✅ Payment processing states
- ✅ Browser compatibility
- ✅ SSR hydration safety

**Issues Detected:**
- Square.js blocked by ad blockers
- Async loading race conditions
- Missing environment variables in browser
- Form initialization timeout
- Tokenization network errors
- Double submission prevention
- Hydration mismatches

### Phase 5: Order & Payment Flow (05-payment-flow.spec.ts)
**Tests: 20+**

- ✅ Complete order creation flow
- ✅ Delivery fee calculation ($6.99 < $75, $0 >= $75)
- ✅ Tip inclusion in totals
- ✅ Payment link creation
- ✅ Payment processing with tokens
- ✅ Idempotency key handling
- ✅ Order status updates
- ✅ Webhook processing
- ✅ Error recovery mechanisms

**Issues Detected:**
- Delivery fee not applied correctly
- Tip not included in total
- Payment link creation fails
- Idempotency not enforced
- Order status not updating
- Webhook signature validation
- Network timeout handling

### Phase 6: Edge Cases & Security (06-edge-cases-security.spec.ts)
**Tests: 40+**

- ✅ SQL injection prevention
- ✅ XSS attack prevention
- ✅ Email/phone validation
- ✅ Input length limits
- ✅ Rate limiting
- ✅ Duplicate submission prevention
- ✅ Currency edge cases
- ✅ Concurrent operation handling
- ✅ Data integrity checks
- ✅ Price manipulation prevention
- ✅ Error message security
- ✅ Performance limits

**Issues Detected:**
- Long string handling
- Fractional cents handling
- Maximum amount limits
- Concurrent payment attempts
- Client-side price manipulation
- Sensitive data in error messages
- Large cart performance

## Running Tests

### Run All Square Tests
```bash
cd /app
yarn test tests/square/
```

### Run Individual Test Phases
```bash
# Phase 1: Environment Config
yarn test tests/square/01-environment-config.spec.ts

# Phase 2: SDK Initialization
yarn test tests/square/02-sdk-initialization.spec.ts

# Phase 3: API Endpoints
yarn test tests/square/03-api-endpoints.spec.ts

# Phase 4: Frontend Integration
yarn test tests/square/04-frontend-integration.spec.ts

# Phase 5: Payment Flow
yarn test tests/square/05-payment-flow.spec.ts

# Phase 6: Edge Cases & Security
yarn test tests/square/06-edge-cases-security.spec.ts
```

### Run with Coverage
```bash
yarn test tests/square/ --coverage
```

### Run with Verbose Output
```bash
yarn test tests/square/ --reporter=verbose
```

### Run Specific Test
```bash
yarn test tests/square/ -t "should create order with valid pickup data"
```

## Test Results Interpretation

### ✅ PASS
Feature works correctly, no issues detected.

### ❌ FAIL
Critical issue found that breaks functionality.

### ⚠️ WARN
Non-critical issue or improvement opportunity.

### 🔍 INFO
Informational check, no action required.

## Common Issues Found

### 1. Missing Environment Variables
**Severity: CRITICAL**

```
Issue: NEXT_PUBLIC_SQUARE_APPLICATION_ID not set in production
Impact: Payment form cannot initialize
Fix: Add to Vercel environment variables
```

### 2. Token/Environment Mismatch
**Severity: HIGH**

```
Issue: Production token with sandbox environment
Impact: All API calls return 401 Unauthorized
Fix: Set SQUARE_ENVIRONMENT=production
```

### 3. Square.js Loading Failure
**Severity: HIGH**

```
Issue: Script blocked by ad blocker or CSP
Impact: Payment form never renders
Fix: Configure CSP headers, ask users to disable ad blockers
```

### 4. Delivery Fee Not Applied
**Severity: MEDIUM**

```
Issue: calculateDeliveryFee() not called
Impact: Incorrect order totals, revenue loss
Fix: Integrate delivery fee calculation in order creation
```

### 5. Tip Not Included in Total
**Severity: HIGH**

```
Issue: Tip extracted but not added to total
Impact: Payment amount mismatch, failed payments
Fix: Include tip in total calculation
```

### 6. Idempotency Not Enforced
**Severity: MEDIUM**

```
Issue: Same payment can be processed twice
Impact: Double charging customers
Fix: Implement idempotency key validation
```

### 7. Price Manipulation Possible
**Severity: CRITICAL**

```
Issue: Client sends prices, server trusts them
Impact: Customers can pay $0.01 for items
Fix: Server-side price validation from catalog
```

### 8. XSS Vulnerability
**Severity: HIGH**

```
Issue: Unsanitized input stored and displayed
Impact: Script injection attacks
Fix: Sanitize all user inputs
```

## Integration with CI/CD

### Pre-Deployment Checks
```bash
# Add to .github/workflows/deploy.yml
- name: Run Square Tests
  run: |
    yarn test tests/square/ --reporter=json > test-results.json
    if [ $? -ne 0 ]; then
      echo "Square tests failed!"
      exit 1
    fi
```

### Pre-Push Hook
```bash
# Add to .husky/pre-push
yarn test tests/square/ --reporter=dot || echo "Square tests failed"
```

## Monitoring & Alerting

### Production Health Checks
```bash
# Run these checks against production
curl https://gratog.vercel.app/api/health
curl https://gratog.vercel.app/api/checkout
curl https://gratog.vercel.app/diagnostic
```

### Alert Triggers
- Payment success rate < 95%
- Order creation failure rate > 5%
- Webhook processing delay > 5 minutes
- Square API error rate > 2%

## Next Steps

1. **Fix Critical Issues First**
   - Environment variables
   - Token/environment mismatch
   - Price validation

2. **Run Full Test Suite**
   ```bash
   yarn test tests/square/
   ```

3. **Review Test Results**
   - Address all FAIL tests
   - Consider WARN tests

4. **Deploy with Confidence**
   - All tests passing
   - Environment configured correctly
   - Monitoring in place

5. **Continuous Testing**
   - Run tests before every deployment
   - Monitor production metrics
   - Update tests as features evolve

## Support

If tests fail and you need help:

1. Check `/diagnostic` page in production
2. Review test output carefully
3. Check Square Developer Dashboard logs
4. Review application logs
5. Consult Square API documentation

## Test Maintenance

Update tests when:
- New Square API version released
- New features added
- Bug fixes implemented
- Security vulnerabilities discovered
- Performance optimizations made
