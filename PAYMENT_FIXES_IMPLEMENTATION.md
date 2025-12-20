# 🔧 PAYMENT FIXES - IMPLEMENTATION GUIDE

This document contains PR-ready code for all identified payment issues.

## CRITICAL: SET ENVIRONMENT VARIABLES FIRST

**DO THIS IMMEDIATELY** (blocks all payments):

1. Go to: https://vercel.com → Your Project → Settings → Environment Variables
2. Add these variables for **all environments** (Production, Preview, Development):

```
SQUARE_ACCESS_TOKEN=sq0atp-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
NEXT_PUBLIC_SQUARE_APPLICATION_ID=sq0idp-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
SQUARE_ENVIRONMENT=sandbox  (for testing) OR production (for live)
```

3. Get values from: https://developer.squareup.com/apps → Your App → Credentials

---

## FIX #1: Add Timeout to Square REST Client (CRITICAL)

**File:** `lib/square-rest.ts`  
**Replace entire file:**

```typescript
// Minimal REST client for Square API with timeout protection
const BASES = {
  production: "https://connect.squareup.com",
  sandbox: "https://connect.squareupsandbox.com",
} as const;

type Env = keyof typeof BASES;

export function sqBase(env: Env) {
  return BASES[env];
}

/**
 * Fetch from Square API with automatic timeout
 * @param timeoutMs - Timeout in milliseconds (default: 8000ms = 8 seconds)
 */
export async function sqFetch<T>(
  env: Env,
  path: string,
  token: string,
  init: RequestInit = {},
  timeoutMs = 8000,  // ✅ NEW: Default 8-second timeout
) {
  const url = `${sqBase(env)}${path}`;
  const controller = new AbortController();
  
  // ✅ NEW: Set up timeout that aborts the request
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const headers = {
      "Authorization": `Bearer ${token}`,
      "Square-Version": process.env.SQUARE_VERSION ?? "2025-10-16",
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    };
    
    const res = await fetch(url, {
      ...init,
      headers,
      signal: controller.signal,  // ✅ NEW: Pass abort signal
    });
    
    const text = await res.text();
    const json = text ? JSON.parse(text) : {};
    
    if (!res.ok) {
      // Normalize Square-style errors
      throw Object.assign(
        new Error(json?.errors?.[0]?.detail || `Square ${res.status}`),
        { status: res.status, errors: json?.errors, body: json }
      );
    }
    
    return json as T;
  } finally {
    clearTimeout(timeout);  // ✅ NEW: Always clear timeout
  }
}
```

---

## FIX #2: Add Timeout to SDK Loading (MAJOR)

**File:** `components/checkout/SquarePaymentForm.tsx`  
**Replace the `loadScript` function (lines 152-180):**

```typescript
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
      
      // ✅ NEW: Add timeout for existing script
      const loadTimeout = setTimeout(
        () => reject(new Error('Square SDK load timeout (existing script)')),
        10000  // 10-second timeout
      );
      
      existingScript.addEventListener('load', () => {
        clearTimeout(loadTimeout);
        resolve();
      });
      existingScript.addEventListener('error', () => {
        clearTimeout(loadTimeout);
        reject(new Error('Failed to load Square SDK'));
      });
      return;
    }

    const script = document.createElement('script');
    script.src = config.sdkUrl;
    script.async = true;
    
    // ✅ NEW: Set up timeout for new script
    const loadTimeout = setTimeout(() => {
      reject(new Error('Square SDK load timeout (new script)'));
      try {
        document.head.removeChild(script);
      } catch (e) {
        // Script may have already been removed
      }
    }, 10000);  // 10-second timeout
    
    script.onload = () => {
      clearTimeout(loadTimeout);
      script.setAttribute('data-loaded', 'true');
      resolve();
    };
    script.onerror = () => {
      clearTimeout(loadTimeout);
      reject(new Error('Failed to load Square SDK'));
    };
    
    document.head.appendChild(script);
  });
};
```

---

## FIX #3: Add Timeout to Browser-side Payment Fetch (MAJOR)

**File:** `components/checkout/SquarePaymentForm.tsx`  
**Replace the `processPayment` function (lines 294-350):**

```typescript
const processPayment = useCallback(async (sourceId: string) => {
  try {
    // Create abort controller for this payment attempt
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    // Generate or reuse idempotency key
    const idempotencyKey = paymentIdempotencyKeyRef.current || `payment_${orderId}_${Date.now()}`;
    if (!paymentIdempotencyKeyRef.current) {
      paymentIdempotencyKeyRef.current = idempotencyKey;
    }
    
    // ✅ NEW: Set up timeout for payment request
    const paymentTimeout = setTimeout(
      () => {
        abortControllerRef.current?.abort();
      },
      15000  // 15-second timeout for browser
    );
    
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
    } finally {
      clearTimeout(paymentTimeout);  // ✅ NEW: Clear timeout
    }
  } catch (err) {
    // ✅ NEW: Better error handling for timeout
    if (err instanceof Error) {
      if (err.name === 'AbortError') {
        throw new Error('Payment request timed out. Please try again.');
      }
    }
    throw err;
  }
}, [amountCents, orderId, squareOrderId, customer, onSuccess]);
```

**Also update error handling in `handleCardPayment` (lines 352-378):**

```typescript
const handleCardPayment = async () => {
  if (!cardRef.current || isProcessing) return;

  setIsProcessing(true);
  setCardError(null);
  track('payment_initiated', { method: 'card', orderId });

  try {
    const result = await cardRef.current.tokenize();

    if (result.status !== 'OK' || !result.token) {
      const errorMsg = result.errors?.[0]?.message || 'Card tokenization failed';
      setCardError(errorMsg);
      track('payment_tokenize_failed', { error: errorMsg });
      return;
    }

    await processPayment(result.token);
  } catch (err) {
    // ✅ NEW: Better timeout error message
    const errorMsg = err instanceof Error 
      ? err.message 
      : 'Payment failed';
    
    // Check if it's a timeout
    if (errorMsg.includes('timeout') || errorMsg.includes('timed out')) {
      setCardError('Payment request timed out. Please check your internet connection and try again.');
    } else {
      setCardError(errorMsg);
    }
    
    track('payment_failed', { error: errorMsg, method: 'card' });
    onError(errorMsg);
  } finally {
    setIsProcessing(false);
  }
};
```

---

## FIX #4: Create Retry Logic Module (MAJOR)

**File:** `lib/square-retry.ts` (NEW FILE)

```typescript
import { sqFetch } from './square-rest';

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: Error, attempt: number) => boolean;
}

/**
 * Fetch from Square API with automatic retry and exponential backoff
 * 
 * Retries on transient errors (network, timeouts, 5xx)
 * Does NOT retry on client errors (4xx, auth failures)
 */
export async function sqFetchWithRetry<T>(
  env: "sandbox" | "production",
  path: string,
  token: string,
  init?: RequestInit,
  options?: RetryOptions
): Promise<T> {
  const maxRetries = options?.maxRetries ?? 2;
  const initialDelayMs = options?.initialDelayMs ?? 500;
  const maxDelayMs = options?.maxDelayMs ?? 8000;
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await sqFetch<T>(env, path, token, init);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      
      // Check if we should retry this error
      const shouldRetry = options?.shouldRetry
        ? options.shouldRetry(lastError, attempt)
        : isRetryableError(lastError);
      
      if (!shouldRetry || attempt === maxRetries) {
        // Don't retry: it's a client error, auth error, or last attempt
        throw lastError;
      }
      
      // Calculate exponential backoff delay
      const delayMs = Math.min(
        initialDelayMs * Math.pow(2, attempt),
        maxDelayMs
      );
      
      console.warn(
        `[Square] Retry ${attempt + 1}/${maxRetries} after ${delayMs}ms:`,
        lastError.message
      );
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  throw lastError || new Error('Unknown error after retries');
}

/**
 * Determine if an error is retryable
 * Don't retry on authentication, client errors, or card declines
 */
function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  
  // Don't retry these errors
  const nonRetryable = [
    '401',          // Unauthorized
    '403',          // Forbidden
    '400',          // Bad request
    'CARD_DECLINED',
    'INVALID_CARD',
    'INSUFFICIENT_FUNDS',
    'ACCOUNT_UNAVAILABLE',
    'UNAUTHORIZED'
  ];
  
  for (const code of nonRetryable) {
    if (message.includes(code)) {
      return false;
    }
  }
  
  // Retry on these errors
  const retryable = [
    'timeout',
    'ECONNREFUSED',
    'ECONNRESET',
    'ETIMEDOUT',
    '408',          // Request timeout
    '429',          // Too many requests
    '500',          // Internal server error
    '502',          // Bad gateway
    '503',          // Service unavailable
    '504'           // Gateway timeout
  ];
  
  for (const code of retryable) {
    if (message.includes(code)) {
      return true;
    }
  }
  
  // Default: don't retry unknown errors
  return false;
}
```

---

## FIX #5: Update Payments API to Use Retry (MAJOR)

**File:** `app/api/payments/route.ts`  
**Add import at top:**

```typescript
import { sqFetchWithRetry } from '@/lib/square-retry';
```

**Replace the `createPayment` call (around line 111):**

```typescript
// OLD:
// const response = await createPayment({ /* ... */ });

// NEW: Use retry logic
const response = await sqFetchWithRetry(
  env === "production" ? "production" : "sandbox",
  "/v2/payments",
  token,
  {
    method: "POST",
    body: JSON.stringify({
      source_id: sourceId,
      idempotency_key: paymentIdempotencyKey,
      amount_money: { amount: amountCents, currency: 'USD' },
      location_id: locationId,
      note: truncatedNote,
      ...(squareOrderId && { order_id: squareOrderId }),
      ...(squareCustomerId && { customer_id: squareCustomerId }),
      ...(customer?.email && { buyer_email_address: customer.email })
    })
  },
  {
    maxRetries: 2,
    initialDelayMs: 500,
    maxDelayMs: 8000
  }
);
```

---

## FIX #6: Add Webhook Event Deduplication (CRITICAL)

**File:** `app/api/square-webhook/route.js`  
**Replace entire file:**

```javascript
import { logger } from '@/lib/logger';
import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { updateOrderStatus } from '@/lib/db-customers';
import { sendOrderUpdateSMS } from '@/lib/sms';
import { sendOrderUpdateEmail } from '@/lib/email';
import { connectToDatabase } from '@/lib/db-optimized';  // ✅ NEW: Add DB import

const SQUARE_WEBHOOK_SIGNATURE_KEY = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;

function verifyWebhookSignature(signatureHeader, requestUrl, requestBody) {
  if (!signatureHeader || !SQUARE_WEBHOOK_SIGNATURE_KEY) {
    logger.debug('Webhook', 'Missing signature header or webhook key');
    return false;
  }
  
  try {
    const [signatureKeyVersion, signature] = signatureHeader.split(',');
    const version = signatureKeyVersion.split('=')[1];
    const squareSignature = signature.split('=')[1];
    
    const hmac = crypto.createHmac('sha256', SQUARE_WEBHOOK_SIGNATURE_KEY);
    hmac.update(requestUrl);
    hmac.update(requestBody);
    
    const calculatedSignature = hmac.digest('base64');
    
    return crypto.timingSafeEqual(
      Buffer.from(calculatedSignature),
      Buffer.from(squareSignature)
    );
  } catch (error) {
    logger.error('Webhook', 'Webhook signature verification error:', error);
    return false;
  }
}

export async function POST(request) {
  try {
    logger.debug('Webhook', 'Square webhook received');
    
    const requestBody = await request.text();
    const requestUrl = request.url;
    const signatureHeader = request.headers.get('square-signature');
    
    // Verify signature
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (!isDevelopment) {
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
    
    const webhookEvent = JSON.parse(requestBody);
    logger.debug('Webhook', 'Webhook event type:', webhookEvent.type);
    
    // ✅ NEW: Deduplication
    const { db } = await connectToDatabase();
    const eventId = webhookEvent.id;
    
    // Check if we already processed this event
    const processed = await db.collection('webhook_events')
      .findOne({ event_id: eventId });
    
    if (processed) {
      logger.debug('Webhook', `Event ${eventId} already processed, returning idempotent response`);
      return NextResponse.json({
        received: true,
        eventId,
        message: 'Event already processed',
        idempotent: true
      });
    }
    
    // Process the event
    const eventType = webhookEvent.type;
    
    try {
      switch (eventType) {
        case 'payment.created':
          await handlePaymentCreated(webhookEvent.data.object.payment);
          break;
        case 'payment.updated':
          await handlePaymentUpdated(webhookEvent.data.object.payment);
          break;
        case 'payment.completed':
          await handlePaymentCompleted(webhookEvent.data.object.payment);
          break;
        case 'payment.failed':
          await handlePaymentFailed(webhookEvent.data.object.payment);
          break;
        case 'refund.created':
          await handleRefundCreated(webhookEvent.data.object.refund);
          break;
        default:
          logger.debug('Webhook', `Unhandled webhook event type: ${eventType}`);
      }
      
      // ✅ NEW: Record that we successfully processed this event
      await db.collection('webhook_events')
        .insertOne({
          event_id: eventId,
          event_type: eventType,
          processed_at: new Date(),
          status: 'success'
        });
      
      logger.debug('Webhook', `Event ${eventId} processed successfully`);
    } catch (processingError) {
      // ✅ NEW: Record processing failure
      await db.collection('webhook_events')
        .insertOne({
          event_id: eventId,
          event_type: eventType,
          attempted_at: new Date(),
          status: 'failed',
          error: processingError instanceof Error ? processingError.message : String(processingError)
        });
      
      logger.error('Webhook', `Failed to process event ${eventId}:`, processingError);
      throw processingError;
    }
    
    return NextResponse.json({
      received: true,
      eventId,
      eventType,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Webhook', '❌ Webhook processing error:', error);
    
    return NextResponse.json(
      {
        error: 'Webhook processing failed',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// Handler functions remain the same...
async function handlePaymentCreated(payment) {
  logger.debug('Webhook', 'Payment created:', payment?.id);
  
  try {
    if (!payment || !payment.id) {
      logger.error('Webhook', 'Invalid payment data received:', payment);
      return;
    }
    
    if (payment.order_id) {
      await updateOrderStatus(payment.order_id, 'payment_processing', {
        paymentId: payment.id,
        status: payment.status,
        updatedAt: new Date().toISOString()
      });
      logger.debug('Webhook', `Order ${payment.order_id} status updated to payment_processing`);
    } else {
      logger.debug('Webhook', 'Payment created without order_id:', payment.id);
    }
  } catch (error) {
    logger.error('Webhook', '❌ Error handling payment created:', error);
  }
}

async function handlePaymentUpdated(payment) {
  logger.debug('Webhook', 'Payment updated:', payment.id, 'Status:', payment.status);
  
  try {
    if (payment.order_id) {
      const statusMap = {
        'COMPLETED': 'paid',
        'APPROVED': 'paid',
        'PENDING': 'payment_processing',
        'CANCELED': 'payment_failed',
        'FAILED': 'payment_failed'
      };
      
      const newOrderStatus = statusMap[payment.status] || 'payment_processing';
      
      await updateOrderStatus(payment.order_id, newOrderStatus, {
        paymentId: payment.id,
        status: payment.status,
        amount: payment.amount_money?.amount,
        currency: payment.amount_money?.currency,
        updatedAt: new Date().toISOString()
      });
      
      logger.debug('Webhook', `Order ${payment.order_id} status updated to ${newOrderStatus}`);
    }
  } catch (error) {
    logger.error('Webhook', 'Error handling payment updated:', error);
  }
}

async function handlePaymentCompleted(payment) {
  logger.debug('Webhook', 'Payment completed successfully:', payment.id);
  
  try {
    if (payment.order_id) {
      await updateOrderStatus(payment.order_id, 'paid', {
        paymentId: payment.id,
        status: 'COMPLETED',
        amount: payment.amount_money?.amount,
        currency: payment.amount_money?.currency,
        completedAt: new Date().toISOString()
      });
      
      logger.debug('Webhook', `Payment completed for order ${payment.order_id}`);
    }
  } catch (error) {
    logger.error('Webhook', 'Error handling payment completed:', error);
  }
}

async function handlePaymentFailed(payment) {
  logger.debug('Webhook', 'Payment failed:', payment.id);
  
  try {
    if (payment.order_id) {
      await updateOrderStatus(payment.order_id, 'payment_failed', {
        paymentId: payment.id,
        status: 'FAILED',
        failureReason: payment.processing_fee?.[0]?.type || 'Unknown',
        failedAt: new Date().toISOString()
      });
      
      logger.debug('Webhook', `Order ${payment.order_id} marked as payment failed`);
    }
  } catch (error) {
    logger.error('Webhook', 'Error handling payment failed:', error);
  }
}

async function handleRefundCreated(refund) {
  logger.debug('Webhook', 'Refund created:', refund.id);
  
  try {
    if (refund.payment_id) {
      logger.debug('Webhook', `Refund created for payment ${refund.payment_id}`);
    }
  } catch (error) {
    logger.error('Webhook', 'Error handling refund created:', error);
  }
}

export async function GET(request) {
  return NextResponse.json({
    message: 'Square webhook endpoint active',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
}
```

---

## FIX #7: Add CSP Headers (MAJOR)

**File:** `next.config.js`  
**Replace the `async headers()` function (lines 141-161):**

```javascript
async headers() {
  return [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload"
        },
        // ✅ NEW: Content Security Policy
        {
          key: "Content-Security-Policy",
          value: [
            "default-src 'self'",
            // Allow Square SDK and payment processing
            "script-src 'self' 'unsafe-inline' https://sandbox.web.squarecdn.com https://web.squarecdn.com",
            // Allow Square payment form iframes
            "frame-src 'self' https://sandbox.squareup.com https://squareup.com",
            // Allow Square API and webhooks
            "connect-src 'self' https://connect.squareupsandbox.com https://connect.squareup.com",
            // Allow styles and fonts
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            // Allow images from Square and elsewhere
            "img-src 'self' https: data:",
            // Upgrade insecure requests
            "upgrade-insecure-requests"
          ].join("; ")
        }
      ],
    },
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

## VERIFICATION CHECKLIST

### Before Committing:
- [ ] All files saved and formatted (run `npm run lint --fix`)
- [ ] No TypeScript errors: `npm run typecheck`
- [ ] Tests pass: `npm run test:unit`

### After Merging to Main:
- [ ] Check Vercel deployment logs for errors
- [ ] Set environment variables in Vercel (CRITICAL)
- [ ] Verify webhook URL in Square Dashboard: `https://tasteofgratitude.shop/api/square-webhook`
- [ ] Test payment with sandbox card: `4532 0155 0016 4662`
- [ ] Verify order appears in Square Dashboard
- [ ] Verify webhook event received in logs

### Test Cases:
1. **Happy path:** Valid card → Success ✅
2. **Timeout:** Simulate slow network → Error with retry prompt ✅
3. **Retry:** First attempt fails → Auto-retry succeeds ✅
4. **Duplicate webhook:** Same event delivered twice → Process once ✅
5. **CSP violations:** Check console for CSP errors → None ✅

---

**Last Updated:** December 20, 2025
