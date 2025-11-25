# Square Webhook Configuration Guide

## 🎯 Overview
This guide provides step-by-step instructions for configuring Square webhooks in the Square Developer Dashboard to enable real-time synchronization of inventory, catalog, payments, and orders.

## ✅ Prerequisites
- Square Developer Account with access to Developer Dashboard
- Application ID: `sq0idp-V1fV-MwsU5lET4rvzHKnIw`
- Location ID: `L66TVG6867BG9`
- Webhook endpoint deployed and accessible

## 📡 Webhook Endpoint Information

**Webhook URL:**
```
https://gratitude-platform.preview.emergentagent.com/api/webhooks/square
```

**Webhook Signature Key (from .env):**
```
taste-of-gratitude-webhook-key-2024
```

**Environment:**
- Production

**Supported Event Types:**
- `inventory.count.updated` - Real-time inventory updates
- `catalog.version.updated` - Catalog changes (items, prices, categories)
- `payment.created` - New payment initiated
- `payment.updated` - Payment status changes
- `order.created` - New order created
- `order.updated` - Order status changes

## 🔧 Configuration Steps

### Step 1: Access Square Developer Dashboard
1. Go to https://developer.squareup.com/
2. Sign in with your Square account
3. Navigate to your application: **Taste Of Gratitude**

### Step 2: Navigate to Webhooks Section
1. In the left sidebar, click **Webhooks**
2. Click **+ Add Webhook**

### Step 3: Configure Webhook Endpoint
1. **Webhook URL**: Enter `https://gratitude-platform.preview.emergentagent.com/api/webhooks/square`
2. **Webhook Name**: Enter `Taste of Gratitude Production Webhooks`
3. **Environment**: Select **Production**

### Step 4: Select Event Types

#### Inventory Events (High Priority)
- ✅ `inventory.count.updated` - Updates local inventory cache when Square inventory changes

#### Catalog Events (High Priority)
- ✅ `catalog.version.updated` - Triggers catalog resync when items, prices, or categories change

#### Payment Events (Medium Priority)
- ✅ `payment.created` - Logs payment initiation
- ✅ `payment.updated` - Updates order status when payment completes/fails

#### Order Events (Optional)
- ⬜ `order.created` - Additional order tracking
- ⬜ `order.updated` - Additional order status tracking

### Step 5: Configure Signature Verification
1. **Signature Key**: Use `taste-of-gratitude-webhook-key-2024` (already configured in .env)
2. The webhook handler automatically verifies signatures for production requests
3. Signatures are validated using HMAC-SHA256

### Step 6: Save and Test
1. Click **Save**
2. Square will send a test webhook event
3. Verify the webhook endpoint returns a 200 OK response

### Step 7: Verify Webhook Configuration
Test the webhook endpoint manually:

```bash
# Test GET endpoint
curl https://gratitude-platform.preview.emergentagent.com/api/webhooks/square

# Expected response:
{
  "message": "Square webhook endpoint active",
  "timestamp": "2025-11-02T21:25:14.310Z",
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

## 📊 Webhook Event Handling

### Inventory Count Updated
```json
{
  "type": "inventory.count.updated",
  "data": {
    "object": {
      "catalog_object_id": "VARIATION_ID",
      "location_id": "L66TVG6867BG9",
      "quantity": "10",
      "state": "IN_STOCK"
    }
  }
}
```

**Actions:**
- Updates `square_inventory` collection
- Updates variation inventory count in `square_catalog_items`
- Real-time inventory synchronization

### Catalog Version Updated
```json
{
  "type": "catalog.version.updated",
  "data": {
    "object": {
      "type": "ITEM",
      "id": "ITEM_ID",
      "version": "123456789"
    }
  }
}
```

**Actions:**
- Queues catalog object for resync in `square_sync_queue`
- Triggers immediate sync for high-priority items (ITEM, ITEM_VARIATION)
- Maintains catalog freshness

### Payment Events
```json
{
  "type": "payment.updated",
  "data": {
    "object": {
      "payment": {
        "id": "PAYMENT_ID",
        "order_id": "ORDER_ID",
        "status": "COMPLETED"
      }
    }
  }
}
```

**Actions:**
- Updates order status in `orders` collection
- Maps Square payment status to order status
- Adds timeline entry for payment status change
- Sets `paidAt` timestamp for completed payments

## 🗄️ Database Collections Used

### `square_inventory`
Stores real-time inventory counts from Square
- `catalogObjectId`: Variation ID
- `locationId`: Location ID
- `quantity`: Current stock level
- `state`: Inventory state (IN_STOCK, OUT_OF_STOCK)
- `lastWebhookUpdate`: Webhook timestamp

### `square_sync_queue`
Queues catalog objects for resynchronization
- `objectId`: Catalog object ID
- `objectType`: ITEM, ITEM_VARIATION, CATEGORY, etc.
- `action`: sync_object
- `status`: pending, processing, completed
- `attempts`: Retry count

### `webhook_logs`
Audit log of all webhook events (keeps last 1000)
- `eventId`: Square event ID
- `type`: Event type
- `data`: Full event data
- `createdAt`: Event timestamp
- `processedAt`: Processing timestamp

### `orders`
Order status updates from payment webhooks
- `squareOrderId`: Square Order ID
- `squarePaymentId`: Square Payment ID
- `paymentStatus`: Payment status from Square
- `status`: Mapped order status
- `timeline`: Status change history

## 🔍 Monitoring Webhook Activity

### View Recent Webhook Events
```bash
# Query MongoDB
mongo taste_of_gratitude --eval "db.webhook_logs.find({source: 'square'}).sort({createdAt: -1}).limit(10).pretty()"
```

### View Sync Queue
```bash
# Check pending sync operations
mongo taste_of_gratitude --eval "db.square_sync_queue.find({status: 'pending'}).pretty()"
```

### Check Inventory Updates
```bash
# View recent inventory changes
mongo taste_of_gratitude --eval "db.square_inventory.find({}).sort({lastWebhookUpdate: -1}).limit(10).pretty()"
```

## 🚨 Troubleshooting

### Webhook Not Receiving Events
1. Verify webhook URL is accessible from internet
2. Check Square Developer Dashboard for webhook status
3. Verify signature key matches `.env` configuration
4. Check application logs: `tail -f /var/log/supervisor/nextjs.out.log`

### Signature Verification Failing
1. Confirm `SQUARE_WEBHOOK_SIGNATURE_KEY` in `.env` matches Square Dashboard
2. Verify webhook is configured for production environment
3. Check server logs for signature verification errors

### Events Not Processing
1. Check MongoDB connection is active
2. Verify database collections exist
3. Check application logs for processing errors
4. Ensure sufficient database permissions

## 📈 Performance Monitoring

### Webhook Response Times
- Target: < 2 seconds
- Signature verification: < 100ms
- Database operations: < 500ms
- Event processing: < 1 second

### Webhook Reliability
- Automatic retry: Square retries failed webhooks
- Logging: All events logged to `webhook_logs`
- Error handling: Graceful failure without affecting other webhooks

## 🔐 Security Best Practices

1. **Signature Verification**: Always enabled in production
2. **HTTPS Only**: Webhook endpoint uses HTTPS
3. **Environment Variables**: Sensitive keys stored in `.env`
4. **Rate Limiting**: Webhook endpoint has built-in rate limiting
5. **Audit Logging**: All webhook events logged for audit trail

## ✅ Verification Checklist

- [ ] Webhook URL configured in Square Developer Dashboard
- [ ] All required event types subscribed
- [ ] Signature key matches between Square and `.env`
- [ ] Test webhook sent and received successfully
- [ ] Database collections exist and accessible
- [ ] Webhook logging working correctly
- [ ] Inventory updates processing correctly
- [ ] Catalog updates queuing correctly
- [ ] Payment updates tracking correctly

## 📞 Support

For webhook-related issues:
1. Check Square Developer Dashboard webhook status
2. Review application logs
3. Check MongoDB webhook_logs collection
4. Verify network connectivity
5. Contact Square Support for webhook delivery issues

---

**Last Updated:** November 2, 2025
**Version:** 1.0
**Environment:** Production
