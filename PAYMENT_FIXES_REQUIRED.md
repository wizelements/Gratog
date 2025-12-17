# 🔧 PAYMENT FLOW FIXES REQUIRED

**Priority**: CRITICAL  
**Status**: 1 of 3 bugs FIXED, 2 remaining  

---

## ✅ FIX #1: TAX RATE INCONSISTENCY - COMPLETED

**File**: `/workspaces/Gratog/app/api/cart/price/route.ts`  
**Line**: 78  
**Status**: ✅ FIXED

### What Was Fixed:
```diff
- const taxRate = 0.07;  // ❌ 7% (WRONG)
+ const taxRate = 0.08;  // ✅ 8% (CORRECT)
```

### Verification:
Tax rate now consistent across system:
- ✅ `/app/api/cart/price/route.ts`: 8%
- ✅ `/adapters/totalsAdapter.ts`: 8%
- ✅ `/lib/pricing.ts`: 8%
- ✅ `/lib/enhanced-products.js`: 8%

**Impact**: Pricing calculations now accurate across cart and checkout

---

## 🔴 FIX #2: DELIVERY FEE PARAMETER BUG - NEEDS FIXING

**File**: `/workspaces/Gratog/app/api/orders/create/route.js`  
**Lines**: 98-104  
**Priority**: CRITICAL  
**Status**: ⚠️ NEEDS FIX

### The Bug:
```javascript
// Current (WRONG):
let deliveryFee = 0;
if (orderData.fulfillmentType === 'delivery') {
  const subtotal = orderData.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  deliveryFee = calculateDeliveryFee(subtotal);  // ❌ WRONG! Passes subtotal, not distance
  logger.debug('Delivery fee calculated', { subtotal, deliveryFee });
}
```

### The Problem:
- `calculateDeliveryFee()` function signature: `calculateDeliveryFee(distance, subtotal)`
- Current call: `calculateDeliveryFee(subtotal)` - passes dollars as miles!
- Example: `calculateDeliveryFee(76.00)` interprets $76 as 76 miles!

### How to Fix:

#### Step 1: Add distance calculation function
Create `/workspaces/Gratog/lib/distance-calculator.ts`:

```typescript
/**
 * Calculate distance between two coordinates (Haversine formula)
 * @param lat1 Restaurant latitude
 * @param lon1 Restaurant longitude
 * @param lat2 Customer latitude
 * @param lon2 Customer longitude
 * @returns Distance in miles
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Get restaurant coordinates
 */
export function getRestaurantCoordinates() {
  return {
    lat: 33.8121,  // Serenbe, GA
    lng: -84.7003
  };
}

/**
 * Geocode address to coordinates
 * Use Google Maps API or similar
 */
export async function geocodeAddress(address: {
  street: string;
  city: string;
  state: string;
  zip: string;
}): Promise<{ lat: number; lng: number }> {
  // Implementation would use Google Maps Geocoding API
  // For now, return mock coordinates
  return {
    lat: 33.8150,
    lng: -84.7100
  };
}
```

#### Step 2: Update order creation
```javascript
// In /app/api/orders/create/route.js

import { calculateDistance, getRestaurantCoordinates, geocodeAddress } from '@/lib/distance-calculator';

// Around line 98-104, replace:
let deliveryFee = 0;
if (orderData.fulfillmentType === 'delivery') {
  const subtotal = orderData.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  try {
    // Calculate actual distance
    const restaurantCoords = getRestaurantCoordinates();
    const customerCoords = await geocodeAddress(orderData.deliveryAddress);
    
    const distance = calculateDistance(
      restaurantCoords.lat,
      restaurantCoords.lng,
      customerCoords.lat,
      customerCoords.lng
    );
    
    // Now pass distance (not subtotal)
    const feeResult = calculateDeliveryFee(distance, subtotal);
    deliveryFee = feeResult.fee;
    
    logger.debug('Delivery fee calculated', { 
      distance: Math.round(distance * 10) / 10,
      subtotal, 
      deliveryFee,
      message: feeResult.message 
    });
  } catch (distanceError) {
    logger.warn('Distance calculation failed, using flat fee', { error: distanceError });
    // Fallback to flat fee
    deliveryFee = 6.99;
  }
}
```

### Verification:
After fix, delivery fees should be calculated correctly:
- `calculateDeliveryFee(3.5, 50)` → $0.00 (0-5 miles)
- `calculateDeliveryFee(12, 50)` → $7.99 (10-15 miles)
- `calculateDeliveryFee(15, 100)` → $0.00 (free for $100+)

---

## 🔴 FIX #3: MISSING PAYMENT AMOUNT VALIDATION - NEEDS FIXING

**File**: `/workspaces/Gratog/app/api/payments/route.ts`  
**Lines**: 14-60  
**Priority**: HIGH  
**Status**: ⚠️ NEEDS FIX

### The Bug:
```typescript
// Current (INSECURE):
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { 
    sourceId,
    amountCents,     // ❌ Received from CLIENT, not verified!
    orderId,
    // ...
  } = body;
  
  // Payment processed with unverified amount
  const response = await createPayment({
    amount: amountCents,  // ❌ Could be wrong!
    // ...
  });
}
```

### The Problem:
Client could manipulate `amountCents` before sending to payment API:
- Order total: $100 (10,000 cents)
- Customer modifies to: 5,000 cents ($50)
- Payment processes at wrong amount

### How to Fix:

```typescript
// In /app/api/payments/route.ts

import { connectToDatabase } from '@/lib/db-optimized';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      sourceId,
      amountCents,
      orderId,
      squareOrderId,
      customer,
      // ...
    } = body;
    
    // ✅ STEP 0: Validate order amount (MUST COME BEFORE PAYMENT)
    if (orderId) {
      try {
        const { db } = await connectToDatabase();
        const order = await db.collection('orders').findOne({ id: orderId });
        
        if (!order) {
          return NextResponse.json(
            { error: 'Order not found' },
            { status: 404 }
          );
        }
        
        // Verify amount matches order total
        const expectedAmountCents = Math.round((order.pricing?.total || 0) * 100);
        
        if (amountCents !== expectedAmountCents) {
          console.error('SECURITY: Amount mismatch detected', {
            orderAmount: expectedAmountCents,
            receivedAmount: amountCents,
            difference: amountCents - expectedAmountCents,
            orderId
          });
          
          return NextResponse.json(
            { 
              error: 'Payment amount does not match order total',
              details: 'Please refresh the page and try again'
            },
            { status: 400 }
          );
        }
        
        console.log('✅ Payment amount verified', { 
          orderId, 
          expectedAmount: expectedAmountCents,
          receivedAmount: amountCents 
        });
      } catch (verificationError) {
        console.error('Payment verification error:', verificationError);
        return NextResponse.json(
          { error: 'Unable to verify payment amount' },
          { status: 500 }
        );
      }
    }
    
    // Rest of payment processing...
    // STEP 1: Create Square Customer
    // STEP 2: Process payment
    // etc.
  } catch (error) {
    // error handling...
  }
}
```

### Verification Checklist:
- [x] Amount received from client
- [x] Fetch order from database
- [x] Compare amounts
- [x] Reject if mismatch
- [x] Log security event
- [x] Return clear error to user

---

## Testing After Fixes

### Test 1: Pricing Accuracy
```bash
# Run pricing test
python3 test_payment_bugs_voracious.py

# Verify: All pricing calculations should show 8% tax
```

### Test 2: Delivery Fees
```javascript
// Test in browser console:
// Verify delivery fee for different distances:
// 3 miles → $0 ✓
// 12 miles → $7.99 ✓
// 15 miles, $100 order → $0 ✓
```

### Test 3: Payment Security
```javascript
// Try to modify amount in browser:
// 1. Create order for $100
// 2. Open network tab
// 3. Intercept payment API call
// 4. Change amountCents to 5000
// 5. Should be REJECTED ✓
```

### Test 4: Full Payment Flow
```bash
# Run complete test
python3 test_full_payment_flow_production.py

# All steps should complete successfully
```

---

## Files Modified

### Already Fixed:
- ✅ `/workspaces/Gratog/app/api/cart/price/route.ts` (Tax rate: 7% → 8%)

### Need Fixes:
- [ ] `/workspaces/Gratog/app/api/orders/create/route.js` (Delivery fee parameter)
- [ ] `/workspaces/Gratog/app/api/payments/route.ts` (Amount validation)
- [ ] `/workspaces/Gratog/lib/distance-calculator.ts` (NEW - create this file)

---

## Deployment Checklist

- [x] Tax rate fix applied
- [ ] Distance calculator implemented
- [ ] Delivery fee call updated
- [ ] Payment amount validation added
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Deployed to staging
- [ ] Manual QA testing completed
- [ ] Deployed to production

---

## Rollback Plan

If issues occur after deployment:

1. **Tax rate issue**: Revert cart pricing (0.08 → 0.07)
   - Quick revert: Change single line
   - No data cleanup needed

2. **Delivery fee issue**: Comment out distance calculation
   ```javascript
   // Use flat fee temporarily
   deliveryFee = 6.99;
   ```

3. **Payment validation**: Disable amount check temporarily
   ```javascript
   // Skip verification
   // if (amountCents !== expectedAmountCents) { ... }
   ```

---

## Success Criteria

All of the following must be true:
- ✅ Pricing calculations accurate (8% tax)
- ✅ Delivery fees calculated based on distance
- ✅ Payment amounts verified server-side
- ✅ No price discrepancies reported
- ✅ All tests pass
- ✅ Customer confirmations show correct amounts
- ✅ Database records have accurate totals

---

**Status**: Ready for implementation  
**Estimated Fix Time**: 2-3 hours  
**Testing Time**: 1-2 hours  
**Total**: 3-5 hours to completion  

