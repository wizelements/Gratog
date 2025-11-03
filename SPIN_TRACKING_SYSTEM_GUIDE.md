# Complete User Tracking & Spin System - Implementation Guide

## 🎯 Overview

Redesigned spin & win system with comprehensive user tracking. Spins are now:
- ✅ Awarded AFTER purchase completion (not before checkout)
- ✅ Stack indefinitely (users can accumulate multiple spins)
- ✅ Tracked in database with full history
- ✅ Available from Rewards page anytime
- ✅ Never expire (spins persist until used)

---

## 📊 User Tracking System

### Database Structure

**Collection: `user_profiles`**
```javascript
{
  id: "uuid",
  email: "user@example.com",
  name: "Customer Name",
  phone: "4045551234",
  
  // Order tracking
  totalOrders: 5,
  totalSpent: 247.50,
  orders: [
    {
      orderId: "ORDER-123",
      total: 47.00,
      status: "completed",
      date: "2025-01-18",
      spinsAwarded: 2  // Earned 2 spins from this order
    }
  ],
  
  // Spin tracking
  availableSpins: 3,      // Current unused spins
  spinsEarned: 8,         // Total earned all-time
  spinsUsed: 5,           // Total used all-time
  spinHistory: [
    {
      id: "uuid",
      action: "earned",    // or "used"
      spins: 2,
      reason: "purchase",
      orderId: "ORDER-123",
      timestamp: "2025-01-18"
    },
    {
      id: "uuid", 
      action: "used",
      prize: "$5 OFF",
      couponCode: "TOG123456",
      timestamp: "2025-01-19"
    }
  ],
  
  lastOrderDate: "2025-01-18",
  createdAt: "2024-12-01",
  updatedAt: "2025-01-18"
}
```

---

## 🎰 Spin Earning Rules

### Automatic Spin Awards

**First Order**:
- $15 - $19.99 = 1 spin
- $20 - $39.99 = 1 spin  
- $40+ = 2 spins (1 for first + 1 for $20 tier)

**Repeat Orders** (2nd order onwards):
- $20 - $39.99 = 1 spin
- $40 - $59.99 = 2 spins
- $60 - $79.99 = 3 spins
- $80 - $99.99 = 4 spins
- **Formula**: `Math.floor(total / 20)` spins

### Examples

| Order # | Amount | Spins Earned | Reason |
|---------|--------|--------------|--------|
| 1st | $18 | 1 spin | First order $15+ |
| 2nd | $25 | 1 spin | $20+ order |
| 3rd | $65 | 3 spins | $65 / $20 = 3 spins |
| 4th | $100 | 5 spins | $100 / $20 = 5 spins |
| **Total** | **$208** | **10 spins** | **Stacked!** |

---

## 🔄 Complete User Journey

### Purchase Flow
```
1. Customer shops and adds products to cart
   ↓
2. Completes checkout on Square
   ↓
3. Square redirects to /checkout/success
   ↓
4. Success page awards spins based on total:
   - Calls /api/tracking/user (action: track_order)
   - Awards spins: $15+ first OR every $20 repeat
   - Spins added to user_profiles.availableSpins
   ↓
5. User sees: "You earned 2 spins!" badge
   ↓
6. Modal appears automatically if spins available
   OR
7. User can save spins for later
```

### Using Spins Later
```
1. User visits /rewards page
   ↓
2. Goes to "My Rewards" tab
   ↓
3. Enters email to load profile
   ↓
4. Sees SpinTracker component showing:
   - Total earned: 10
   - Spins used: 3
   - Available: 7
   ↓
5. Clicks "Use Your Spins Now!" button
   ↓
6. Spin wheel modal opens
   ↓
7. User spins (can spin multiple times)
   ↓
8. Each spin:
   - Deducts 1 from availableSpins
   - Creates coupon code for next order
   - Records in spinHistory
   ↓
9. User receives discount codes for future use
```

---

## 🛠️ API Endpoints

### `/api/tracking/user`

**POST - Track Order & Award Spins**
```javascript
{
  action: "track_order",
  userEmail: "user@example.com",
  data: {
    orderId: "ORDER-123",
    total: 47.50,
    status: "completed",
    items: [...],
    fulfillmentType: "pickup_market"
  }
}

// Response:
{
  success: true,
  orderId: "ORDER-123",
  spinsEarned: 2,
  totalAvailableSpins: 5,
  message: "Order tracked! You earned 2 spins!"
}
```

**POST - Award Spins Manually**
```javascript
{
  action: "earn_spin",
  userEmail: "user@example.com",
  data: {
    spins: 1,
    reason: "bonus",
    orderId: "ORDER-123"
  }
}
```

**POST - Use a Spin**
```javascript
{
  action: "use_spin",
  userEmail: "user@example.com",
  data: {
    prize: "$5 OFF",
    couponCode: "TOG123456",
    prizeValue: 5.00
  }
}

// Response:
{
  success: true,
  remainingSpins: 4,
  prizeWon: "$5 OFF",
  couponCode: "TOG123456",
  message: "Spin used! You have 4 spins remaining"
}
```

**GET - Get User Stats**
```
/api/tracking/user?email=user@example.com

// Response:
{
  success: true,
  stats: {
    totalOrders: 5,
    totalSpent: 247.50,
    availableSpins: 3,
    spinsEarned: 8,
    spinsUsed: 5,
    orders: [...],
    spinHistory: [...],
    passport: {...},
    availableCoupons: 2,
    coupons: [...]
  }
}
```

---

## 📱 Component Integration

### Success Page (`/checkout/success`)
**Features**:
- ✅ Automatically awards spins based on purchase amount
- ✅ Shows "You earned X spins!" badge
- ✅ Displays total available spins
- ✅ Auto-opens spin wheel if user has spins
- ✅ Users can dismiss and spin later

**Spin Display**:
```
┌─────────────────────────────────────┐
│  🎁  3 Spins Available              │
│                                     │
│  You Have Spins to Use!             │
│  Spin now or save for later         │
│                                     │
│  [Use Your Spins Now]               │
│                                     │
│  Earned: 8 | Used: 5 | Available: 3│
└─────────────────────────────────────┘
```

### Rewards Page (`/rewards` → My Rewards Tab)
**SpinTracker Component**:
- ✅ Shows spin statistics (earned, used, available)
- ✅ "Use Your Spins Now!" button (animates if spins > 0)
- ✅ How to earn spins guide
- ✅ Recent spin history (last 5 spins)
- ✅ Opens spin wheel modal

**Display**:
```
┌─────────────────────────────────────┐
│  🎁 Spin & Win Tracker   [3 Spins] │
│                                     │
│  ┌──────┐  ┌──────┐  ┌──────┐     │
│  │  8   │  │  5   │  │  3   │     │
│  │Earned│  │ Used │  │Avail.│     │
│  └──────┘  └──────┘  └──────┘     │
│                                     │
│  [✨ Use Your Spins Now!]           │
│                                     │
│  How to Earn Spins:                │
│  • First order $15+ → +1 Spin      │
│  • Every $20 spent → +1 Spin       │
│  • Example: $60 order = 3 spins!   │
│                                     │
│  Recent Spins:                     │
│  ✅ Earned - 01/18/25              │
│  🎰 Used - Won: $5 OFF - 01/19/25  │
└─────────────────────────────────────┘
```

### Order Page (`/order` → Step 2)
**Changed**: No longer shows spin before checkout
**Now Shows**:
```
┌─────────────────────────────────────┐
│  🎁 Complete your order to earn     │
│     spins!                          │
│                                     │
│  $15+ first order = 1 spin          │
│  $20+ orders = 1 spin per $20       │
│  Spins stack and never expire!      │
└─────────────────────────────────────┘
```

---

## 🎮 Spin Wheel Prizes

**Segments** (unchanged):
- $2 OFF (25% probability)
- $1 OFF (30% probability)
- $3 OFF (5% probability)
- $5 OFF (15% probability)
- FREE SHIPPING (15% probability)
- TRY AGAIN (10% probability)

**Coupon Generation**:
- Each spin creates a unique coupon code (TOG + timestamp)
- 24-hour expiry from spin time
- Codes saved to `coupons` collection
- User can view all codes in Rewards page

---

## 📈 Tracking Benefits

### For Customers
- ✅ See total orders and spending
- ✅ Track available spins (transparent count)
- ✅ View spin history (when earned, when used, prizes won)
- ✅ Access coupons from all spins
- ✅ Know exactly how to earn more spins
- ✅ No pressure to spin immediately - can save

### For Business Owner
- ✅ Track customer purchase patterns
- ✅ See spin engagement rates (earned vs used)
- ✅ Identify high-value customers (total spent)
- ✅ Monitor coupon usage from spins
- ✅ Analytics: orders, revenue, spin conversion
- ✅ Retarget customers with unused spins

---

## 🔗 Integration Points

### When Order Completes on Square

**Option 1: Square Online Redirect**
```
Customer completes checkout on Square
  ↓
Square redirects to: /checkout/success?orderId=XXX&total=YYY
  ↓
Success page loads
  ↓
Calls /api/tracking/user (track_order)
  ↓
Spins awarded based on total
  ↓
User sees spin notification
```

**Option 2: Square POS Callback**
```
Payment completed on Square POS device
  ↓
Square sends callback to: /api/pos/callback
  ↓
Callback handler calls /api/tracking/user
  ↓
Order tracked, spins awarded
  ↓
Redirects to /checkout/success
  ↓
User sees spins earned
```

**Option 3: Manual Entry**
```
Admin marks order as complete
  ↓
Admin calls /api/tracking/user
  ↓
Spins awarded manually
  ↓
Customer notified via email
```

---

## 🧪 Testing Scenarios

### Test 1: First Order $18 (Should Get 1 Spin)
```bash
curl -X POST https://cart-rescue-1.preview.emergentagent.com/api/tracking/user \
  -H "Content-Type: application/json" \
  -d '{
    "action": "track_order",
    "userEmail": "newuser@example.com",
    "data": {
      "orderId": "ORDER-001",
      "total": 18,
      "status": "completed"
    }
  }'

# Expected: spinsEarned: 1, totalAvailableSpins: 1
```

### Test 2: Repeat Order $65 (Should Get 3 Spins)
```bash
curl -X POST https://cart-rescue-1.preview.emergentagent.com/api/tracking/user \
  -H "Content-Type: application/json" \
  -d '{
    "action": "track_order",
    "userEmail": "existinguser@example.com",
    "data": {
      "orderId": "ORDER-002",
      "total": 65,
      "status": "completed"
    }
  }'

# Expected: spinsEarned: 3, totalAvailableSpins: 3 (or more if had previous)
```

### Test 3: Use a Spin
```bash
curl -X POST https://cart-rescue-1.preview.emergentagent.com/api/tracking/user \
  -H "Content-Type: application/json" \
  -d '{
    "action": "use_spin",
    "userEmail": "user@example.com",
    "data": {
      "prize": "$5 OFF",
      "couponCode": "TOG123456",
      "prizeValue": 5.00
    }
  }'

# Expected: remainingSpins: (availableSpins - 1)
```

### Test 4: Get User Stats
```bash
curl "https://cart-rescue-1.preview.emergentagent.com/api/tracking/user?email=user@example.com"

# Expected: Full user statistics with orders, spins, coupons
```

---

## 🎨 UI/UX Flow

### Scenario 1: New Customer First Purchase ($25)
```
1. Customer completes $25 order on Square
2. Redirected to success page
3. Sees: "✅ Order Confirmed!"
4. Badge appears: "You earned 1 spin!"
5. Card shows: "You Have Spins to Use!"
6. Can click "Use Your Spins Now" or dismiss
7. If spins, opens wheel → wins prize → gets coupon code
8. Coupon saved for next order
```

### Scenario 2: Repeat Customer $75 Order
```
1. Customer completes $75 order
2. Success page shows: "You earned 3 spins!" (75/20 = 3.75 → 3 spins)
3. Available spins badge: "3 Spins Available"
4. Customer can:
   - Use all 3 spins immediately
   - Use 1 spin, save 2 for later
   - Save all 3 for later
5. Each spin creates a separate coupon code
```

### Scenario 3: Customer with Stacked Spins
```
1. Customer earned spins from 3 previous orders
2. Never used them → has 7 available spins
3. Visits /rewards page
4. My Rewards tab shows:
   - Total Earned: 7
   - Spins Used: 0
   - Available: 7
5. Clicks "Use Your Spins Now!"
6. Can spin 7 times → gets 7 coupon codes
7. All codes available in "Available Coupons" section
```

---

## 💾 Data Persistence

### LocalStorage (Frontend Cache)
- ✅ Cart items
- ✅ Customer info
- ✅ Pending order (before Square redirect)
- ✅ Spin history (last 100 spins for rate limiting)

### MongoDB (Permanent Storage)
- ✅ User profiles with full tracking
- ✅ All orders (pending, completed, failed)
- ✅ Spin history (all-time)
- ✅ Coupon codes generated from spins
- ✅ Passport data
- ✅ Reward points

---

## 🔔 Notifications

### After Purchase
**Email Template** (to implement with Resend):
```
Subject: Your Taste of Gratitude Order + Spin Rewards! 🎰

Hi [Name],

Thank you for your $XX order! Your order [ORDER-ID] is confirmed.

🎉 You earned X spins!
Visit: https://cart-rescue-1.preview.emergentagent.com/rewards
Use your spins to win discount codes for your next orders.

Your available spins: X
Spins never expire - use them anytime!

[View My Rewards]

---
Taste of Gratitude
```

**SMS Template** (to implement with Twilio):
```
Thanks for your order! 🎉 
You earned 2 spins! 
Visit [link] to spin & win discounts.
Spins stack - use anytime!
-Taste of Gratitude
```

---

## 📊 Admin Dashboard Integration

### Order Tracking View
```
┌─────────────────────────────────────────────────────────┐
│ Recent Orders                                           │
├─────────┬──────────┬────────┬──────────┬───────────────┤
│ Order   │ Customer │ Total  │ Status   │ Spins Awarded │
├─────────┼──────────┼────────┼──────────┼───────────────┤
│ ORD-123 │ john@... │ $47.00 │ Paid     │ 2 spins       │
│ ORD-124 │ sara@... │ $18.00 │ Paid     │ 1 spin        │
│ ORD-125 │ mike@... │ $65.00 │ Pending  │ 0 (pending)   │
└─────────┴──────────┴────────┴──────────┴───────────────┘
```

### Customer Profile View
```
Customer: john@example.com
Total Orders: 5
Total Spent: $247.50
Available Spins: 3
Spins Earned: 8
Spins Used: 5

Recent Activity:
- Jan 18: Earned 2 spins ($47 order)
- Jan 19: Used 1 spin → Won $5 OFF (coupon: TOG123)
- Jan 20: Used 1 spin → Won FREE SHIPPING
```

---

## 🚀 Deployment Checklist

**Backend**:
- ✅ `/api/tracking/user` endpoint created
- ✅ `/api/pos/callback` updated with tracking
- ✅ `/checkout/success` page awards spins
- ✅ Database indexes created for user_profiles

**Frontend**:
- ✅ SpinTracker component created
- ✅ Integrated in /rewards page
- ✅ Success page shows spin earnings
- ✅ Order page info banner (earn spins after purchase)
- ✅ Removed pre-checkout spin (moved post-purchase)

**Database**:
- ✅ user_profiles collection schema
- ✅ Orders linked to user profiles
- ✅ Spin history tracked
- ✅ Coupon codes linked to spins

---

## 🎯 Key Benefits

**Stacking System**:
- Users can accumulate 10+ spins from large orders
- No pressure to use immediately
- Spins never expire
- Encourages repeat purchases

**Full Tracking**:
- Complete audit trail of all spins
- Know exactly when/how spins were earned
- Track prize distribution
- Analyze spin redemption rates

**User Engagement**:
- Visible spin count creates excitement
- "Use Your Spins!" CTA drives return visits
- Multiple coupons = multiple future purchases
- Gamification encourages larger orders

---

**Implementation Status**: ✅ COMPLETE
**Testing Status**: Ready for user testing
**Production Ready**: Yes (with backend API testing)
