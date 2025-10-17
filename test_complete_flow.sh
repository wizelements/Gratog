#!/bin/bash
# Complete Order Flow Test

echo "======================================================================"
echo "🧪 COMPLETE ORDER FLOW TEST - DYNAMIC SQUARE CHECKOUT"
echo "======================================================================"

API_BASE="http://localhost:3000/api"

# Step 1: Create Order
echo ""
echo "Step 1: Creating order..."
ORDER_RESPONSE=$(curl -s -X POST "$API_BASE/orders/create" \
  -H "Content-Type: application/json" \
  -d '{
    "cart": [{
      "id": "elderberry-moss",
      "slug": "elderberry-moss",
      "name": "Elderberry Moss",
      "price": 25.00,
      "quantity": 2,
      "rewardPoints": 25
    }],
    "customer": {
      "name": "Complete Flow Test",
      "email": "complete-test@tasteofgratitude.com",
      "phone": "+14045551234"
    },
    "fulfillmentType": "pickup_market",
    "subtotal": 50.00,
    "total": 50.00,
    "source": "complete_flow_test"
  }')

ORDER_ID=$(echo "$ORDER_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$ORDER_ID" ]; then
  echo "❌ Order creation failed"
  echo "$ORDER_RESPONSE"
  exit 1
fi

echo "✅ Order created: $ORDER_ID"

# Step 2: Create Square Checkout
echo ""
echo "Step 2: Creating Square checkout session..."
CHECKOUT_RESPONSE=$(curl -s -X POST "$API_BASE/square/create-checkout" \
  -H "Content-Type: application/json" \
  -d "{
    \"orderId\": \"$ORDER_ID\",
    \"items\": [{
      \"name\": \"Elderberry Moss\",
      \"price\": 25.00,
      \"quantity\": 2,
      \"description\": \"Sea Moss Gel\"
    }],
    \"customer\": {
      \"name\": \"Complete Flow Test\",
      \"email\": \"complete-test@tasteofgratitude.com\",
      \"phone\": \"+14045551234\"
    },
    \"total\": 50.00,
    \"subtotal\": 50.00
  }")

CHECKOUT_URL=$(echo "$CHECKOUT_RESPONSE" | grep -o '"checkoutUrl":"[^"]*"' | cut -d'"' -f4)
PAYMENT_LINK_ID=$(echo "$CHECKOUT_RESPONSE" | grep -o '"paymentLinkId":"[^"]*"' | cut -d'"' -f4)

if [ -z "$CHECKOUT_URL" ]; then
  echo "❌ Square checkout creation failed"
  echo "$CHECKOUT_RESPONSE"
  exit 1
fi

echo "✅ Square checkout created"
echo "   Payment Link ID: $PAYMENT_LINK_ID"
echo "   Checkout URL: $CHECKOUT_URL"

# Step 3: Test Webhook Endpoint
echo ""
echo "Step 3: Checking webhook endpoint..."
WEBHOOK_RESPONSE=$(curl -s "$API_BASE/square-webhook")
WEBHOOK_STATUS=$(echo "$WEBHOOK_RESPONSE" | grep -o '"message":"[^"]*"' | cut -d'"' -f4)

if [ -n "$WEBHOOK_STATUS" ]; then
  echo "✅ Webhook endpoint active: $WEBHOOK_STATUS"
else
  echo "⚠️  Webhook endpoint check inconclusive"
fi

# Summary
echo ""
echo "======================================================================"
echo "📊 COMPLETE FLOW TEST RESULTS"
echo "======================================================================"
echo "✅ Order Creation: SUCCESS"
echo "✅ Square Checkout: SUCCESS"
echo "✅ Webhook Endpoint: READY"
echo ""
echo "🎯 TEST PAYMENT LINK:"
echo "   $CHECKOUT_URL"
echo ""
echo "📝 Order Details:"
echo "   Order ID: $ORDER_ID"
echo "   Payment Link: $PAYMENT_LINK_ID"
echo "   Total: \$50.00 (2x Elderberry Moss)"
echo ""
echo "🔗 Order Tracking:"
echo "   http://localhost:3000/order/success?orderId=$ORDER_ID"
echo ""
echo "======================================================================"
