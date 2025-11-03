# Square Webhooks Configuration Guide

## Overview
This guide explains how to configure Square webhooks to enable real-time synchronization between Square and your application.

## Webhook Endpoint
**Production URL:** `https://cart-rescue-1.preview.emergentagent.com/api/webhooks/square`

**Test URL (for development):** `https://cart-rescue-1.preview.emergentagent.com/api/webhooks/square`

## Supported Webhook Events

### 1. Inventory Updates
**Event Type:** `inventory.count.updated`
- **Purpose:** Real-time inventory synchronization
- **Triggers:** When product inventory changes in Square
- **Action:** Updates local inventory counts in MongoDB
- **Use Case:** Prevents overselling by keeping inventory in sync

### 2. Catalog Updates
**Event Type:** `catalog.version.updated`
- **Purpose:** Product catalog synchronization
- **Triggers:** When products, prices, or descriptions change in Square
- **Action:** Triggers catalog re-sync to update product information
- **Use Case:** Ensures product details always match Square

### 3. Order Events
**Event Type:** `order.created`, `order.updated`
- **Purpose:** Order synchronization and tracking
- **Triggers:** When orders are created or updated in Square
- **Action:** Updates order status and tracking information
- **Use Case:** Real-time order status updates for customers

### 4. Payment Events (Optional)
**Event Type:** `payment.created`, `payment.updated`
- **Purpose:** Payment status tracking
- **Triggers:** When payments are processed or updated
- **Action:** Logs payment events for reconciliation
- **Use Case:** Financial reporting and debugging

## Configuration Steps

### Step 1: Access Square Developer Dashboard
1. Go to https://developer.squareup.com
2. Log in with your Square account
3. Select your application: **Taste Of Gratitude** (Application ID: `sq0idp-V1fV-MwsU5lET4rvzHKnIw`)

### Step 2: Navigate to Webhooks
1. Click on your application
2. Go to **Webhooks** in the left sidebar
3. Click **Add Webhook Endpoint**

### Step 3: Configure Webhook Endpoint
1. **Webhook URL:** Enter `https://cart-rescue-1.preview.emergentagent.com/api/webhooks/square`
2. **Webhook Version:** Select **2024-10-17** (latest version)
3. **Event Types:** Select the following events:
   - ✅ `inventory.count.updated`
   - ✅ `catalog.version.updated`
   - ✅ `order.created` (optional)
   - ✅ `order.updated` (optional)

### Step 4: Generate Signature Key
1. After creating the webhook, Square will generate a **Signature Key**
2. Copy this signature key
3. Add it to your `.env` file:
   ```bash
   SQUARE_WEBHOOK_SIGNATURE_KEY=your_signature_key_here
   ```
4. Restart your application:
   ```bash
   sudo supervisorctl restart nextjs
   ```

### Step 5: Test Webhook
1. In Square Dashboard, click **Test Webhook**
2. Select `inventory.count.updated` as test event
3. Click **Send Test**
4. Verify webhook response shows `200 OK`

### Step 6: Verify Configuration
Test that webhooks are working:

```bash
# Check webhook logs
tail -f /var/log/supervisor/nextjs.out.log | grep -i webhook

# Test webhook endpoint directly
curl https://cart-rescue-1.preview.emergentagent.com/api/webhooks/square
```

Expected response:
```json
{
  "error": "Method not allowed",
  "message": "This endpoint only accepts POST requests from Square"
}
```

## Webhook Security

### Signature Verification
The webhook endpoint verifies Square signatures using HMAC-SHA256:

1. **Signature Header:** `Square-Signature` header contains `v=1,t=signature_value`
2. **Verification Process:**
   - Combines webhook URL + request body
   - Computes HMAC-SHA256 using signature key
   - Compares with provided signature using timing-safe comparison
3. **Security:** Prevents unauthorized webhook calls

### Development Mode
In development (`NODE_ENV=development`), signature verification is skipped for easier testing.

## Webhook Event Processing

### Inventory Updates
```javascript
// Event: inventory.count.updated
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

**Processing:**
1. Updates `square_inventory` collection
2. Updates inventory count in `square_catalog_items`
3. Logs inventory change with timestamp

### Catalog Updates
```javascript
// Event: catalog.version.updated
{
  "type": "catalog.version.updated",
  "data": {
    "object": {
      "updated_at": "2025-01-29T12:00:00Z"
    }
  }
}
```

**Processing:**
1. Logs catalog version change
2. Triggers full catalog re-sync (optional)
3. Updates sync metadata

## Monitoring Webhooks

### Check Webhook Logs
```bash
# View webhook processing logs
tail -n 100 /var/log/supervisor/nextjs.out.log | grep webhook

# Monitor webhook events in real-time
tail -f /var/log/supervisor/nextjs.out.log | grep "Webhook event received"
```

### Database Queries
```javascript
// Check webhook logs in MongoDB
db.square_webhook_logs.find().sort({ createdAt: -1 }).limit(10)

// Check inventory updates
db.square_inventory.find().sort({ updatedAt: -1 }).limit(10)

// Check latest sync
db.square_sync_metadata.findOne({ type: 'catalog_sync' })
```

### Square Dashboard
1. Go to **Webhooks** in Square Dashboard
2. View **Recent Deliveries**
3. Check delivery status (200 OK = successful)
4. View request/response payloads for debugging

## Troubleshooting

### Webhook Returns 401 Unauthorized
**Cause:** Invalid signature key
**Solution:**
1. Regenerate signature key in Square Dashboard
2. Update `SQUARE_WEBHOOK_SIGNATURE_KEY` in `.env`
3. Restart application

### Webhook Returns 500 Error
**Cause:** Processing error in webhook handler
**Solution:**
1. Check application logs: `tail -f /var/log/supervisor/nextjs.out.log`
2. Verify MongoDB connection
3. Check for errors in webhook processing logic

### Webhooks Not Being Received
**Cause:** Network/firewall issues or incorrect URL
**Solution:**
1. Verify webhook URL is publicly accessible
2. Test with curl: `curl -X POST https://your-domain.com/api/webhooks/square`
3. Check Square Dashboard for delivery failures
4. Ensure webhook endpoint is not behind authentication

### Inventory Not Updating
**Cause:** Webhook received but processing failed
**Solution:**
1. Check MongoDB connection
2. Verify `square_catalog_items` collection exists
3. Ensure catalog sync has been run at least once
4. Check webhook logs for processing errors

## Best Practices

### 1. Idempotency
- Store `event_id` to prevent duplicate processing
- Use `replaceOne` with `upsert` for inventory updates
- Check event timestamps before processing

### 2. Error Handling
- Always return 200 OK to Square (even if processing fails)
- Log errors but don't fail the webhook
- Implement retry logic for critical operations

### 3. Performance
- Process webhooks asynchronously when possible
- Use database indexes for fast lookups
- Batch updates when processing multiple events

### 4. Monitoring
- Set up alerts for webhook failures
- Monitor processing time
- Track event types and volumes

## Testing

### Manual Testing
```bash
# Test webhook endpoint
curl -X POST https://cart-rescue-1.preview.emergentagent.com/api/webhooks/square \
  -H "Content-Type: application/json" \
  -H "Square-Signature: v=1,t=test_signature" \
  -d '{
    "type": "inventory.count.updated",
    "data": {
      "object": {
        "catalog_object_id": "TEST_ID",
        "location_id": "L66TVG6867BG9",
        "quantity": "5",
        "state": "IN_STOCK"
      }
    },
    "event_id": "test_event_123",
    "created_at": "2025-01-29T12:00:00Z"
  }'
```

### Square Dashboard Testing
1. Go to **Webhooks** in Square Dashboard
2. Click on your webhook endpoint
3. Click **Test Webhook**
4. Select event type and send test event
5. Verify 200 OK response

## Rollback

### Disable Webhooks
If you need to temporarily disable webhooks:

1. **In Square Dashboard:**
   - Go to Webhooks
   - Toggle webhook endpoint to **Disabled**

2. **In Application:**
   - Comment out webhook processing logic
   - Or return 200 OK without processing

### Re-enable Webhooks
1. Enable webhook endpoint in Square Dashboard
2. Run catalog sync to ensure data is current:
   ```bash
   cd /app && node scripts/syncCatalog.js
   ```

## Support

### Square Documentation
- [Square Webhooks Guide](https://developer.squareup.com/docs/webhooks/overview)
- [Inventory API](https://developer.squareup.com/docs/inventory-api/overview)
- [Catalog API](https://developer.squareup.com/docs/catalog-api/overview)

### Application Logs
```bash
# View all logs
tail -f /var/log/supervisor/nextjs.out.log

# Filter webhook logs
tail -f /var/log/supervisor/nextjs.out.log | grep -i webhook

# Check for errors
tail -f /var/log/supervisor/nextjs.out.log | grep -i error
```

---

**Last Updated:** 2025-01-29  
**Webhook Endpoint:** `/api/webhooks/square`  
**Version:** 1.0
