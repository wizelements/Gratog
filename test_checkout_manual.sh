#!/bin/bash

echo "🚀 Manual Checkout Flow Testing"
echo "================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

BASE_URL="http://localhost:3000"

echo "📍 Testing against: $BASE_URL"
echo ""

# Test 1: Health check (new endpoint)
echo "Test 1: GET /api/health"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/api/health)
if [ "$STATUS" = "200" ]; then
    echo -e "${GREEN}✅ PASS${NC}: Health endpoint - Status: $STATUS"
else
    echo -e "${RED}❌ FAIL${NC}: Health endpoint - Status: $STATUS"
fi
echo ""

# Test 2: Checkout API - Empty items (should fail with 400)
echo "Test 2: POST /api/checkout (empty items - should return 400)"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE_URL/api/checkout \
  -H "Content-Type: application/json" \
  -d '{"lineItems":[]}')
if [ "$STATUS" = "400" ]; then
    echo -e "${GREEN}✅ PASS${NC}: Empty items validation - Status: $STATUS"
else
    echo -e "${YELLOW}⚠️  WARN${NC}: Empty items validation - Status: $STATUS (expected 400)"
fi
echo ""

# Test 3: Checkout API - Missing lineItems (should fail with 400)
echo "Test 3: POST /api/checkout (missing lineItems - should return 400)"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE_URL/api/checkout \
  -H "Content-Type: application/json" \
  -d '{}')
if [ "$STATUS" = "400" ]; then
    echo -e "${GREEN}✅ PASS${NC}: Missing lineItems validation - Status: $STATUS"
else
    echo -e "${YELLOW}⚠️  WARN${NC}: Missing lineItems validation - Status: $STATUS (expected 400)"
fi
echo ""

# Test 4: Order page route
echo "Test 4: GET /order (order page)"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/order)
if [ "$STATUS" = "200" ]; then
    echo -e "${GREEN}✅ PASS${NC}: Order page - Status: $STATUS"
else
    echo -e "${RED}❌ FAIL${NC}: Order page - Status: $STATUS"
fi
echo ""

# Test 5: Checkout page route
echo "Test 5: GET /checkout (checkout page)"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/checkout)
if [ "$STATUS" = "200" ]; then
    echo -e "${GREEN}✅ PASS${NC}: Checkout page - Status: $STATUS"
else
    echo -e "${RED}❌ FAIL${NC}: Checkout page - Status: $STATUS"
fi
echo ""

# Test 6: Checkout success page
echo "Test 6: GET /checkout/success (success page)"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $BASE_URL/checkout/success)
if [ "$STATUS" = "200" ]; then
    echo -e "${GREEN}✅ PASS${NC}: Success page - Status: $STATUS"
else
    echo -e "${RED}❌ FAIL${NC}: Success page - Status: $STATUS"
fi
echo ""

# Test 7: Cart price API
echo "Test 7: POST /api/cart/price (cart calculation)"
RESPONSE=$(curl -s -X POST $BASE_URL/api/cart/price \
  -H "Content-Type: application/json" \
  -d '{"cart":[{"productId":"test","name":"Test","price":15,"size":"16 oz","quantity":2}],"fulfillmentType":"pickup"}')
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST $BASE_URL/api/cart/price \
  -H "Content-Type: application/json" \
  -d '{"cart":[{"productId":"test","name":"Test","price":15,"size":"16 oz","quantity":2}],"fulfillmentType":"pickup"}')
if [ "$STATUS" = "200" ]; then
    echo -e "${GREEN}✅ PASS${NC}: Cart price calculation - Status: $STATUS"
    echo "   Response: $RESPONSE" | head -c 100
    echo "..."
else
    echo -e "${RED}❌ FAIL${NC}: Cart price calculation - Status: $STATUS"
fi
echo ""

echo "================================"
echo "📊 Test Summary Complete"
echo "Check results above for any failures"
