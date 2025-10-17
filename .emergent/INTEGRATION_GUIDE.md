# 🔗 Production Features Integration Guide

**Date:** 2025-10-15  
**Status:** Step-by-step integration instructions

---

## 📦 Features Built (Ready to Integrate)

All production features are **BUILT and READY**. This guide shows you how to integrate them into your existing routes.

---

## 1️⃣ Redis Idempotency Cache Integration

### What It Does
Prevents duplicate order processing when a customer accidentally submits twice or network issues cause retries.

### Files
- ✅ `lib/redis-idempotency.ts` - Redis-backed cache with memory fallback
- ✅ `lib/idempotency.ts` - Original in-memory only (can replace)

### How to Integrate

#### Option A: Use the Atomic Order Route (Recommended)

Simply swap the routes:

```bash
# Backup current route
cd app/api/orders/create/
mv route.js route.js.backup

# Use atomic version with idempotency
mv route-atomic.js route.js
```

#### Option B: Add to Existing Routes Manually

```javascript
// At top of your route file
import { 
  getIdempotencyKeyFromHeaders, 
  withIdempotency 
} from '@/lib/redis-idempotency';

// In your POST handler
export async function POST(request) {
  // Get idempotency key from headers
  const idempotencyKey = getIdempotencyKeyFromHeaders(request.headers);
  
  if (idempotencyKey) {
    // Wrap operation with idempotency
    return await withIdempotency(idempotencyKey, async () => {
      // Your existing order creation logic here
      const result = await createOrder(orderData);
      return NextResponse.json(result);
    });
  }
  
  // Continue without idempotency if no key provided
  // ... rest of your code
}
```

#### Client-Side Usage

```javascript
// When creating an order, generate and send idempotency key
const idempotencyKey = `order_${userId}_${Date.now()}_${Math.random()}`;

fetch('/api/orders/create', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Idempotency-Key': idempotencyKey,  // ← Add this header
  },
  body: JSON.stringify(orderData),
});
```

---

## 2️⃣ Monitoring & Alerting Integration

### What It Does
Tracks security events (CSRF, CSP violations), performance metrics, and sends alerts to Slack/Sentry.

### Files
- ✅ `lib/monitoring.ts` - Full monitoring utilities
- ✅ Partially integrated in `middleware.ts` (simplified version)

### How to Integrate

#### Step 1: Set Environment Variables

```bash
# In Vercel dashboard or .env.local
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
SLACK_ALERT_WEBHOOK=https://hooks.slack.com/services/xxx
MONITORING_WEBHOOK_URL=https://your-monitoring.com/webhook
```

#### Step 2: Use in API Routes

```javascript
import { 
  logSecurityEvent,
  withPerformanceTracking,
  logTransactionFailure,
  logRetryExhausted 
} from '@/lib/monitoring';

// Track performance
export async function POST(request) {
  return withPerformanceTracking('order_creation', async () => {
    try {
      const result = await createOrder(data);
      return NextResponse.json(result);
    } catch (error) {
      logSecurityEvent('transaction_failure', 'high', 'Order creation failed', {
        error: error.message,
      });
      throw error;
    }
  });
}
```

#### Step 3: Transaction Failure Logging

```javascript
import { logTransactionFailure } from '@/lib/monitoring';
import { createOrderAtomic } from '@/lib/transactions';

try {
  await createOrderAtomic(orderData);
} catch (error) {
  logTransactionFailure(error, { orderId, customerId });
  throw error;
}
```

#### Step 4: Retry Exhaustion Logging

```javascript
import { retrySquareApi } from '@/lib/retry';
import { logRetryExhausted } from '@/lib/monitoring';

try {
  return await retrySquareApi(async () => {
    return await squareClient.createPayment(data);
  });
} catch (error) {
  logRetryExhausted('square_payment', 3, error);
  throw error;
}
```

---

## 3️⃣ Atomic Transactions Integration

### What It Does
Ensures order creation is all-or-nothing: if any step fails, ALL changes are rolled back.

### Files
- ✅ `lib/transactions.ts` - MongoDB transaction helpers
- ✅ `app/api/orders/create/route-atomic.js` - Reference implementation

### How to Integrate

#### Option A: Use Route-Atomic (Easiest)

```bash
cd app/api/orders/create/
mv route.js route.js.old
mv route-atomic.js route.js
```

#### Option B: Add to Existing Route

```javascript
import { createOrderAtomic } from '@/lib/transactions';

export async function POST(request) {
  const orderData = await request.json();
  
  try {
    // Use atomic transaction instead of manual operations
    const order = await createOrderAtomic(orderData);
    
    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error) {
    // All changes automatically rolled back
    return NextResponse.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
}
```

#### What Gets Rolled Back

If ANY step fails, ALL of these are undone:
1. ❌ Order insertion
2. ❌ Customer update
3. ❌ Inventory decrement
4. ❌ Coupon usage mark

---

## 4️⃣ Retry Logic Integration

### What It Does
Automatically retries failed API calls (Square, email, SMS) with exponential backoff.

### Files
- ✅ `lib/retry.ts` - Retry utilities with backoff

### How to Integrate

#### For Square API Calls

```javascript
import { retrySquareApi } from '@/lib/retry';

// Before (no retry):
const payment = await squareClient.createPayment(data);

// After (with retry):
const payment = await retrySquareApi(async () => {
  return await squareClient.createPayment(data);
});
```

#### For Email Sending

```javascript
import { retryEmailSend } from '@/lib/retry';

// Wrap your email sending
await retryEmailSend(async () => {
  return await sendgrid.send(emailData);
});
```

#### For SMS Sending

```javascript
import { retrySmsSend } from '@/lib/retry';

// Wrap your SMS sending
await retrySmsSend(async () => {
  return await twilio.messages.create(smsData);
});
```

#### Custom Retry Configuration

```javascript
import { retry, isRetryableHttpError } from '@/lib/retry';

await retry(
  async () => await dangerousOperation(),
  {
    maxAttempts: 5,
    initialDelayMs: 2000,
    maxDelayMs: 30000,
    retryableErrors: isRetryableHttpError,
    onRetry: (attempt, error) => {
      console.warn(`Retry attempt ${attempt}:`, error.message);
    },
  }
);
```

---

## 5️⃣ Testing Integration

### Failure Scenario Tests

#### Run Tests

```bash
# Run the failure scenario test suite
node tests/failure-scenarios.test.js
```

#### Expected Output

```
🚀 Running failure scenario tests...
============================================================

🧪 Test 1: Database connection loss during transaction
  - Inserting order...
  - Updating customer...
  - Connection lost! 💥
  ✅ Transaction rolled back automatically
  ✅ Test passed: No partial updates in database

🧪 Test 2: Square API timeout with retry
  - Attempt 1...
  ⚠️ Attempt 1 failed: ETIMEDOUT
  - Attempt 2...
  ⚠️ Attempt 2 failed: ETIMEDOUT
  - Attempt 3...
  ✅ API call succeeded on attempt 3
  ✅ Test passed: Retry logic worked correctly

[... more tests ...]

============================================================
✅ All tests passed!

✨ System is resilient to common failure scenarios
```

---

## 6️⃣ Environment Variables - Complete List

### Copy to Vercel Dashboard

```env
# ==========================================
# DATABASE
# ==========================================
MONGO_URL=mongodb://localhost:27017
DB_NAME=taste_of_gratitude_prod

# ==========================================
# SQUARE PAYMENTS
# ==========================================
NEXT_PUBLIC_SQUARE_APP_ID=sq0idp-YOUR_APP_ID
NEXT_PUBLIC_SQUARE_LOCATION_ID=YOUR_LOCATION_ID
SQUARE_ACCESS_TOKEN=sq0atp-YOUR_ACCESS_TOKEN
SQUARE_WEBHOOK_SIGNATURE_KEY=YOUR_WEBHOOK_KEY
SQUARE_ENVIRONMENT=production

# ==========================================
# SECURITY (GENERATE NEW VALUES!)
# ==========================================
# Generate with: openssl rand -base64 32
JWT_SECRET=CHANGE_ME_32_CHARS_MINIMUM
ADMIN_JWT_SECRET=CHANGE_ME_32_CHARS_MINIMUM
ADMIN_API_KEY=CHANGE_ME_RANDOM_STRING
MASTER_API_KEY=CHANGE_ME_MASTER_KEY
INIT_SECRET=CHANGE_ME_INIT_SECRET
CRON_SECRET=CHANGE_ME_CRON_SECRET

# Admin defaults (change on first login)
ADMIN_DEFAULT_EMAIL=admin@tasteofgratitude.shop
ADMIN_DEFAULT_PASSWORD=CHANGE_ME_SECURE_PASSWORD

# ==========================================
# COMMUNICATION SERVICES
# ==========================================
# Twilio SMS
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890

# Email (SendGrid)
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=hello@tasteofgratitude.com

# Email (Resend - alternative)
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxx

# ==========================================
# APPLICATION
# ==========================================
NODE_ENV=production
NEXT_PUBLIC_BASE_URL=https://tasteofgratitude.shop
CORS_ORIGINS=https://tasteofgratitude.shop,https://www.tasteofgratitude.shop

# ==========================================
# REDIS (Production Idempotency Cache)
# ==========================================
# Get from: Upstash Redis or Vercel KV
REDIS_URL=redis://default:password@host:6379

# ==========================================
# MONITORING & ALERTS
# ==========================================
# Sentry (https://sentry.io)
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# Slack Alerts (https://api.slack.com/messaging/webhooks)
SLACK_ALERT_WEBHOOK=https://hooks.slack.com/services/xxx/xxx/xxx

# Custom monitoring webhook
MONITORING_WEBHOOK_URL=https://your-monitoring.com/webhook

# Alert email
ALERT_EMAIL=alerts@tasteofgratitude.shop

# ==========================================
# ANALYTICS (Optional)
# ==========================================
NEXT_PUBLIC_POSTHOG_KEY=phc_xxxxxxxxxxxxxxxxxxxxxxxxxx
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# ==========================================
# CATALOG & CRAWLER
# ==========================================
NEXT_PUBLIC_CATALOG_SOURCE=product_link
ROOT_DOMAIN=https://tasteofgratitude.shop
```

---

## 7️⃣ Quick Integration Checklist

### For Immediate Production Deploy

- [ ] **Set all environment variables in Vercel**
- [ ] **Swap to atomic order route:**
  ```bash
  mv app/api/orders/create/route.js route.js.old
  mv app/api/orders/create/route-atomic.js route.js
  ```
- [ ] **Enable Redis** (optional but recommended):
  - Add REDIS_URL to Vercel
  - Uses Upstash Redis or Vercel KV
- [ ] **Configure monitoring:**
  - Add SENTRY_DSN
  - Add SLACK_ALERT_WEBHOOK
- [ ] **Test failure scenarios:**
  ```bash
  node tests/failure-scenarios.test.js
  ```
- [ ] **Deploy to preview first:**
  ```bash
  vercel deploy
  ```

### For Gradual Integration

- [ ] **Week 1:** Deploy atomic transactions only
- [ ] **Week 2:** Add idempotency to critical routes
- [ ] **Week 3:** Integrate retry logic for external APIs
- [ ] **Week 4:** Enable full monitoring stack

---

## 8️⃣ Rollback Plan

If issues occur, you can easily rollback:

```bash
# Restore original order route
cd app/api/orders/create/
mv route.js route-atomic.js
mv route.js.old route.js
git add .
git commit -m "Rollback to original order route"
vercel deploy --prod
```

---

## 📊 Expected Improvements

### Before Integration
- ❌ Duplicate orders possible
- ❌ Partial order updates on failure
- ❌ No retry on API failures
- ❌ Silent errors
- ❌ No performance tracking

### After Integration
- ✅ Idempotency prevents duplicates
- ✅ Atomic transactions (all-or-nothing)
- ✅ Automatic retries with backoff
- ✅ Real-time alerts on critical issues
- ✅ Performance metrics tracked

---

## 🆘 Troubleshooting

### "Redis connection failed"
**Solution:** Falls back to memory cache automatically. Add REDIS_URL later.

### "Transaction failed to start"
**Solution:** Ensure MongoDB supports transactions (replica set required).

### "Monitoring not sending alerts"
**Solution:** Check SENTRY_DSN and SLACK_ALERT_WEBHOOK are set correctly.

### "Idempotency key rejected"
**Solution:** Ensure key is 16-64 characters, alphanumeric with dashes/underscores.

---

## 📞 Support

**Documentation:**
- `.emergent/PRODUCTION_READY.md` - Complete deployment guide
- `.emergent/PHASE2_REPORT.md` - Technical details
- `.emergent/FULL_CHECK_REPORT.md` - System status

**Test Files:**
- `tests/failure-scenarios.test.js` - Verify resilience

---

**🚀 Ready to integrate? Start with the atomic order route for immediate impact!**
