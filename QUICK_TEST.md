# Quick Test - Gratog Queue System
# Testing with Silver Watkins data

## Start dev server:
```bash
cd ~/Gratog-live
node ./node_modules/next/dist/bin/next dev &
```

## Test 1: Add order to queue
```bash
curl -X POST http://localhost:3000/api/queue/join \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "order_sw_001",
    "orderRef": "SW-042",
    "marketId": "ponce_city_market",
    "marketName": "Ponce City Market",
    "customerInfo": {
      "name": "Silver Watkins",
      "phone": "4047899960",
      "email": "silverwatkins@gmail.com"
    },
    "items": [
      {"name": "Thai Milk Tea", "quantity": 1, "customizations": {"sweetness": "50%"}},
      {"name": "Tiger Milk Tea", "quantity": 1, "customizations": {"boba": "extra"}}
    ]
  }'
```

Expected response:
```json
{
  "success": true,
  "position": 1,
  "status": "queued",
  "orderRef": "SW-042",
  "estimatedWaitMinutes": 2
}
```

## Test 2: Check position
```bash
curl http://localhost:3000/api/queue/position/order_sw_001
```

Expected:
```json
{
  "success": true,
  "position": 1,
  "ahead": 0,
  "totalInQueue": 1,
  "status": "queued",
  "orderRef": "SW-042",
  "marketName": "Ponce City Market",
  "estimatedMinutes": 0,
  "makingNow": []
}
```

## Test 3: Staff dashboard view
```bash
curl "http://localhost:3000/api/queue/active?marketId=ponce_city_market"
```

Expected:
```json
{
  "success": true,
  "marketId": "ponce_city_market",
  "queue": {
    "queued": [{...}],
    "making": [],
    "ready": []
  },
  "stats": {
    "total": 1,
    "queued": 1,
    "making": 0,
    "ready": 0
  }
}
```

## Test 4: Staff marks as making
```bash
curl -X POST http://localhost:3000/api/queue/update \
  -H "Content-Type: application/json" \
  -d '{"orderId": "order_sw_001", "status": "making"}'
```

## Test 5: Staff marks as ready (vibrates customer phone)
```bash
curl -X POST http://localhost:3000/api/queue/update \
  -H "Content-Type: application/json" \
  -d '{"orderId": "order_sw_001", "status": "ready"}'
```

## Browser Tests:

**Customer view:**
```
http://localhost:3000/order/order_sw_001/queue
```
Should show:
- Order #SW-042
- Position: 0 (or "You're next!")
- Status: Ready!
- Vibration when status changes

**Staff dashboard:**
```
http://localhost:3000/admin/queue?marketId=ponce_city_market
```
Should show:
- Stats cards
- QUEUED | MAKING | READY columns
- Order card with items
- START/DONE buttons

## Cleanup test data:
```javascript
// In MongoDB shell or Compass
db.queuepositions.deleteMany({ marketId: "ponce_city_market" })
```

## Production URLs (after deploy):
- Customer: `https://tasteofgratitude.shop/order/{id}/queue`
- Staff: `https://tasteofgratitude.shop/admin/queue?marketId={marketId}`
