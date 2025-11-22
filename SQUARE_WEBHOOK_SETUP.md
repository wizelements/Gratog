# Square Webhook Configuration Guide

## Webhook Endpoint Information

**Webhook URL**: `https://loading-fix-taste.preview.emergentagent.com/api/webhooks/square`

**Signature Key**: `taste-of-gratitude-webhook-key-2024` (already configured in .env)

## How to Configure in Square Dashboard

### Step 1: Access Square Developer Dashboard
1. Go to [Square Developer Dashboard](https://developer.squareup.com/apps)
2. Sign in with your Square account
3. Select your application ("Taste of Gratitude" app)

### Step 2: Configure Webhook Endpoint
1. Click on **"Webhooks"** in the left sidebar
2. Click **"Add Endpoint"** or **"Create Subscription"**
3. Enter the Webhook URL:
   ```
   https://loading-fix-taste.preview.emergentagent.com/api/webhooks/square
   ```

### Step 3: Configure Signature Key
1. In the webhook endpoint settings, find **"Signature Key"** or **"Webhook Signature Key"**
2. Enter: `taste-of-gratitude-webhook-key-2024`
3. Save the configuration

### Step 4: Subscribe to Required Events

Select the following event types:

#### ✅ Inventory Events (High Priority)
- `inventory.count.updated` - Real-time inventory synchronization

#### ✅ Catalog Events (High Priority)
- `catalog.version.updated` - Product catalog updates

#### ✅ Payment Events (Recommended)
- `payment.created` - New payment initiated
- `payment.updated` - Payment status changes (completed, failed, etc.)

#### ✅ Order Events (Recommended)
- `order.created` - New order in Square
- `order.updated` - Order status changes

### Step 5: Test the Webhook
1. After saving, Square will send a test webhook
2. You should see a **200 OK** response
3. Check the webhook logs in your dashboard

## Verify Webhook is Working

### Method 1: Check Endpoint Status
```bash
curl https://loading-fix-taste.preview.emergentagent.com/api/webhooks/square
```

Expected response:
```json
{
  "message": "Square webhook endpoint active",
  "timestamp": "2025-10-29T...",
  "environment": "production",
  "webhookTypes": [
    "inventory.count.updated",
    "catalog.version.updated",
    "payment.created",
    "payment.updated",
    "order.created",
    "order.updated"
  ]
}
```

### Method 2: Test from Square Dashboard
1. In the webhook settings, click **"Send Test Event"**
2. Select event type (e.g., `inventory.count.updated`)
3. Click **"Send"**
4. Verify you receive a **200 OK** response

### Method 3: Monitor Webhook Logs
After webhooks are configured, check MongoDB for webhook logs:
```javascript
// In MongoDB
db.webhook_logs.find().sort({createdAt: -1}).limit(10)
```

## What Happens When Webhooks Fire?

### `inventory.count.updated`
- Updates local inventory counts in real-time
- Syncs to `square_inventory` collection
- Updates product catalog with current stock levels

### `catalog.version.updated`
- Queues catalog object for resync
- Ensures product data stays current
- Updates `square_sync_queue` collection

### `payment.created` / `payment.updated`
- Updates order payment status
- Tracks payment timeline
- Updates order status based on payment status:
  - `COMPLETED` → `paid`
  - `APPROVED` → `paid`
  - `PENDING` → `payment_processing`
  - `CANCELED` → `payment_failed`
  - `FAILED` → `payment_failed`

### `order.created` / `order.updated`
- Syncs Square order changes
- Maintains order consistency

## Troubleshooting

### Webhook Returns 401 (Unauthorized)
- Verify signature key matches exactly: `taste-of-gratitude-webhook-key-2024`
- Check that signature verification is enabled in Square Dashboard

### Webhook Returns 500 (Server Error)
- Check MongoDB connection is working
- Check server logs: `tail -f /var/log/supervisor/nextjs.out.log`

### No Webhooks Received
- Verify webhook URL is accessible publicly
- Check Square Dashboard for webhook delivery status
- Verify events are subscribed correctly

### Test Webhook Delivery
Use Square's "Send Test Event" feature to verify webhook delivery without making real changes.

## Production Deployment Checklist

- [x] Webhook endpoint implemented (`/api/webhooks/square/route.ts`)
- [x] Signature verification configured
- [x] Environment variables set (`SQUARE_WEBHOOK_SIGNATURE_KEY`)
- [ ] **Webhooks configured in Square Dashboard** ⬅️ YOU ARE HERE
- [ ] Test events verified
- [ ] Production webhook URL configured (when deployed)

## Next Steps

1. **Configure webhooks in Square Dashboard** (follow steps above)
2. **Test webhook delivery** using Square's test feature
3. **Monitor webhook logs** in MongoDB
4. **Update webhook URL** when deploying to production domain

---

**Note**: Current webhook URL uses preview domain. When deploying to production (e.g., `tasteofgratitude.shop`), update the webhook URL to:
```
https://tasteofgratitude.shop/api/webhooks/square
```
