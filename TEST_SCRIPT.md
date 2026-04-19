# Gratog Queue System — Manual Test Script

**Run these tests after `npm install` completes**

---

## Test 1: Model Import

```bash
cd ~/Gratog-live
node -e "require('./lib/models/QueuePosition.js')" && echo "✓ Model loads"
```

Expected: No errors

---

## Test 2: API Route Structure

```bash
cd ~/Gratog-live
ls -la app/api/queue/*/
```

Expected:
```
app/api/queue/active/route.js
app/api/queue/join/route.js
app/api/queue/position/[id]/route.js
app/api/queue/update/route.js
```

---

## Test 3: Page Routes Exist

```bash
cd ~/Gratog-live
ls -la app/order/\[id\]/queue/page.js
ls -la app/admin/queue/page.js
```

Expected: Both files exist

---

## Test 4: Integration Helper

```bash
cd ~/Gratog-live
node -e "require('./lib/queue-integration.js')" && echo "✓ Helper loads"
```

Expected: No errors

---

## Test 5: Full Build (when ready)

```bash
cd ~/Gratog-live
npm run build
```

Expected: Build completes with no errors

---

## Manual End-to-End Test (after build)

### Step 1: Start dev server
```bash
cd ~/Gratog-live
npm run dev
```

### Step 2: Test API with curl

**Create queue entry:**
```bash
curl -X POST http://localhost:3000/api/queue/join \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "test_123",
    "orderRef": "TEST-001",
    "marketId": "test_market",
    "marketName": "Test Market",
    "customerInfo": {"name": "Test User"},
    "items": [{"name": "Thai Milk Tea", "quantity": 1}]
  }'
```

**Get position:**
```bash
curl http://localhost:3000/api/queue/position/test_123
```

**Get active queue:**
```bash
curl "http://localhost:3000/api/queue/active?marketId=test_market"
```

**Update status:**
```bash
curl -X POST http://localhost:3000/api/queue/update \
  -H "Content-Type: application/json" \
  -d '{"orderId": "test_123", "status": "making"}'
```

### Step 3: Open in browser

**Customer view:**
```
http://localhost:3000/order/test_123/queue
```

**Staff dashboard:**
```
http://localhost:3000/admin/queue?marketId=test_market
```

---

## Expected Results

| Test | Expected Result |
|------|-----------------|
| API join | Returns position 1, status "queued" |
| API position | Returns ahead: 0, status "queued" |
| API active | Returns queue with 1 order in queued |
| API update | Returns success: true, status updated |
| Customer page | Shows position #1, "You're next!" |
| Staff dashboard | Shows order in QUEUED column |
| Staff START | Moves order to MAKING column |
| Staff DONE | Moves order to READY column |

---

## Troubleshooting

### Build fails
- Check `npm install` completed
- Try `rm -rf node_modules && npm install`
- Check Node.js version: `node --version` (need 18+)

### API returns 404
- Check file path matches `app/api/queue/...`
- Ensure dev server is running

### Database errors
- Check MongoDB connection
- Verify `MONGODB_URI` in environment

### Pages blank
- Check browser console for errors
- Verify all imports resolve

---

## Post-Test Cleanup

Remove test data from MongoDB:
```javascript
db.queuepositions.deleteMany({ marketId: "test_market" })
```

---

**Run these tests before market tomorrow to verify everything works.**
