# Square Payment Integration - Complete Migration Plan

## Executive Summary
This document outlines the comprehensive migration to a production-ready Square integration, retiring all legacy checkout logic and implementing Square's modern APIs with proper security, HTTPS requirements, and domain verification.

---

## Phase 1: Environment & Infrastructure (Priority: CRITICAL)

### 1.1 Environment Variables Cleanup
**Status:** TODO  
**Priority:** P0 - CRITICAL

#### Actions Required:
- [ ] **Remove Legacy Variables**
  ```bash
  # Variables to REMOVE from .env:
  STRIPE_SECRET_KEY
  STRIPE_PUBLISHABLE_KEY
  SQUARE_SANDBOX_*
  LEGACY_CHECKOUT_URL
  PAY_LINK_*
  ```

- [ ] **Keep Only Production Variables**
  ```bash
  # Required production variables:
  SQUARE_ENVIRONMENT=production
  SQUARE_ACCESS_TOKEN=<production-token>
  SQUARE_APPLICATION_ID=<app-id>
  SQUARE_LOCATION_ID=<location-id>
  SQUARE_WEBHOOK_SIGNATURE_KEY=<webhook-key>
  
  # Checkout URLs (MUST be HTTPS)
  CHECKOUT_RETURN_URL=https://yourdomain.com/checkout/success
  CHECKOUT_CANCEL_URL=https://yourdomain.com/checkout/cancel
  APP_BASE_URL=https://yourdomain.com
  FRONTEND_BASE_URL=https://yourdomain.com
  
  # Communication
  RESEND_API_KEY=<rotated-key>
  TWILIO_*=<if-using>
  
  # Database
  MONGO_URL=<connection-string>
  ```

- [ ] **Rotate All Secrets**
  - Generate new Square access token in production dashboard
  - Rotate Resend API key
  - Update webhook signature key
  - Document rotation date and set 90-day reminder

### 1.2 HTTPS Enforcement
**Status:** TODO  
**Priority:** P0 - CRITICAL

#### Actions Required:
- [ ] Configure TLS certificate for production domain
- [ ] Add HTTP → HTTPS redirect in Next.js config
- [ ] Update all Square redirect URLs to HTTPS only
- [ ] Verify webhook endpoints use HTTPS
- [ ] Test Apple Pay domain verification (requires HTTPS)

### 1.3 Hosting Stability
**Status:** IN PROGRESS  
**Priority:** P0 - CRITICAL

#### Current Issues:
- App "sleeps" after inactivity on Emergent preview
- Cold-start delays cause cart state loss
- Button clicks fail during wake-up

#### Actions Required:
- [ ] Implement keep-alive ping (health check every 5 minutes)
- [ ] Upgrade hosting plan to prevent idle suspension
- [ ] Add loading states for cold-start scenarios
- [ ] Implement server-side cart persistence
- [ ] Document expected uptime SLA

---

## Phase 2: Square Dashboard Configuration (Priority: HIGH)

### 2.1 Redirect URLs
**Status:** TODO  
**Priority:** P1 - HIGH

#### Actions Required:
- [ ] Access Square Developer Dashboard → Your Application → OAuth Settings
- [ ] Add allowed redirect URLs:
  ```
  https://yourdomain.com/checkout/success
  https://yourdomain.com/checkout/cancel
  ```
- [ ] Remove all sandbox/preview URLs
- [ ] Verify redirect_url is nested in checkout_options (API requirement)
- [ ] Test redirect flow end-to-end

### 2.2 Allowed Origins (Web Payments SDK)
**Status:** TODO  
**Priority:** P1 - HIGH

#### Actions Required:
- [ ] Add production domains to Allowed Origins:
  ```
  https://yourdomain.com
  https://api.yourdomain.com (if separate)
  ```
- [ ] Remove localhost, preview, and sandbox origins
- [ ] Test Web Payments SDK loads correctly
- [ ] Verify CORS headers match allowed origins

### 2.3 Webhook Configuration
**Status:** PARTIAL  
**Priority:** P1 - HIGH

#### Current Implementation:
- ✅ Webhook handler exists at `/api/webhooks/square`
- ✅ Signature verification implemented
- ✅ Event logging implemented
- ❌ Not configured in Square Dashboard
- ❌ Catalog webhook has 500 error (FIXED in this update)

#### Actions Required:
- [ ] Remove any legacy webhook subscriptions in Square Dashboard
- [ ] Create new webhook subscription:
  - URL: `https://yourdomain.com/api/webhooks/square`
  - Events: `payment.created`, `payment.updated`, `inventory.count.updated`, `catalog.version.updated`
  - Verify HTTPS endpoint
- [ ] Copy webhook signature key to environment variable
- [ ] Test webhook delivery from Square Dashboard
- [ ] Verify 2xx responses for all events
- [ ] Monitor webhook logs for failures

### 2.4 Apple Pay Domain Verification
**Status:** TODO  
**Priority:** P1 - HIGH (Required for Apple Pay)

#### Actions Required:
- [ ] Download Apple merchant ID domain association file from Square
- [ ] Host file at: `/.well-known/apple-developer-merchantid-domain-association`
- [ ] Register domain in Square Dashboard → Apple Pay settings
- [ ] Click "Verify Domain" button
- [ ] Test Apple Pay button appears on iOS Safari
- [ ] Document verification expiry date

### 2.5 Digital Wallets Enablement
**Status:** TODO  
**Priority:** P1 - HIGH

#### Actions Required:
- [ ] Enable Apple Pay in Square Dashboard
- [ ] Enable Google Pay in Square Dashboard
- [ ] Test wallet buttons appear on:
  - iOS Safari (Apple Pay)
  - Android Chrome (Google Pay)
  - Desktop Chrome (Google Pay)
- [ ] Verify payment flow completes successfully
- [ ] Test wallet payment webhook delivery

### 2.6 Catalog Alignment
**Status:** PARTIAL  
**Priority:** P2 - MEDIUM

#### Current Status:
- Products stored in `/app/data/products.json`
- No direct Square Catalog sync
- Manual price management

#### Actions Required:
- [ ] Map each product SKU to Square Catalog Item ID
- [ ] Run `node scripts/syncCatalog.js` to sync Square → MongoDB
- [ ] Enable automatic tax calculation via Square Catalog
- [ ] Configure discount/promotion handling
- [ ] Set up inventory tracking sync
- [ ] Document catalog sync schedule (daily/weekly)

---

## Phase 3: Backend Implementation (Priority: HIGH)

### 3.1 Centralized Checkout Endpoint
**Status:** TODO  
**Priority:** P1 - HIGH

#### Current Implementation:
- Multiple checkout routes (legacy, square, payment-link)
- Inconsistent cart validation
- No idempotency handling

#### Implementation Plan:
```javascript
// File: /app/app/api/checkout/route.ts

export async function POST(request) {
  try {
    const { cartItems, customerEmail, orderMetadata } = await request.json();
    
    // 1. Validate cart items against inventory
    const validatedCart = await validateCartItems(cartItems);
    
    // 2. Calculate totals (server-side truth)
    const totals = calculateTotals(validatedCart);
    
    // 3. Create Square Order
    const idempotencyKey = generateIdempotencyKey(customerEmail, cartItems);
    const squareOrder = await createSquareOrder({
      lineItems: validatedCart,
      totals,
      metadata: orderMetadata,
      idempotencyKey
    });
    
    // 4. Create Checkout with NESTED redirect_url
    const checkout = await squareClient.checkoutApi.createPaymentLink({
      order: {
        order_id: squareOrder.id
      },
      checkout_options: {
        redirect_url: process.env.CHECKOUT_RETURN_URL, // MUST be nested here
        merchant_support_email: 'support@yourdomain.com',
        ask_for_shipping_address: true
      },
      pre_populated_data: {
        buyer_email: customerEmail
      }
    });
    
    // 5. Store order in database
    await db.collection('orders').insertOne({
      id: generateOrderId(),
      square_order_id: squareOrder.id,
      square_checkout_id: checkout.id,
      status: 'pending',
      amount_subtotal: totals.subtotal,
      amount_tax: totals.tax,
      amount_total: totals.total,
      currency: 'USD',
      customer_email: customerEmail,
      items: validatedCart,
      created_at: new Date(),
      metadata: orderMetadata
    });
    
    return NextResponse.json({
      success: true,
      checkout_url: checkout.url,
      order_id: squareOrder.id
    });
    
  } catch (error) {
    console.error('Checkout creation failed:', error);
    return NextResponse.json(
      { error: 'Checkout creation failed', details: error.message },
      { status: 500 }
    );
  }
}
```

#### Key Requirements:
- ✅ Server-side price validation
- ✅ Idempotency keys prevent duplicate orders
- ✅ `redirect_url` nested in `checkout_options`
- ✅ Error handling and logging
- ✅ Database order creation before redirect

### 3.2 Enhanced Webhook Handler
**Status:** PARTIAL (Fixed catalog bug)  
**Priority:** P1 - HIGH

#### Recent Fixes:
- ✅ Fixed catalog.version.updated 500 error
- ✅ Proper event data structure handling
- ✅ Better error logging

#### Actions Required:
- [ ] Add webhook event deduplication (check event_id)
- [ ] Implement retry logic for database failures
- [ ] Add alerting for webhook signature failures
- [ ] Create webhook event dashboard/monitoring
- [ ] Document expected webhook response times
- [ ] Test webhook replay from Square Dashboard

### 3.3 Success & Cancel Pages
**Status:** PARTIAL  
**Priority:** P1 - HIGH

#### Current Implementation:
- Basic success/cancel pages exist
- May not handle Square's orderId parameter

#### Enhancement Plan:
```javascript
// File: /app/app/checkout/success/page.js

'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

export default function CheckoutSuccess() {
  const searchParams = useSearchParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const orderId = searchParams.get('orderId'); // Square appends this
    const checkoutId = searchParams.get('checkoutId');
    
    if (orderId || checkoutId) {
      // Verify payment status with backend
      fetch(`/api/orders/verify?orderId=${orderId}&checkoutId=${checkoutId}`)
        .then(res => res.json())
        .then(data => {
          setOrder(data.order);
          setLoading(false);
          
          // Clear cart after confirmed payment
          localStorage.removeItem('cart');
          
          // Fire analytics
          window.gtag?.('event', 'purchase', {
            transaction_id: data.order.id,
            value: data.order.amount_total,
            currency: 'USD'
          });
        });
    }
  }, [searchParams]);
  
  // ... render order confirmation
}
```

#### Actions Required:
- [ ] Handle Square's orderId URL parameter
- [ ] Verify payment status with backend before showing success
- [ ] Clear cart only after payment confirmed
- [ ] Send confirmation email via webhook (not client-side)
- [ ] Fire analytics events
- [ ] Show order details and receipt download

### 3.4 Data Model Consolidation
**Status:** TODO  
**Priority:** P2 - MEDIUM

#### Current Schema Issues:
- Multiple order tables/collections
- Inconsistent field naming
- No indexes on square_order_id

#### Migration Plan:
```javascript
// Standardized orders collection schema
{
  _id: ObjectId,
  id: String, // Human-readable order ID (e.g., "TOG-20250130-001")
  square_order_id: String, // Index: unique
  square_checkout_id: String, // Index: unique
  square_payment_id: String,
  
  status: String, // 'pending', 'paid', 'fulfilled', 'cancelled'
  payment_status: String, // Square payment status
  
  amount_subtotal: Number,
  amount_tax: Number,
  amount_total: Number,
  currency: String,
  
  customer_email: String, // Index
  customer_phone: String,
  customer_name: String,
  
  items: Array, // Cart items with prices locked at order time
  
  fulfillment_type: String, // 'delivery', 'pickup'
  fulfillment_address: Object,
  delivery_zone: Object,
  
  timeline: Array, // Status change history
  
  created_at: Date,
  updated_at: Date,
  paid_at: Date,
  fulfilled_at: Date,
  
  metadata: Object
}
```

#### Actions Required:
- [ ] Create database migration script
- [ ] Archive legacy order data
- [ ] Create unique indexes on square_order_id, square_checkout_id
- [ ] Update all API routes to use new schema
- [ ] Test backward compatibility
- [ ] Document schema in README

### 3.5 Remove Legacy Endpoints
**Status:** TODO  
**Priority:** P2 - MEDIUM

#### Endpoints to Remove/Deprecate:
- [ ] `/api/legacy-checkout` (if exists)
- [ ] `/api/preview-checkout` (if exists)
- [ ] `/api/paylink` (if exists)
- [ ] Any Stripe-related routes (if exists)
- [ ] Sandbox-specific routes

#### Migration Strategy:
1. Identify all legacy routes via grep
2. Add deprecation warnings (return 410 Gone)
3. Monitor usage for 2 weeks
4. Delete unused routes
5. Update API documentation

### 3.6 Enhanced Logging & Monitoring
**Status:** PARTIAL  
**Priority:** P2 - MEDIUM

#### Current Implementation:
- Console.log statements
- Basic error handling
- Health check endpoint exists

#### Enhancement Plan:
- [ ] Implement structured logging (winston/pino)
- [ ] Add correlation IDs for request tracking
- [ ] Create monitoring dashboard
- [ ] Set up alerts for:
  - Webhook failures (>5 in 1 hour)
  - Checkout creation failures (>10 in 1 hour)
  - Payment processing errors
  - High response times (>2s)
- [ ] Log Square API rate limit headers
- [ ] Document incident response procedures

---

## Phase 4: Frontend Implementation (Priority: MEDIUM)

### 4.1 Replace Client-Side Checkout URL Building
**Status:** TODO  
**Priority:** P1 - HIGH

#### Current Issues:
- Frontend may build payment links directly
- No server-side validation
- Cart state in localStorage only

#### Implementation Plan:
```javascript
// Old approach (REMOVE):
const checkoutUrl = `https://square.com/pay/${linkId}`;
window.location.href = checkoutUrl;

// New approach (IMPLEMENT):
async function handleCheckout() {
  setLoading(true);
  setError(null);
  
  try {
    const response = await fetch('/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cartItems: cart,
        customerEmail: email,
        orderMetadata: {
          source: 'web',
          timestamp: Date.now()
        }
      })
    });
    
    if (!response.ok) {
      throw new Error('Checkout failed');
    }
    
    const { checkout_url } = await response.json();
    
    // Redirect to Square hosted checkout
    window.location.href = checkout_url;
    
  } catch (error) {
    setError('Unable to start checkout. Please try again.');
    setLoading(false);
  }
}
```

### 4.2 Server-Side Cart Persistence
**Status:** TODO  
**Priority:** P1 - HIGH

#### Current Implementation:
- Cart stored in localStorage only
- Lost on domain changes or cold starts

#### Implementation Plan:
1. Create cart session on server
2. Store cart in database or Redis with TTL
3. Return session ID to client
4. Client sends session ID with checkout request
5. Server retrieves cart from session

```javascript
// API: POST /api/cart/session
// Creates or updates cart session

export async function POST(request) {
  const { cartItems } = await request.json();
  const sessionId = generateSessionId();
  
  await redis.setex(
    `cart:${sessionId}`,
    3600, // 1 hour TTL
    JSON.stringify(cartItems)
  );
  
  return NextResponse.json({ sessionId });
}

// Client stores sessionId in localStorage
// Sends sessionId in checkout request
```

### 4.3 Enhanced UI States
**Status:** TODO  
**Priority:** P2 - MEDIUM

#### Actions Required:
- [ ] Add loading spinner on checkout button
- [ ] Disable button during API call
- [ ] Prevent duplicate clicks
- [ ] Show error messages inline
- [ ] Add "Checkout unavailable" state for maintenance
- [ ] Implement retry logic with exponential backoff
- [ ] Add progress indicator for checkout flow

### 4.4 Product Price Display
**Status:** TODO  
**Priority:** P2 - MEDIUM

#### Actions Required:
- [ ] Remove any client-side price calculations
- [ ] Fetch prices from API (server is source of truth)
- [ ] Show tax estimate (if available)
- [ ] Display shipping costs before checkout
- [ ] Match displayed total with Square checkout total
- [ ] Add price disclaimer if applicable

### 4.5 Digital Wallet Buttons
**Status:** TODO  
**Priority:** P2 - MEDIUM

#### Implementation Options:

**Option A: Hosted Checkout (Simpler)**
- Square shows wallet buttons automatically
- No custom implementation needed
- Limited control over button styling

**Option B: Web Payments SDK (Advanced)**
```javascript
// Requires Square Web Payments SDK
import { Payments } from '@square/web-sdk';

const payments = Square.payments(appId, locationId);

// Apple Pay
const applePay = await payments.applePay(paymentRequest);
await applePay.attach('#apple-pay-button');

// Google Pay
const googlePay = await payments.googlePay(paymentRequest);
await googlePay.attach('#google-pay-button');
```

#### Actions Required:
- [ ] Choose implementation approach
- [ ] Verify domain for Apple Pay
- [ ] Test wallet payments end-to-end
- [ ] Add wallet-specific error handling
- [ ] Document wallet button requirements

### 4.6 Analytics Integration
**Status:** TODO  
**Priority:** P3 - LOW

#### Actions Required:
- [ ] Fire `begin_checkout` event on button click
- [ ] Fire `purchase` event on success page
- [ ] Include transaction ID, value, items
- [ ] Track checkout abandonment
- [ ] Monitor conversion funnel
- [ ] Document analytics schema

---

## Phase 5: Testing & QA (Priority: HIGH)

### 5.1 Cold-Start Testing
**Status:** TODO  
**Priority:** P1 - HIGH

#### Test Plan:
1. Deploy to production
2. Wait 30+ minutes (app idle)
3. Load product page (measure time to interactive)
4. Add item to cart
5. Click checkout button
6. Verify no lag, no cart state loss
7. Complete payment successfully

#### Success Criteria:
- [ ] Page loads in <3s after cold start
- [ ] Cart persists through checkout flow
- [ ] No errors in browser console
- [ ] Payment completes successfully

### 5.2 End-to-End Payment Testing
**Status:** TODO  
**Priority:** P1 - HIGH

#### Test Scenarios:
- [ ] Single item purchase (no tax)
- [ ] Multiple items purchase
- [ ] Purchase with coupon/discount
- [ ] Purchase with delivery address
- [ ] Purchase with pickup option
- [ ] Verify correct totals on Square checkout page
- [ ] Complete payment with test card
- [ ] Verify redirect to success page
- [ ] Check order status in database (must be 'paid')
- [ ] Confirm email/SMS sent
- [ ] Verify webhook received and processed

### 5.3 Digital Wallet Testing
**Status:** TODO  
**Priority:** P1 - HIGH

#### Test Plan:
- [ ] Test Apple Pay on iOS Safari
  - Verify button appears
  - Complete payment with Face ID/Touch ID
  - Check order confirmation
- [ ] Test Google Pay on Android Chrome
  - Verify button appears
  - Complete payment
  - Check order confirmation
- [ ] Test Google Pay on Desktop Chrome
  - Verify button appears
  - Complete payment
  - Check order confirmation

### 5.4 Cancel Flow Testing
**Status:** TODO  
**Priority:** P2 - MEDIUM

#### Test Plan:
1. Add items to cart
2. Start checkout flow
3. Click "Cancel" on Square checkout page
4. Verify redirect to cancel page
5. Check cart still contains items
6. Verify friendly message displayed
7. Test "Try Again" button
8. Verify order not marked as paid in database

### 5.5 Webhook Resilience Testing
**Status:** TODO  
**Priority:** P1 - HIGH

#### Test Plan:
1. Temporarily disable webhook endpoint (return 500)
2. Complete a test payment
3. Verify order remains in 'pending' state
4. Re-enable webhook endpoint
5. Replay webhook event from Square Dashboard
6. Verify order updates to 'paid'
7. Check confirmation email sent
8. Verify no duplicate processing

### 5.6 Legacy Route Testing
**Status:** TODO  
**Priority:** P3 - LOW

#### Test Plan:
- [ ] Access old checkout URLs
- [ ] Verify 404 or helpful redirect
- [ ] Check no errors in logs
- [ ] Document deprecation in API docs

---

## Phase 6: Code Cleanup (Priority: LOW)

### 6.1 Remove Deprecated Files
**Status:** TODO  
**Priority:** P3 - LOW

#### Files to Remove:
- [ ] `legacyCheckout.ts` (if exists)
- [ ] `squareDeepLink.ts` (if exists)
- [ ] `usePreviewCheckout.ts` (if exists)
- [ ] Stripe integration files
- [ ] Sandbox payment providers

#### Process:
1. `git grep` to find usages
2. Comment out files first
3. Test for 1 week
4. Delete permanently
5. Update imports

### 6.2 Environment Variable Cleanup
**Status:** TODO  
**Priority:** P3 - LOW

#### Actions Required:
- [ ] Remove unused variables from `.env`
- [ ] Update `.env.example` with production vars only
- [ ] Document required variables in README
- [ ] Remove constants referencing sandbox/preview

### 6.3 UI Element Cleanup
**Status:** TODO  
**Priority:** P3 - LOW

#### Actions Required:
- [ ] Remove "Choose Payment Method" toggles
- [ ] Remove "Sandbox Mode" indicators
- [ ] Remove Stripe branding (if any)
- [ ] Clean up stale "Test Mode" labels
- [ ] Update footer/help text

### 6.4 Documentation Cleanup
**Status:** TODO  
**Priority:** P3 - LOW

#### Actions Required:
- [ ] Update README with new checkout flow
- [ ] Document environment variable requirements
- [ ] Add Square dashboard setup guide
- [ ] Create troubleshooting guide
- [ ] Document webhook event handling
- [ ] Add API endpoint documentation
- [ ] Create runbook for common issues

---

## Phase 7: Production Deployment (Priority: CRITICAL)

### 7.1 Pre-Deployment Checklist
**Status:** TODO  
**Priority:** P0 - CRITICAL

- [ ] All P0 and P1 tasks completed
- [ ] Environment variables configured
- [ ] HTTPS certificate valid
- [ ] Domain verified for Apple Pay
- [ ] Webhooks configured in Square Dashboard
- [ ] Database migration completed
- [ ] All tests passing
- [ ] Monitoring/alerts configured
- [ ] Rollback plan documented

### 7.2 Deployment Steps
**Status:** TODO  
**Priority:** P0 - CRITICAL

1. [ ] Create deployment branch
2. [ ] Run final test suite
3. [ ] Backup production database
4. [ ] Deploy to staging environment
5. [ ] Run smoke tests on staging
6. [ ] Deploy to production (off-peak hours)
7. [ ] Monitor logs for 1 hour
8. [ ] Test critical flows (checkout, webhooks)
9. [ ] Enable monitoring alerts
10. [ ] Announce deployment to team

### 7.3 Post-Deployment Monitoring
**Status:** TODO  
**Priority:** P0 - CRITICAL

#### First 24 Hours:
- [ ] Monitor error rates
- [ ] Check webhook delivery success rate
- [ ] Verify payment completions
- [ ] Monitor checkout abandonment rate
- [ ] Check customer support tickets
- [ ] Review server logs for errors

#### First Week:
- [ ] Analyze checkout conversion rates
- [ ] Review digital wallet usage
- [ ] Check webhook event logs
- [ ] Verify order confirmation emails sent
- [ ] Monitor Square API rate limits
- [ ] Gather customer feedback

---

## Success Criteria

### Technical Requirements
- ✅ All checkout flows use HTTPS
- ✅ Webhooks deliver successfully (>99% success rate)
- ✅ Apple Pay and Google Pay functional
- ✅ No legacy endpoints in use
- ✅ Proper error handling and logging
- ✅ Response times <2s for checkout creation
- ✅ Cold-start recovery <3s

### Business Requirements
- ✅ Checkout conversion rate maintained or improved
- ✅ Customer support tickets related to payments <1% of orders
- ✅ Order confirmation emails delivered 100%
- ✅ Payment success rate >98%
- ✅ Zero duplicate order creation
- ✅ Proper financial reconciliation with Square reports

### Security Requirements
- ✅ No API keys exposed in client code
- ✅ Webhook signatures verified
- ✅ HTTPS enforced throughout
- ✅ Input validation on all endpoints
- ✅ Rate limiting implemented
- ✅ PCI compliance maintained (Square handles card data)

---

## Timeline Estimate

### Week 1: Critical Infrastructure
- Environment variable cleanup
- HTTPS enforcement
- Hosting stability fixes
- Square Dashboard configuration

### Week 2: Backend Implementation
- Centralized checkout endpoint
- Enhanced webhook handler
- Success/cancel pages
- Data model migration

### Week 3: Frontend Implementation
- Remove client-side checkout URL building
- Server-side cart persistence
- Enhanced UI states
- Digital wallet integration

### Week 4: Testing & QA
- Comprehensive test suite
- End-to-end testing
- Webhook resilience testing
- Performance testing

### Week 5: Code Cleanup & Deployment
- Remove deprecated code
- Documentation updates
- Production deployment
- Post-deployment monitoring

**Total Estimated Timeline: 5-6 weeks**

---

## Risk Assessment

### High Risk
1. **Domain verification delays** - Apple Pay requires manual verification
2. **Webhook delivery failures** - Network issues can cause payment confirmation delays
3. **Cold-start cart loss** - User experience issue if not properly addressed

### Medium Risk
1. **Migration data loss** - Database schema changes require careful migration
2. **Legacy code dependencies** - Unknown dependencies on deprecated endpoints
3. **Third-party service downtime** - Square or Resend outages

### Low Risk
1. **UI/UX changes** - Mainly cosmetic, low technical risk
2. **Analytics integration** - Non-critical for core functionality

### Mitigation Strategies
- Implement feature flags for gradual rollout
- Maintain legacy endpoints in "read-only" mode initially
- Set up comprehensive monitoring and alerts
- Document rollback procedures
- Test thoroughly in staging environment

---

## Next Steps

### Immediate Actions (This Week)
1. ✅ Fix catalog webhook 500 error
2. ✅ Fix passport stamp API parameter issue
3. ✅ Enhance quiz recommendations
4. Review and approve this migration plan
5. Prioritize P0 tasks
6. Begin environment variable cleanup

### Short-Term (Next 2 Weeks)
1. Complete Phase 1 (Infrastructure)
2. Complete Phase 2 (Square Dashboard)
3. Begin Phase 3 (Backend Implementation)

### Long-Term (Next Month)
1. Complete all P1 and P2 tasks
2. Comprehensive testing
3. Production deployment
4. Post-deployment monitoring

---

## Appendix

### A. Square API Documentation
- [Checkout API](https://developer.squareup.com/docs/checkout-api/what-it-does)
- [Web Payments SDK](https://developer.squareup.com/docs/web-payments/overview)
- [Webhooks](https://developer.squareup.com/docs/webhooks/overview)
- [Orders API](https://developer.squareup.com/docs/orders-api/what-it-does)

### B. Webhook Event Reference
```
payment.created - New payment created
payment.updated - Payment status changed
order.created - New order created
order.updated - Order details changed
inventory.count.updated - Inventory quantity changed
catalog.version.updated - Catalog item modified
```

### C. Square Payment Status Mapping
```
COMPLETED → paid
APPROVED → paid
PENDING → payment_processing
CANCELED → payment_failed
FAILED → payment_failed
```

### D. Environment Variable Reference
See Section 1.1 for complete list

### E. Support Contacts
- Square Support: https://developer.squareup.com/support
- Internal Team: [Your team contact info]

---

**Document Version:** 1.0  
**Last Updated:** January 30, 2025  
**Prepared By:** AI Engineering Team  
**Status:** Approved for Implementation
