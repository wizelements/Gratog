# 🚨 PAYMENT SDK TIMEOUT - IMPLEMENTATION PLAN
## Taste of Gratitude - December 20, 2025

---

## SYSTEM MAP (VISUAL SUMMARY)

See diagram above: Complete E2E flow from customer click → tokenization → API call → Square → webhook → order update.

**Critical timeout vectors identified:**
1. ❌ SDK loading: No timeout wrapper (10-15s hangs possible)
2. ❌ Backend fetch: No timeout on Square API call (can hang indefinitely)
3. ❌ Browser fetch: No automatic timeout on /api/payments call
4. ❌ Webhook deduplication: Risk of duplicate charges from webhook retries

---

## PRIORITY 1: CRITICAL FIXES (Do Today)

### FIX 1: Add Timeout to Backend Square REST Client
**File:** `lib/square-rest.ts`  
**Risk:** Low  
**Effort:** 5 minutes  
**Impact:** Prevents backend from hanging on slow Square API

```typescript
// ADD: HTTP Agent with timeout
import http from 'http';
import https from 'https';

const httpAgent = new http.Agent({
  keepAlive: true,
  maxSockets: 10,
  timeout: 8000 // 8 second socket timeout
});

const httpsAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 10,
  timeout: 8000 // 8 second socket timeout
});

export async function sqFetch<T>(
  env: Env,
  path: string,
  token: string,
  init: RequestInit = {},
) {
  const url = `${sqBase(env)}${path}`;
  const headers = {
    "Authorization": `Bearer ${token}`,
    "Square-Version": process.env.SQUARE_VERSION ?? "2025-10-16",
    "Content-Type": "application/json",
    ...(init.headers ?? {}),
  };

  // NEW: Add AbortController with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(url, {
      ...init,
      headers,
      signal: controller.signal,
      // ADD: HTTP agents for connection pooling + keep-alive
      ...(url.startsWith('https') ? { agent: httpsAgent } : { agent: httpAgent })
    });
    
    const text = await res.text();
    const json = text ? JSON.parse(text) : {};
    
    if (!res.ok) {
      throw Object.assign(
        new Error(json?.errors?.[0]?.detail || `Square ${res.status}`),
        { status: res.status, errors: json?.errors, body: json }
      );
    }
    
    return json as T;
  } finally {
    clearTimeout(timeoutId);
  }
}
```

---

### FIX 2: Add SDK Load Timeout
**File:** `components/checkout/SquarePaymentForm.tsx`  
**Risk:** Low  
**Effort:** 10 minutes  
**Impact:** Prevents SDK loading from hanging indefinitely

```typescript
// In useEffect for SDK loading (around line 152-180):

const loadScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (window.Square) {
      resolve();
      return;
    }

    const existingScript = document.querySelector(`script[src="${config.sdkUrl}"]`);
    if (existingScript) {
      if ((existingScript as HTMLScriptElement).getAttribute('data-loaded') === 'true') {
        resolve();
        return;
      }
      
      // NEW: Add timeout for existing script
      const timeoutId = setTimeout(() => reject(new Error('SDK load timeout (10s)')), 10000);
      
      existingScript.addEventListener('load', () => {
        clearTimeout(timeoutId);
        resolve();
      });
      existingScript.addEventListener('error', () => {
        clearTimeout(timeoutId);
        reject(new Error('Failed to load Square SDK'));
      });
      return;
    }

    // NEW: Add timeout for new script
    const timeoutId = setTimeout(() => reject(new Error('SDK load timeout (10s)')), 10000);
    
    const script = document.createElement('script');
    script.src = config.sdkUrl;
    script.async = true;
    script.onload = () => {
      clearTimeout(timeoutId);
      script.setAttribute('data-loaded', 'true');
      resolve();
    };
    script.onerror = () => {
      clearTimeout(timeoutId);
      reject(new Error('Failed to load Square SDK'));
    };
    document.head.appendChild(script);
  });
};
```

---

### FIX 3: Add Browser Fetch Timeout
**File:** `components/checkout/SquarePaymentForm.tsx` (around line 308-321)  
**Risk:** Low  
**Effort:** 5 minutes  
**Impact:** Prevents user from hanging on /api/payments call

```typescript
const processPayment = useCallback(async (sourceId: string) => {
  try {
    // Abort previous request if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    // Generate or reuse idempotency key
    const idempotencyKey = paymentIdempotencyKeyRef.current || `payment_${orderId}_${Date.now()}`;
    if (!paymentIdempotencyKeyRef.current) {
      paymentIdempotencyKeyRef.current = idempotencyKey;
    }
    
    // NEW: Add timeout for fetch
    const timeoutId = setTimeout(() => abortControllerRef.current?.abort(), 15000); // 15 second browser timeout
    
    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceId,
          amountCents,
          currency: 'USD',
          orderId,
          squareOrderId,
          customer,
          idempotencyKey
        }),
        signal: abortControllerRef.current.signal
      });

      clearTimeout(timeoutId);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Payment processing failed');
      }

      track('payment_completed', {
        orderId,
        amount: amountCents / 100,
        paymentId: data.payment?.id
      });

      onSuccess({
        paymentId: data.payment.id,
        status: data.payment.status,
        receiptUrl: data.payment.receiptUrl,
        cardLast4: data.payment.cardLast4,
        cardBrand: data.payment.cardBrand
      });
    } catch (err) {
      clearTimeout(timeoutId);
      
      // Don't throw AbortError - distinguish timeout from network error
      if (err instanceof Error && err.name === 'AbortError') {
        console.debug('Payment request cancelled or timed out');
        throw new Error('Payment request timed out - please try again');
      }
      throw err;
    }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.debug('Payment request cancelled');
      return;
    }
    throw err;
  }
}, [amountCents, orderId, squareOrderId, customer, onSuccess]);
```

---

### FIX 4: Webhook Event Deduplication
**File:** `app/api/webhooks/square/route.ts` (in POST handler)  
**Risk:** Medium (requires DB migration)  
**Effort:** 15 minutes  
**Impact:** Prevents double-charges from webhook retries

```typescript
export async function POST(request: NextRequest) {
  try {
    logger.debug('Webhook', 'Square webhook received');
    
    const requestBody = await request.text();
    const requestUrl = request.url;
    const signatureHeader = request.headers.get('Square-Signature');
    
    // Verify signature...
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (!isDevelopment && signatureHeader) {
      const isSignatureValid = verifyWebhookSignature(
        signatureHeader,
        requestUrl,
        requestBody
      );
      
      if (!isSignatureValid) {
        logger.error('Webhook', 'Invalid webhook signature');
        return NextResponse.json(
          { error: 'Invalid signature' },
          { status: 401 }
        );
      }
    }
    
    // Parse webhook event
    const webhookEvent = JSON.parse(requestBody);
    const eventId = webhookEvent.id || webhookEvent.event_id; // NEW: Extract event ID
    const eventType = webhookEvent.type;
    const eventData = webhookEvent.data;
    
    if (!eventData || !eventData.object) {
      logger.error('Webhook', 'Invalid webhook event structure - missing data.object');
      return NextResponse.json(
        { error: 'Invalid event structure' },
        { status: 400 }
      );
    }
    
    // NEW: Deduplication check
    let isAlreadyProcessed = false;
    try {
      const { db } = await connectToDatabase();
      
      // Check if event already processed
      const processed = await db.collection('webhook_events_processed')
        .findOne({ eventId });
      
      if (processed) {
        logger.debug('Webhook', 'Event already processed (idempotent return)', { eventId });
        isAlreadyProcessed = true;
      }
    } catch (dbErr) {
      logger.warn('Webhook', 'Failed to check webhook dedup (continuing anyway)', dbErr);
      // Continue processing even if dedup check fails
    }
    
    // If already processed, return success (idempotent)
    if (isAlreadyProcessed) {
      return NextResponse.json({
        received: true,
        eventType,
        eventId,
        processedAt: new Date().toISOString(),
        cached: true
      });
    }
    
    // Process the event
    switch (eventType) {
      case 'inventory.count.updated':
        await handleInventoryUpdate(eventData.object);
        break;
      case 'catalog.version.updated':
        await handleCatalogUpdate(eventData.object);
        break;
      case 'payment.created':
        await handlePaymentCreated(eventData.object.payment || eventData.object);
        break;
      case 'payment.updated':
        await handlePaymentUpdated(eventData.object.payment || eventData.object);
        break;
      case 'order.created':
        await handleOrderCreated(eventData.object.order || eventData.object);
        break;
      case 'order.updated':
        await handleOrderUpdated(eventData.object.order || eventData.object);
        break;
      default:
        logger.debug('Webhook', `Unhandled webhook event type: ${eventType}`);
    }
    
    // NEW: Mark as processed (idempotency)
    try {
      const { db } = await connectToDatabase();
      await db.collection('webhook_events_processed')
        .insertOne({
          eventId,
          eventType,
          processedAt: new Date(),
          status: 'success'
        }, { writeConcern: { w: 1 } });
    } catch (dbErr) {
      logger.warn('Webhook', 'Failed to record webhook processing (non-critical)', dbErr);
    }
    
    // Log webhook
    await logWebhookEvent(webhookEvent);
    
    return NextResponse.json({
      received: true,
      eventType,
      eventId,
      processedAt: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Webhook', 'Webhook processing error:', { error: (error as Error).message });
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
```

---

## PRIORITY 2: MAJOR IMPROVEMENTS (Tomorrow)

### FIX 5: Add Retry Logic (Exponential Backoff)
**File:** `lib/square-retry.ts` (NEW FILE)  
**Risk:** Medium  
**Effort:** 30 minutes  
**Impact:** Improves payment success on transient failures

```typescript
// NEW FILE: lib/square-retry.ts
export async function sqFetchWithRetry<T>(
  env: 'sandbox' | 'production',
  path: string,
  token: string,
  init: RequestInit = {},
  maxRetries: number = 2
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await sqFetch<T>(env, path, token, init);
    } catch (error) {
      lastError = error as Error;
      
      // Never retry auth errors
      if (error instanceof Error && error.message?.includes('401')) {
        throw error;
      }
      
      // Never retry validation errors (4xx except 429)
      if (error instanceof Error && error.message?.includes('400')) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === maxRetries + 1) {
        throw lastError;
      }
      
      // Exponential backoff with jitter
      const baseDelay = 100 * Math.pow(2, attempt - 1);
      const jitter = Math.random() * 100;
      const delay = baseDelay + jitter;
      
      console.log(`Square API request failed (attempt ${attempt}/${maxRetries + 1}), retrying in ${Math.round(delay)}ms...`, error);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}
```

Then update `square-ops.ts` to use retry:

```typescript
import { sqFetchWithRetry } from "./square-retry";

export async function createPayment(input: { /* ... */ }) {
  // Use retry version instead of direct sqFetch
  return sqFetchWithRetry(env, "/v2/payments", token, {
    method: "POST",
    body: JSON.stringify(paymentBody),
  });
}
```

---

### FIX 6: Add Structured Logging & Trace IDs
**File:** `lib/request-context.ts` (NEW FILE)  
**Risk:** Low  
**Effort:** 15 minutes  
**Impact:** Makes debugging payment issues possible

```typescript
// NEW FILE: lib/request-context.ts
import { randomUUID } from 'crypto';

export class RequestContext {
  traceId: string;
  private startTime: number;
  
  constructor(traceId?: string) {
    this.traceId = traceId || `trace_${randomUUID().substring(0, 8)}`;
    this.startTime = Date.now();
  }
  
  duration(): number {
    return Date.now() - this.startTime;
  }
  
  durationMs(): string {
    return `${this.duration()}ms`;
  }
}
```

Update `app/api/payments/route.ts`:

```typescript
import { RequestContext } from '@/lib/request-context';

export async function POST(request: NextRequest) {
  const ctx = new RequestContext();
  
  try {
    logger.debug('PAYMENT', 'Payment request started', {
      traceId: ctx.traceId,
      sourceId: sourceId?.substring(0, 20) + '...',
      amountCents,
      orderId
    });
    
    // ... payment processing ...
    
    logger.debug('PAYMENT', 'Payment completed', {
      traceId: ctx.traceId,
      duration: ctx.durationMs(),
      paymentId: payment.id,
      status: payment.status
    });
    
    return NextResponse.json({
      success: true,
      payment: { /* ... */ },
      traceId: ctx.traceId // Return for user to reference in support
    });
    
  } catch (error) {
    logger.error('PAYMENT', 'Payment failed', {
      traceId: ctx.traceId,
      duration: ctx.durationMs(),
      error: error instanceof Error ? error.message : String(error)
    });
    
    return NextResponse.json({
      success: false,
      error: 'Payment processing failed',
      traceId: ctx.traceId
    }, { status: 500 });
  }
}
```

---

### FIX 7: Add CSP Headers
**File:** `next.config.js`  
**Risk:** Medium  
**Effort:** 10 minutes  
**Impact:** Prevents CSP from blocking Square SDK

Update the headers section:

```javascript
async headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        // NEW: CSP for Square
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            "script-src 'self' https://sandbox.web.squarecdn.com https://web.squarecdn.com",
            "frame-src 'self' https://sandbox.squareup.com https://squareup.com",
            "connect-src 'self' https://connect.squareupsandbox.com https://connect.squareup.com",
            "style-src 'self' 'unsafe-inline'",
            "img-src 'self' https:",
            "font-src 'self' https:"
          ].join("; ")
        }
      ],
    },
    // API routes exempt from CSP
    {
      source: "/api/:path*",
      headers: [
        { key: "Access-Control-Allow-Origin", value: process.env.CORS_ORIGINS || "*" },
        { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
        { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        { key: "Access-Control-Allow-Credentials", value: "true" },
      ],
    },
  ];
}
```

---

## TEST PLAN

### Unit Tests
- `tests/lib/square-retry.test.ts` - Retry logic
- `tests/lib/square-rest.test.ts` - Timeout handling

### Integration Tests
- `tests/api/payments.test.ts` - Payment endpoint with timeout
- `tests/api/webhooks/square.test.ts` - Webhook deduplication

### E2E Tests (Playwright)
- `e2e/checkout-timeout.spec.ts` - SDK timeout scenarios
- `e2e/checkout-payment.spec.ts` - Happy path payment

---

## DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] All code changes reviewed
- [ ] Unit tests pass: `npm run test:unit`
- [ ] E2E tests pass: `npm run test:e2e:smoke`
- [ ] No CSP violations in Chrome DevTools

### Environment Setup (Vercel)
- [ ] `SQUARE_ACCESS_TOKEN` set (production token)
- [ ] `NEXT_PUBLIC_SQUARE_APPLICATION_ID` set
- [ ] `SQUARE_ENVIRONMENT` = `production` or `sandbox`
- [ ] `SQUARE_LOCATION_ID` set
- [ ] `SQUARE_WEBHOOK_SIGNATURE_KEY` set

### Square Dashboard
- [ ] Domain whitelisted: `tasteofgratitude.shop`
- [ ] Domain whitelisted: `gratog.vercel.app`
- [ ] Webhook endpoint: `https://tasteofgratitude.shop/api/webhooks/square`
- [ ] Webhook events: payment.created, payment.updated, payment.completed
- [ ] Signature key matches env var

### Deployment
- [ ] Create PR with all fixes
- [ ] Code review + approval
- [ ] Merge to main branch
- [ ] Deploy to Vercel (automatic)
- [ ] Monitor Sentry for errors

### Post-Deployment Smoke Tests
- [ ] Test payment with sandbox card: `4532 0155 0016 4662`
- [ ] Verify payment shows in Square Dashboard
- [ ] Verify webhook received
- [ ] Verify order status updated
- [ ] Verify email confirmation sent

### Rollback
If issues found:
- [ ] Revert PR: `git revert <commit-hash>`
- [ ] Monitor error rate in Sentry

---

## TIMELINE

| Phase | Tasks | Time | Owner |
|-------|-------|------|-------|
| **NOW** | FIX 1-4 (timeouts, dedup) | 45 mins | Amp |
| **TODAY** | Tests + deploy fixes 1-4 | 1 hour | Team |
| **TOMORROW** | FIX 5-7 (retry, logs, CSP) | 1.5 hours | Amp |
| **TOMORROW** | Extended tests + deploy | 1 hour | Team |
| **WEEK 1** | Monitor metrics, edge cases | ongoing | Team |

---

## SUCCESS METRICS

- [ ] 0 timeout errors in production
- [ ] 99%+ payment success rate
- [ ] <1 second P95 latency
- [ ] 100% webhook delivery (no lost events)
- [ ] Automated alerts on failures

