#!/bin/bash
# Diagnostic script to understand what's not working

echo "=========================================="
echo "PAYMENT SYSTEM DIAGNOSTIC"
echo "=========================================="
echo ""

BASE_URL="https://tasteofgratitude.shop"

echo "1. Testing Health Endpoint..."
echo "   URL: $BASE_URL/api/health"
HEALTH=$(curl -s "$BASE_URL/api/health")
echo "   Response: $HEALTH"
echo ""

echo "2. Testing Webhook Endpoint (POST)..."
echo "   URL: $BASE_URL/api/webhooks/square"
WEBHOOK_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/webhooks/square" \
  -H "Content-Type: application/json" \
  -d '{"type":"payment.updated","data":{"object":{"payment":{"id":"test"}}}}')
echo "   Status Code: $WEBHOOK_STATUS"
if [ "$WEBHOOK_STATUS" = "401" ]; then
  echo "   ✅ Webhook endpoint exists and requires auth"
elif [ "$WEBHOOK_STATUS" = "404" ]; then
  echo "   ❌ Webhook endpoint not found (not deployed)"
elif [ "$WEBHOOK_STATUS" = "500" ]; then
  echo "   ❌ Webhook endpoint has server error"
fi
echo ""

echo "3. Testing Orders Endpoint..."
echo "   URL: $BASE_URL/api/orders/by-ref?orderRef=test123"
ORDERS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/orders/by-ref?orderRef=test123")
echo "   Status Code: $ORDERS_STATUS"
if [ "$ORDERS_STATUS" = "401" ]; then
  echo "   ✅ Orders endpoint exists and requires auth"
elif [ "$ORDERS_STATUS" = "404" ]; then
  echo "   ❌ Orders endpoint not found"
fi
echo ""

echo "4. Testing Create Order Endpoint..."
echo "   URL: $BASE_URL/api/orders/create"
CREATE_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/orders/create" \
  -H "Content-Type: application/json" \
  -d '{"test":"data"}')
echo "   Status Code: $CREATE_STATUS"
if [ "$CREATE_STATUS" = "400" ] || [ "$CREATE_STATUS" = "401" ] || [ "$CREATE_STATUS" = "429" ]; then
  echo "   ✅ Create order endpoint exists"
elif [ "$CREATE_STATUS" = "404" ]; then
  echo "   ❌ Create order endpoint not found"
fi
echo ""

echo "5. Testing Payments Endpoint..."
echo "   URL: $BASE_URL/api/payments"
PAYMENTS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/payments" \
  -H "Content-Type: application/json" \
  -d '{"test":"data"}')
echo "   Status Code: $PAYMENTS_STATUS"
if [ "$PAYMENTS_STATUS" = "400" ] || [ "$PAYMENTS_STATUS" = "401" ] || [ "$PAYMENTS_STATUS" = "409" ]; then
  echo "   ✅ Payments endpoint exists"
elif [ "$PAYMENTS_STATUS" = "404" ]; then
  echo "   ❌ Payments endpoint not found"
fi
echo ""

echo "=========================================="
echo "DIAGNOSTIC COMPLETE"
echo "=========================================="
echo ""
echo "Common Issues:"
echo "- If endpoints return 404, the deployment may have failed"
echo "- If endpoints return 500, check Vercel logs for errors"
echo "- If endpoints return 401/400, they are working but need proper auth/data"
echo ""
echo "Check Vercel Dashboard:"
echo "https://vercel.com/wizelements/gratog"
