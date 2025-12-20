# Square Integration Guide

## Overview

This application uses the Square SDK directly for all payment operations. The SDK handles authentication, timeouts, and error handling intelligently.

## Architecture

All Square API calls go through direct SDK wrappers in `/lib/square-direct.ts`:

```
API Routes → square-direct.ts → Square SDK → Square API
```

## Key Files

- **`/lib/square.ts`** - SDK initialization & configuration
- **`/lib/square-direct.ts`** - Direct SDK operation wrappers (payments, orders, customers, catalog)
- **`/lib/square-customer.ts`** - Customer management with Square
- **`/lib/square-guard.ts`** - Authentication/authorization checks
- **`/lib/square-env-validator.ts`** - Environment variable validation
- **`/app/api/payments/route.ts`** - Payment processing endpoint
- **`/app/api/checkout/route.ts`** - Checkout/payment links endpoint

## Configuration

Set these environment variables:

```env
SQUARE_ENVIRONMENT=sandbox           # or 'production'
SQUARE_ACCESS_TOKEN=your_token       # Production access token
SQUARE_APPLICATION_ID=your_app_id    # From Square Dashboard
SQUARE_LOCATION_ID=your_location_id  # Location to process payments
SQUARE_WEBHOOK_SIGNATURE_KEY=key     # For webhook verification
```

## Usage

### Payment Creation

```typescript
import { createPaymentDirect } from '@/lib/square-direct';

const payment = await createPaymentDirect({
  sourceId: 'cnp:card-nonce-ok',     // From Web Payments SDK
  amount: 1000,                        // cents
  currency: 'USD',
  idempotencyKey: randomUUID(),        // Prevent duplicate charges
  customerId: 'CUSTOMER_ID',           // Optional: link to customer
  orderId: 'ORDER_ID'                  // Optional: link to order
});
```

### Create Checkout Link

```typescript
import { createPaymentLinkDirect } from '@/lib/square-direct';

const link = await createPaymentLinkDirect({
  locationId: 'LOC_ID',
  lineItems: [
    {
      catalogObjectId: 'ITEM_VAR_ID',
      quantity: '1',
      name: 'Product Name'
    }
  ],
  idempotencyKey: randomUUID(),
  checkoutOptions: {
    redirectUrl: 'https://example.com/success',
    askForShippingAddress: false
  }
});
```

### Create Customer

```typescript
import { createCustomerDirect } from '@/lib/square-direct';

const customer = await createCustomerDirect({
  givenName: 'John',
  familyName: 'Doe',
  emailAddress: 'john@example.com',
  phoneNumber: '+14155552671'
});
```

### Search Customers

```typescript
import { searchCustomersDirect } from '@/lib/square-direct';

const results = await searchCustomersDirect('john@example.com');
```

## API Endpoints

### POST /api/payments
Process a payment with a tokenized payment source.

**Request:**
```json
{
  "sourceId": "cnp:card-nonce-ok",
  "amountCents": 1000,
  "currency": "USD",
  "idempotencyKey": "uuid",
  "customer": {
    "email": "customer@example.com",
    "name": "John Doe",
    "phone": "+14155552671"
  },
  "orderId": "order-123"
}
```

**Response:**
```json
{
  "success": true,
  "payment": {
    "id": "payment-id",
    "status": "COMPLETED",
    "amountPaid": "10.00",
    "currency": "USD",
    "receiptUrl": "https://...",
    "cardLast4": "1234",
    "cardBrand": "VISA"
  }
}
```

### POST /api/checkout
Create a payment link for hosted checkout.

**Request:**
```json
{
  "lineItems": [
    {
      "catalogObjectId": "item-var-id",
      "quantity": 1,
      "name": "Product"
    }
  ],
  "customer": {
    "email": "customer@example.com",
    "name": "John Doe"
  },
  "fulfillmentType": "delivery"
}
```

**Response:**
```json
{
  "success": true,
  "paymentLink": {
    "id": "link-id",
    "url": "https://checkout.squareup.com/...",
    "orderId": "order-id"
  }
}
```

### GET /api/square/test-rest
Health check for Square API connectivity.

**Response:**
```json
{
  "tests": {
    "locations": { "success": true, "count": 2 },
    "payments": { "success": true, "count": 5 },
    "catalog": { "success": true, "count": 50 }
  },
  "overall": "HEALTHY"
}
```

## Error Handling

```typescript
try {
  const payment = await createPaymentDirect({ /* ... */ });
} catch (error) {
  if (error instanceof Error) {
    console.error('Payment failed:', error.message);
    
    // Check for specific errors
    if (error.message.includes('CARD_DECLINED')) {
      // Handle decline
    }
    if (error.message.includes('UNAUTHORIZED')) {
      // Check credentials
    }
  }
}
```

## Idempotency

**Always use unique idempotency keys** to prevent duplicate charges:

```typescript
import { randomUUID } from 'crypto';

const payment = await createPaymentDirect({
  // ...
  idempotencyKey: randomUUID()  // ✅ Unique for each request
});
```

Don't reuse keys or hardcode values.

## Testing

### In Sandbox

Use these test credentials:
- **Card Number:** 4111 1111 1111 1111
- **Exp Date:** Any future date
- **CVV:** Any 3 digits

### Health Check

```bash
curl http://localhost:3000/api/square/test-rest
```

### Simulate Errors

For testing error handling, Square provides test cards:
- `4000 0200 0000 0000` → Card declined
- `4000 0300 0000 0000` → Insufficient funds

## Webhooks

Square sends webhooks for payment events. Handler: `/app/api/webhooks/square/route.ts`

Webhook signature verification is automatic. Configure webhook URL in Square Dashboard:
```
https://your-domain.com/api/webhooks/square
```

## Troubleshooting

### Payment Timeouts
- SDK handles timeouts intelligently per operation
- No hard timeout limits
- Check network connectivity

### Authentication Errors
- Verify `SQUARE_ACCESS_TOKEN` is correct production token
- Check `SQUARE_ENVIRONMENT` matches token type
- Run `/api/square/diagnose` for detailed info

### Invalid Location
- Verify `SQUARE_LOCATION_ID` exists in Square account
- Check location is in correct environment (sandbox vs production)

### Card Declined
- Verify card details with customer
- Check for sufficient funds
- Some cards have decline rules

## Dashboard Links

- Square Developer Dashboard: https://developer.squareup.com/apps
- Production Environment: `https://connect.squareup.com`
- Sandbox Environment: `https://connect.squareupsandbox.com`

## Additional Resources

- [Square Node SDK](https://github.com/square/square-nodejs-sdk)
- [Square API Reference](https://developer.squareup.com/reference/square)
- [Web Payments SDK](https://developer.squareup.com/docs/web-payments/overview)
- [Payment Processing Guide](https://developer.squareup.com/docs/payments-api/overview)
