#!/bin/bash
# Quick verification script for payment fixes

echo "=== Gratog Payment Fixes Verification ==="
echo ""
echo "Checking deployed code..."
echo ""

# Check if webhook endpoint is accessible
WEBHOOK_URL="https://tasteofgratitude.shop/api/webhooks/square"

echo "1. Testing webhook endpoint (should return 401 for invalid signature, not 404):"
curl -s -o /dev/null -w "%{http_code}" -X POST "$WEBHOOK_URL" -H "Content-Type: application/json" -d '{"type":"test"}'
echo " (401 expected = endpoint exists, 404 = not deployed yet)"
echo ""

# Check if orders endpoint is accessible
ORDERS_URL="https://tasteofgratitude.shop/api/orders/by-ref?orderRef=test123"

echo "2. Testing orders by-ref endpoint:"
curl -s -o /dev/null -w "%{http_code}" "$ORDERS_URL"
echo " (404 expected for non-existent order, 200 = found, 500 = error)"
echo ""

# Check health endpoint
HEALTH_URL="https://tasteofgratitude.shop/api/health"

echo "3. Testing health endpoint:"
curl -s "$HEALTH_URL" | head -c 200
echo ""
echo ""

echo "=== Verification Complete ==="
echo ""
echo "Next steps:"
echo "1. Check Vercel Dashboard for deployment status"
echo "2. Complete a test order and payment"
echo "3. Monitor Square webhook logs"
echo "4. Check order status updates correctly"
