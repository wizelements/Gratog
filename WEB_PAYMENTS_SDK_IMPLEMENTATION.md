# Web Payments SDK Implementation Guide

**For In-Page Checkout (Users Enter Card Details on Your Site)**

---

## Overview

This guide explains how to implement Square's Web Payments SDK for **in-page checkout** where customers enter their card information directly on your website without being redirected to Square's hosted checkout page.

**Difference from Payment Links:**
- ❌ **Payment Links**: Redirects users to `https://square.link/...` (Square-hosted page)
- ✅ **Web Payments SDK**: Users stay on your site, enter card details in embedded form

---

## Prerequisites

### 1. Square OAuth Permissions Required

**CRITICAL**: Before Web Payments SDK will work, you MUST enable these scopes in Square Developer Dashboard:

```
PAYMENTS_WRITE       ✅ Required - Process card payments
PAYMENTS_READ        ✅ Required - Check payment status  
ORDERS_WRITE         ✅ Required - Create orders
ORDERS_READ          ✅ Required - Track order status
CUSTOMERS_WRITE      ⚠️  Optional - Save customer profiles
CUSTOMERS_READ       ⚠️  Optional - Retrieve customer data
```

**How to Enable (see SQUARE_OAUTH_SETUP_COMPLETE_GUIDE.md for detailed steps):**
1. Go to https://developer.squareup.com/apps
2. Select your app → OAuth section
3. Enable the scopes above
4. Regenerate access token
5. Update `.env` with new token

### 2. Environment Variables

```bash
# Required for Web Payments SDK
NEXT_PUBLIC_SQUARE_APPLICATION_ID=sq0idp-V1fV-MwsU5lET4rvzHKnIw

# Required for backend payment processing
SQUARE_ACCESS_TOKEN=YOUR_TOKEN_HERE  # Must have PAYMENTS_WRITE scope
SQUARE_LOCATION_ID=L66TVG6867BG9
SQUARE_ENVIRONMENT=production
```

### 3. HTTPS Required

- ✅ **Production**: MUST use HTTPS
- ✅ **Development**: `localhost` works without HTTPS
- ❌ **HTTP**: Will NOT work (except localhost)

---

## Implementation Steps

### Step 1: Create Web Payments Form Component

**Already Created**: `/app/components/SquareWebPaymentForm.jsx`

This component:
- Loads Square Web Payments SDK from `https://web.squarecdn.com/v1/square.js`
- Initializes payment form with your Application ID
- Renders secure card input fields
- Tokenizes card details
- Sends payment token to your backend

### Step 2: Update Order Page to Use In-Page Checkout

**File**: `/app/app/order/page.js`

**Current Flow (Payment Links - REDIRECTS):**
```javascript
// Creates payment link → redirects to square.link
const checkoutResponse = await fetch('/api/checkout', ...);
window.location.href = checkoutData.paymentLink.url; // ❌ Leaves your site
```

**New Flow (Web Payments SDK - STAYS ON SITE):**
```javascript
// Import the component
import SquareWebPaymentForm from '@/components/SquareWebPaymentForm';

// In your order page
<SquareWebPaymentForm
  amountCents={total * 100}
  currency="USD"
  orderId={orderId}
  customer={customer}
  lineItems={cart}
  onPaymentSuccess={handlePaymentSuccess}
  onPaymentError={handlePaymentError}
/>
```

### Step 3: Backend Payment Processing

**Already Implemented**: `/app/api/payments/route.ts`

This endpoint:
- ✅ Receives payment token from frontend
- ✅ Calls Square Payments API to process payment
- ✅ Stores payment record in database
- ✅ Updates order status
- ✅ Returns payment result

**Request Format:**
```json
{
  "sourceId": "cnon:card-nonce-from-square-sdk",
  "amountCents": 3500,
  "currency": "USD",
  "orderId": "ORDER-123",
  "customer": {
    "email": "customer@example.com",
    "name": "John Doe",
    "phone": "(555) 555-5555"
  },
  "lineItems": [...],
  "idempotencyKey": "unique-key-123"
}
```

**Success Response:**
```json
{
  "success": true,
  "payment": {
    "id": "abc123",
    "status": "COMPLETED",
    "amountPaid": 35.00,
    "currency": "USD",
    "receiptUrl": "https://squareup.com/receipt/...",
    "cardLast4": "1111",
    "cardBrand": "VISA"
  }
}
```

---

## Complete Checkout Flow

### Frontend Flow:

1. **User adds products to cart**
   ```javascript
   cart.addItem(product);
   ```

2. **User enters customer information**
   ```javascript
   setCustomer({ name, email, phone });
   ```

3. **User selects fulfillment option**
   ```javascript
   setFulfillmentType('pickup' | 'shipping' | 'delivery');
   ```

4. **Square Web Payment Form renders**
   ```javascript
   <SquareWebPaymentForm
     amountCents={total * 100}
     orderId={orderId}
     customer={customer}
     onPaymentSuccess={handleSuccess}
   />
   ```

5. **User enters card details** (handled by Square SDK)
   - Card number, expiry, CVV
   - Postal code (auto-validated)
   - All data stays secure with Square

6. **User clicks "Pay" button**
   - Square SDK tokenizes card details
   - Returns secure payment token (single-use)

7. **Frontend sends token to backend**
   ```javascript
   fetch('/api/payments', {
     method: 'POST',
     body: JSON.stringify({
       sourceId: paymentToken,
       amountCents: total * 100,
       ...
     })
   });
   ```

8. **Backend processes payment**
   - Calls Square Payments API
   - Creates payment with token
   - Returns success/failure

9. **User sees confirmation**
   - ✅ Success: Show order confirmation
   - ❌ Error: Show error message, allow retry

### Backend Flow:

1. **Receive payment token from frontend**
   ```typescript
   const { sourceId, amountCents, orderId } = await request.json();
   ```

2. **Call Square Payments API**
   ```typescript
   const response = await createPayment({
     sourceId,
     amount: amountCents,
     currency: 'USD',
     locationId: SQUARE_LOCATION_ID,
     idempotencyKey: randomUUID()
   });
   ```

3. **Store payment record**
   ```typescript
   await db.collection('payments').insertOne({
     squarePaymentId: payment.id,
     status: payment.status,
     ...
   });
   ```

4. **Update order status**
   ```typescript
   await db.collection('orders').updateOne(
     { id: orderId },
     { $set: { paymentStatus: 'COMPLETED' } }
   );
   ```

5. **Return result to frontend**
   ```typescript
   return NextResponse.json({
     success: true,
     payment: { ... }
   });
   ```

---

## Integration Example

**File**: `/app/app/order/page.js` (Update Step 4)

```javascript
// Add import at top
import SquareWebPaymentForm from '@/components/SquareWebPaymentForm';

// Replace the handleCheckout function with:
const handlePaymentSuccess = async (result) => {
  console.log('Payment successful:', result);
  
  // Clear cart
  clearCart();
  
  // Redirect to success page
  router.push(`/checkout/success?orderId=${orderId}&paymentId=${result.payment.id}`);
};

const handlePaymentError = (error) => {
  console.error('Payment failed:', error);
  toast.error('Payment failed. Please try again.');
};

// In the Step 4 section, replace Square checkout button with:
{step === 4 && (
  <div className="space-y-6">
    {/* Order Summary */}
    <div className="bg-gray-50 rounded-lg p-6">
      <h3 className="font-semibold mb-4">Order Summary</h3>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>${subtotal.toFixed(2)}</span>
        </div>
        {couponDiscount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Coupon Discount</span>
            <span>-${couponDiscount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-semibold text-lg pt-2 border-t">
          <span>Total</span>
          <span>${total.toFixed(2)}</span>
        </div>
      </div>
    </div>

    {/* Square Web Payment Form */}
    <SquareWebPaymentForm
      amountCents={Math.round(total * 100)}
      currency="USD"
      orderId={orderId}
      customer={customer}
      lineItems={cart}
      onPaymentSuccess={handlePaymentSuccess}
      onPaymentError={handlePaymentError}
    />
  </div>
)}
```

---

## Testing

### Test Card Numbers (Sandbox)

```
Successful Payment:
Card: 4111 1111 1111 1111
CVV: 111
Expiry: Any future date
ZIP: 94103

Card Declined:
Card: 4000 0000 0000 0002
CVV: 111
Expiry: Any future date

Insufficient Funds:
Card: 4000 0000 0000 9995
CVV: 111
Expiry: Any future date
```

### Production Testing

**IMPORTANT**: Use real cards for production testing, but:
- Test with small amounts ($0.01 - $1.00)
- Refund test payments immediately in Square Dashboard
- Never use customer credit cards for testing

---

## Troubleshooting

### Issue: "Payment form not loading"

**Symptoms:**
- Blank space where card form should be
- Console error: "Cannot read property 'Square' of undefined"

**Solutions:**
1. Check if Square SDK script loaded:
   ```javascript
   console.log('Square SDK:', window.Square);
   ```
2. Verify HTTPS (or localhost)
3. Check browser console for CSP errors
4. Add CSP headers if needed:
   ```
   script-src 'self' https://web.squarecdn.com https://js.squareup.com;
   ```

### Issue: "401 UNAUTHORIZED" from `/api/payments`

**Symptoms:**
- Payment token generated successfully
- Backend returns 401 error
- Error: "This request could not be authorized"

**Solutions:**
1. **Check OAuth permissions** (most common)
   - Go to Square Developer Dashboard
   - Verify `PAYMENTS_WRITE` is enabled
   - Regenerate access token
   - Update `.env` file
   - Restart application

2. **Verify environment variables**
   ```bash
   echo $SQUARE_ACCESS_TOKEN  # Should start with EAAA or sq0atp-
   echo $SQUARE_ENVIRONMENT   # Should be "production"
   ```

3. **Check token format**
   - Production: `EAAA...` or `sq0atp-...`
   - Sandbox: `sandbox-sq0atb-...`

### Issue: "Payment declined"

**Symptoms:**
- Card form works
- Payment submitted
- Returns "Card declined" error

**Possible Causes:**
1. **Testing with invalid card** - Use valid test cards (see above)
2. **Real card declined** - Try different card
3. **Fraud detection** - Contact Square support
4. **Incorrect amount** - Check amount is in cents (3500 = $35.00)

### Issue: Payment succeeds but order not created

**Symptoms:**
- Payment shows in Square Dashboard
- Order not in your database
- Customer didn't receive confirmation

**Solutions:**
1. Check database connection in `/api/payments/route.ts`
2. Verify `onPaymentSuccess` handler is called
3. Check for errors in server logs
4. Ensure order creation logic runs after payment

---

## Security Best Practices

### 1. Never Expose Access Token
```javascript
// ❌ BAD - Don't do this
const SQUARE_ACCESS_TOKEN = 'EAAA...'; // In frontend code

// ✅ GOOD - Server-side only
// In .env file (never committed to git)
SQUARE_ACCESS_TOKEN=EAAA...
```

### 2. Always Use Idempotency Keys
```javascript
// Prevents duplicate charges if user clicks twice
idempotencyKey: `${orderId}_${Date.now()}`
```

### 3. Validate Amounts Server-Side
```javascript
// ❌ BAD - Trusting client
const amount = request.body.amount; // Can be manipulated!

// ✅ GOOD - Server calculates
const amount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
```

### 4. Use HTTPS in Production
```
✅ https://yourdomain.com  
❌ http://yourdomain.com  
```

---

## Next Steps

1. **Enable Square OAuth Permissions** (see SQUARE_OAUTH_SETUP_COMPLETE_GUIDE.md)
2. **Test with Square test cards** (Sandbox environment)
3. **Integrate SquareWebPaymentForm into order page**
4. **Test complete checkout flow**
5. **Switch to production credentials**
6. **Test with real card (small amount)**
7. **Go live!**

---

## Support

- **Square Developer Docs**: https://developer.squareup.com/docs/web-payments/overview
- **Web Payments SDK Quickstart**: https://developer.squareup.com/docs/web-payments/quickstart
- **GitHub Examples**: https://github.com/square/web-payments-quickstart
- **Square Support**: https://developer.squareup.com/forums
