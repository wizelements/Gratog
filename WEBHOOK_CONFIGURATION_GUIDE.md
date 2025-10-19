# 🔔 Square Webhook Configuration Guide

## Current Status
✅ **Webhook Signature Key Configured:** `jdpVqg2RUVe7XnNt_GGS2Q`
✅ **Webhook Handler Ready:** `/app/app/api/webhooks/square/route.ts`
⚠️ **Needs Configuration:** Square Dashboard webhook subscription

---

## What Are Webhooks?

Webhooks allow Square to **notify your application in real-time** when events occur:
- 💰 Payment completed
- 📦 Order created/updated
- 📊 Inventory changed
- 📋 Catalog updated

Without webhooks, you'd have to constantly poll Square's API. With webhooks, Square pushes updates to you instantly.

---

## How to Configure Square Webhooks

### Step 1: Access Square Developer Dashboard
🔗 https://developer.squareup.com/apps

### Step 2: Select Your Application
- Find and click on your app: "Taste of Gratitude"
- Application ID: `sq0idp-V1fV-MwsU5lET4rvzHKnIw`

### Step 3: Navigate to Webhooks Section
- In the left sidebar, click **"Webhooks"**
- Or go to: **Credentials → Webhooks**

### Step 4: Add Webhook Endpoint

#### Production Webhook URL:
```
https://square-payments-2.preview.emergentagent.com/api/webhooks/square
```

**Steps:**
1. Click **"+ Add Endpoint"** or **"Create Webhook"**
2. Paste the URL above in the **"Endpoint URL"** field
3. Select **"Production"** environment (or Sandbox for testing)

### Step 5: Subscribe to Events

**Check these event subscriptions:**

#### Essential Events (Required):
- ☑️ `payment.created` - When a payment is created
- ☑️ `payment.updated` - When payment status changes
- ☑️ `order.created` - When an order is created
- ☑️ `order.updated` - When order status changes

#### Inventory Events (Recommended):
- ☑️ `inventory.count.updated` - When inventory levels change
- ☑️ `catalog.version.updated` - When catalog is modified

#### Optional but Useful:
- ☑️ `refund.created` - When refund is processed
- ☑️ `refund.updated` - When refund status changes
- ☑️ `customer.created` - When customer is created
- ☑️ `customer.updated` - When customer info changes

### Step 6: Verify Signature Key

Your webhook handler uses this key to verify requests are from Square:
```
Signature Key: jdpVqg2RUVe7XnNt_GGS2Q
```

**Important:**
- This key is already configured in your `.env` file ✅
- Square uses it to sign webhook requests
- Your app verifies the signature before processing

### Step 7: Save Configuration
- Click **"Save"** or **"Create"**
- Square will show the webhook as "Active"

### Step 8: Test Webhook (Optional but Recommended)

Square provides a test tool:
1. In the Webhooks section, find your endpoint
2. Click **"Test"** or **"Send Test Event"**
3. Select event type (e.g., `payment.created`)
4. Click **"Send"**
5. Check your webhook handler receives it

---

## Webhook Handler Details

### Endpoint
**URL:** `/api/webhooks/square`
**File:** `/app/app/api/webhooks/square/route.ts`

### Supported Events
Your webhook handler processes these events:

| Event | Action |
|-------|--------|
| `payment.created` | Log payment creation |
| `payment.updated` | Update payment status in database |
| `order.created` | Log order creation |
| `order.updated` | Update order status, notify customer |
| `inventory.count.updated` | Sync inventory levels |
| `catalog.version.updated` | Trigger catalog sync |
| `refund.created` | Process refund |

### Security Features
✅ **HMAC Signature Verification** - Validates requests are from Square
✅ **Webhook Signature Key** - Configured and secured
✅ **Request Validation** - Checks event structure
✅ **Error Handling** - Graceful failure management

---

## Testing Webhooks Locally

### Option 1: Square Dashboard Test Tool
1. Go to Webhooks section
2. Click "Test" on your endpoint
3. Select event type
4. View response in dashboard

### Option 2: Monitor Real Events
Once configured, real Square events will trigger webhooks:
```bash
# Watch webhook logs
tail -f /var/log/supervisor/nextjs.out.log | grep webhook
```

### Option 3: Use ngrok (For Local Development)
If testing on localhost:
```bash
# Install ngrok
npm install -g ngrok

# Expose local server
ngrok http 3000

# Use the ngrok URL in Square Dashboard
# Example: https://abc123.ngrok.io/api/webhooks/square
```

---

## Webhook Event Examples

### Payment Completed
```json
{
  "merchant_id": "YOUR_MERCHANT_ID",
  "type": "payment.updated",
  "event_id": "abc123",
  "created_at": "2024-01-01T12:00:00Z",
  "data": {
    "type": "payment",
    "id": "payment_id_123",
    "object": {
      "payment": {
        "id": "payment_id_123",
        "status": "COMPLETED",
        "amount_money": {
          "amount": 5000,
          "currency": "USD"
        }
      }
    }
  }
}
```

### Inventory Updated
```json
{
  "merchant_id": "YOUR_MERCHANT_ID",
  "type": "inventory.count.updated",
  "event_id": "xyz789",
  "created_at": "2024-01-01T12:00:00Z",
  "data": {
    "type": "inventory_count",
    "id": "count_id_456",
    "object": {
      "inventory_counts": [{
        "catalog_object_id": "ITEM_VARIATION_123",
        "quantity": "10",
        "state": "IN_STOCK"
      }]
    }
  }
}
```

---

## Troubleshooting

### Issue: Webhook Not Receiving Events
**Possible Causes:**
1. URL is incorrect or not accessible
2. Events not subscribed in dashboard
3. Firewall blocking Square's IP addresses

**Solution:**
```bash
# Test your webhook endpoint is accessible
curl https://square-payments-2.preview.emergentagent.com/api/webhooks/square

# Should return:
# {"status":"ok","message":"Square webhook endpoint is active"}
```

### Issue: Signature Verification Fails
**Possible Causes:**
1. Wrong signature key in .env
2. Request body modified before verification
3. Using incorrect verification algorithm

**Solution:**
- Verify `SQUARE_WEBHOOK_SIGNATURE_KEY` in `.env` matches dashboard
- Don't modify request body before verification
- Check `/app/app/api/webhooks/square/route.ts` signature logic

### Issue: Events Not Processing
**Check:**
```bash
# View webhook logs
tail -n 100 /var/log/supervisor/nextjs.out.log | grep -i webhook

# Check for errors
grep -i "webhook.*error" /var/log/supervisor/nextjs.out.log
```

---

## Webhook Best Practices

### 1. Idempotency
✅ Your handler tracks `event_id` to prevent duplicate processing

### 2. Quick Response
✅ Handler responds immediately, processes async

### 3. Error Handling
✅ Try-catch blocks for all event processors

### 4. Logging
✅ All events logged for debugging

### 5. Retry Logic
Square will retry failed webhooks:
- Immediately
- After 1 minute
- After 5 minutes
- After 30 minutes
- Up to 3 days

---

## What Happens After Configuration

Once webhooks are configured:

### Automatic Actions:
1. **Payment Completed**
   - Order status updated in database
   - Customer notified via email/SMS (if configured)
   - Inventory decremented

2. **Inventory Changed**
   - Local inventory synced
   - Low stock alerts triggered
   - Product availability updated

3. **Catalog Updated**
   - Automatic catalog sync triggered
   - Product data refreshed
   - Prices updated

4. **Order Updated**
   - Order tracking updated
   - Customer notifications sent
   - Admin dashboard refreshed

---

## Configuration Checklist

Before marking webhooks as complete:
- [ ] Webhook endpoint added in Square Dashboard
- [ ] Production environment selected
- [ ] All required events subscribed
- [ ] Signature key matches .env file
- [ ] Webhook tested with Square test tool
- [ ] Handler logs show successful processing
- [ ] No signature verification errors

---

## Quick Reference

**Webhook URL:**
```
https://square-payments-2.preview.emergentagent.com/api/webhooks/square
```

**Signature Key:**
```
jdpVqg2RUVe7XnNt_GGS2Q
```

**Handler File:**
```
/app/app/api/webhooks/square/route.ts
```

**Test Command:**
```bash
# Test endpoint is live
curl https://square-payments-2.preview.emergentagent.com/api/webhooks/square

# View webhook logs
tail -f /var/log/supervisor/nextjs.out.log | grep webhook
```

---

## Summary

✅ **Webhook handler is fully implemented and ready**
✅ **Signature key is configured**
⚠️ **Needs 5-minute setup in Square Dashboard**

Once configured, your application will receive real-time updates from Square, enabling features like:
- Instant payment confirmations
- Automatic inventory management
- Real-time order tracking
- Customer notifications

**Estimated setup time:** 5-10 minutes in Square Dashboard

🎉 **After this, your Square integration will be fully operational!**
