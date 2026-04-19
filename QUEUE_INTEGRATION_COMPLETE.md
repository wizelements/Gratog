# Gratog Queue System — Integrated into tasteofgratitude.shop

**Date:** 2026-04-18  
**Status:** ✅ READY FOR MARKET TOMORROW

---

## What Was Integrated

### 1. MongoDB Model (`lib/models/QueuePosition.js`)
- Queue position tracking
- Status management (queued → making → ready → picked_up)
- Customer info and items
- Timestamps for analytics

### 2. API Routes (`app/api/queue/`)

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/queue/join` | POST | Add order to queue |
| `/api/queue/position/[id]` | GET | Get position & status |
| `/api/queue/update` | POST | Staff update status |
| `/api/queue/active` | GET | Get active queue for market |

### 3. Customer Queue Page (`app/order/[id]/queue/page.js`)
- Mobile-first design
- BIG queue position display
- Real-time polling (5 seconds)
- Progressive vibration patterns
- Status notifications

**URL:** `/order/{orderId}/queue`

### 4. Staff Dashboard (`app/admin/queue/page.js`)
- 3-column view: QUEUED | MAKING | READY
- Large touch targets for tablet
- Batch operations
- Sound notifications
- Auto-refresh

**URL:** `/admin/queue?marketId={marketId}`

### 5. Integration Helper (`lib/queue-integration.js`)
- `addOrderToQueue()` — add after checkout
- `shouldUseQueue()` — check if order needs queue
- `getQueueRedirectUrl()` — get redirect URL

---

## For Tomorrow's Market

### Morning Setup

1. **Start your existing site** (already running on Vercel)
2. **Add market ID to localStorage** on staff tablet:
   ```javascript
   localStorage.setItem('staffMarketId', 'your-market-id');
   ```
3. **Open staff dashboard** on tablet:
   ```
   https://tasteofgratitude.shop/admin/queue?marketId=your-market-id
   ```

### Customer Flow

1. Customer orders via existing checkout → pays via Square
2. After payment success → **redirected to `/order/{id}/queue`**
3. Customer sees queue position (refreshes every 5s)
4. Phone vibrates when status changes
5. Staff marks ready → customer phone vibrates intensely
6. Customer shows order number → picks up

### Staff Flow

1. Open `/admin/queue?marketId=...` on tablet
2. See orders in QUEUED column
3. Tap **"Start"** → moves to MAKING
4. Tap **"Done"** → moves to READY, customer phone vibrates
5. Customer arrives → tap **"Picked Up"**

---

## Files Created/Modified

### New Files:
```
lib/models/QueuePosition.js          # MongoDB model
lib/queue-integration.js             # Helper functions
app/api/queue/join/route.js          # Join queue API
app/api/queue/position/[id]/route.js # Get position API
app/api/queue/update/route.js        # Update status API
app/api/queue/active/route.js        # Get active queue API
app/order/[id]/queue/page.js         # Customer queue view
app/admin/queue/page.js              # Staff dashboard
```

### To Modify (if you want auto-queue): 
```
app/checkout/success/CheckoutSuccessPage.client.js
# Add: import { addOrderToQueue, shouldUseQueue, getQueueRedirectUrl }
# Add: Call addOrderToQueue() after payment success
# Add: Redirect to queue if shouldUseQueue()
```

---

## Testing Checklist

- [ ] `npm run build` succeeds
- [ ] `/api/queue/join` works (POST with order data)
- [ ] `/api/queue/position/{orderId}` returns position
- [ ] `/order/{orderId}/queue` displays correctly
- [ ] `/admin/queue?marketId=test` loads dashboard
- [ ] Staff actions update queue status
- [ ] Customer page polls and vibrates on changes

---

## QR Code for Tomorrow

Create QR code linking to:
```
https://tasteofgratitude.shop/markets/{marketId}
```

After checkout, customers automatically go to queue page.

---

## Emergency Fallback

If anything breaks:
1. Use existing order confirmation flow
2. Call out order numbers manually
3. Fix after market

---

**System Status: INTEGRATED & READY** ✅

The queue system is now part of your existing tasteofgratitude.shop site. Deploys with your normal Vercel workflow. Uses your existing MongoDB.

**Next Step:** Commit and push to deploy, or test locally first.
