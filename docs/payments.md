# Square Payments Integration

This document outlines the Square payments integration for Taste of Gratitude, including setup, configuration, and usage patterns.

## Overview

The application uses Square as the single source of truth for pricing, taxes, and discounts. Two checkout flows are supported:

1. **Payment Links** (Recommended) - Square-hosted checkout pages
2. **Web Payments SDK** - In-page payment forms

## Environment Configuration

### Required Environment Variables

```bash
# Server-side (Required)
SQUARE_ACCESS_TOKEN=EAAAlw0EYo3qkpGi25LPMPfxSSwhf-HnwDooR8boTuXP6Y7YwI7BjOpwhEc20Zo6
SQUARE_LOCATION_ID=L66TVG6867BG9
SQUARE_APPLICATION_ID=sq0idp-V1fV-MwsU5lET4rvzHKnIw
SQUARE_ENVIRONMENT=sandbox # or 'production'
SQUARE_WEBHOOK_SIGNATURE_KEY=your-webhook-signature-key

# Client-side (Public)
NEXT_PUBLIC_SQUARE_APPLICATION_ID=sq0idp-V1fV-MwsU5lET4rvzHKnIw
NEXT_PUBLIC_SQUARE_LOCATION_ID=L66TVG6867BG9
```

### Environment Matrix

| Environment | Access Token Prefix | API Endpoint | Use Case |
|-------------|-------------------|--------------|----------|
| Sandbox | `EAAA` or `EAAAl` | `connect.squareupsandbox.com` | Development/Testing |
| Production | `EAAA` or `EAAAl` | `connect.squareup.com` | Live payments |

## Pricing Model

### Server-Authoritative Pricing

All prices come from Square Catalog API to ensure consistency:

```javascript
// ❌ Don't do this (client-side pricing)
const total = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);

// ✅ Do this (server-authoritative pricing)
const response = await fetch('/api/cart/price', {
  method: 'POST',
  body: JSON.stringify({ variationIds, quantities })
});
const { order } = await response.json();
const total = order.totals.total;
```

### Money Handling

All monetary values use integer cents to avoid floating-point errors:

```javascript
import { toMoney, fromMoney, formatMoney } from '@/lib/money';

// Convert dollars to Square Money object
const money = toMoney(12.34); // { amount: 1234n, currency: 'USD' }

// Convert Square Money back to dollars
const dollars = fromMoney(money); // 12.34

// Format for display
const formatted = formatMoney(1234); // "$12.34"
```

## Checkout Flows

### Option A: Payment Links (Recommended)

Square-hosted checkout pages with full PCI compliance:

```javascript
// Create payment link
const response = await fetch('/api/checkout', {
  method: 'POST',
  body: JSON.stringify({
    items: cart.items,
    customer: { email, name, phone },
    redirectUrl: '/checkout/success'
  })
});

const { paymentLink } = await response.json();
window.location.href = paymentLink.url;
```

**Pros:**
- Fastest to implement
- PCI compliant by default
- Supports all Square payment methods
- Automatic tax/discount application

**Cons:**
- User leaves your domain
- Less customization control

### Option B: Web Payments SDK

In-page payment forms keeping users on your domain:

```jsx
import PayForm from '@/components/PayForm';

function CheckoutPage() {
  const handlePaymentComplete = (payment) => {
    // Handle successful payment
    window.location.href = `/checkout/success?paymentId=${payment.id}`;
  };

  return (
    <PayForm
      amountCents={totalCents}
      orderId={orderId}
      customer={customer}
      onPaymentComplete={handlePaymentComplete}
    />
  );
}
```

**Pros:**
- Users stay on your domain
- Full UI customization
- Better brand experience

**Cons:**
- More complex implementation
- Need to handle PCI considerations
- Manual Apple/Google Pay setup

## Catalog Synchronization

### Manual Sync

```bash
npm run sync-catalog
```

### Automatic Sync via Webhooks

Webhooks automatically sync when catalog changes:

1. **Setup in Square Dashboard:**
   - Go to Developer Dashboard > Webhooks
   - Add endpoint: `https://your-domain.com/api/webhooks/square`
   - Enable events: `catalog.version.updated`, `inventory.count.updated`

2. **Webhook Events Handled:**
   - `catalog.version.updated` → Triggers catalog sync
   - `inventory.count.updated` → Updates stock levels
   - `payment.updated` → Updates payment status
   - `order.updated` → Updates order status

## Tax and Discount Application

Square automatically applies configured taxes and discounts:

```javascript
const orderRequest = {
  order: {
    locationId: SQUARE_LOCATION_ID,
    lineItems: items,
    pricingOptions: {
      autoApplyTaxes: true,      // Apply location taxes
      autoApplyDiscounts: true   // Apply active promotions
    }
  }
};
```

**Configure in Square Dashboard:**
- **Taxes:** Settings > Tax
- **Discounts:** Items & Orders > Discounts

## Apple Pay Setup

### Domain Registration

1. **Register domain in Square Dashboard:**
   - Go to Developer Dashboard > Apple Pay
   - Add your production domain

2. **Host verification file:**
   ```bash
   # Place this file in your public directory
   curl -o public/.well-known/apple-developer-merchantid-domain-association \
     https://js.squareup.com/apple-pay-domain-verification
   ```

3. **Verify accessibility:**
   ```bash
   curl https://your-domain.com/.well-known/apple-developer-merchantid-domain-association
   ```

## Testing

### Test Square Integration

```bash
npm run test:square
```

This tests:
- ✅ Square client configuration
- ✅ API connectivity
- ✅ Catalog access
- ✅ Orders API
- ✅ Checkout API
- ✅ Environment detection

### Test Payment Cards (Sandbox)

| Card Number | Result |
|-------------|--------|
| `4111 1111 1111 1111` | Successful charge |
| `4000 0000 0000 0002` | Card declined |
| `4000 0000 0000 0119` | Processing error |

## Error Handling

### Common Square API Errors

| Error Code | Meaning | Solution |
|------------|---------|----------|
| `UNAUTHORIZED` | Invalid access token | Check token and permissions |
| `FORBIDDEN` | Missing permissions | Enable required scopes in Dashboard |
| `NOT_FOUND` | Invalid location/catalog ID | Verify IDs in Dashboard |
| `RATE_LIMITED` | Too many requests | Implement retry with backoff |

### Graceful Fallbacks

```javascript
try {
  const squareResult = await processSquarePayment(data);
  return squareResult;
} catch (error) {
  // Log error for debugging
  console.error('Square payment failed:', error);
  
  // Return user-friendly message
  return {
    success: false,
    error: 'Payment processing temporarily unavailable. Please try again.'
  };
}
```

## Production Deployment

### Pre-deployment Checklist

- [ ] Set `SQUARE_ENVIRONMENT=production`
- [ ] Update access token to production token
- [ ] Configure production webhook endpoints
- [ ] Test with real payment methods
- [ ] Set up monitoring and alerting
- [ ] Configure Apple Pay domain (if used)
- [ ] Run integration test suite

### Monitoring

```javascript
// Monitor webhook deliveries
const webhookLogs = await db.collection('webhook_logs')
  .find({ processed: false })
  .toArray();

// Monitor failed payments
const failedPayments = await db.collection('payments')
  .find({ status: 'FAILED' })
  .toArray();
```

### Security

1. **Never expose server-side tokens client-side**
2. **Always verify webhook signatures**
3. **Use idempotency keys for payments**
4. **Validate all input data**
5. **Log security events**

## Troubleshooting

### Payment Link Not Creating

```javascript
// Check order structure
console.log('Order request:', JSON.stringify(orderRequest, null, 2));

// Verify required fields
if (!orderRequest.order.locationId) {
  throw new Error('Location ID required');
}
```

### Web Payments SDK Not Loading

```javascript
// Check if SDK loaded
if (!window.Square) {
  console.error('Square Web Payments SDK not loaded');
  // Add SDK script tag dynamically
}

// Verify application ID
if (!process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID) {
  console.error('Square Application ID not configured');
}
```

### Webhook Signature Verification Failing

```javascript
// Debug signature calculation
const notificationUrl = process.env.WEBHOOK_NOTIFICATION_URL;
const payload = notificationUrl + requestBody;
const expectedSignature = crypto
  .createHmac('sha256', WEBHOOK_SIGNATURE_KEY)
  .update(payload, 'utf8')
  .digest('base64');

console.log('Expected:', expectedSignature);
console.log('Received:', request.headers['x-square-hmacsha256-signature']);
```

## Support

For issues with Square integration:

1. Check [Square Developer Documentation](https://developer.squareup.com/docs)
2. Review application logs for specific error codes
3. Test with Square API Explorer
4. Contact Square Developer Support if needed

## API Reference

- [Square Checkout API](https://developer.squareup.com/docs/checkout-api/what-it-does)
- [Square Payments API](https://developer.squareup.com/docs/payments-api/overview)
- [Square Catalog API](https://developer.squareup.com/docs/catalog-api/what-it-does)
- [Square Orders API](https://developer.squareup.com/docs/orders-api/what-it-does)
- [Square Webhooks](https://developer.squareup.com/docs/webhooks/overview)