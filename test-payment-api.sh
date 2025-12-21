#!/bin/bash

# Full Payment Testing Script
# Tests the complete payment flow from API to database

set -e

# Color output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

API_URL="http://localhost:3000/api"
TIMESTAMP=$(date +%s%N | cut -b1-13)
ORDER_ID="order-test-$TIMESTAMP"
PAYMENT_ID=""

echo -e "${YELLOW}=== Gratog Payment Testing Suite ===${NC}"
echo "Test Timestamp: $TIMESTAMP"
echo "Order ID: $ORDER_ID"
echo ""

# Test 1: Valid Payment
echo -e "${YELLOW}[TEST 1] Valid Payment Processing${NC}"
echo "Making payment request..."

RESPONSE=$(curl -s -X POST "$API_URL/payments" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceId": "cnp:card-nonce-ok",
    "amountCents": 5000,
    "currency": "USD",
    "idempotencyKey": "test-payment-'$TIMESTAMP'",
    "customer": {
      "email": "test-'$TIMESTAMP'@gratog.test",
      "name": "Test Customer",
      "phone": "+14155552671"
    },
    "orderId": "'$ORDER_ID'"
  }')

echo "Response: $RESPONSE"

# Check if successful
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ Payment successful${NC}"
  PAYMENT_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "Payment ID: $PAYMENT_ID"
else
  echo -e "${RED}❌ Payment failed${NC}"
  echo "$RESPONSE"
  exit 1
fi

echo ""

# Test 2: Check Payment Status
echo -e "${YELLOW}[TEST 2] Retrieve Payment Status${NC}"
STATUS_RESPONSE=$(curl -s -X GET "$API_URL/payments?paymentId=$PAYMENT_ID")
echo "Response: $STATUS_RESPONSE"

if echo "$STATUS_RESPONSE" | grep -q '"success":true'; then
  echo -e "${GREEN}✅ Payment retrieval successful${NC}"
else
  echo -e "${RED}❌ Payment retrieval failed${NC}"
fi

echo ""

# Test 3: Declined Card (Error Scenario)
echo -e "${YELLOW}[TEST 3] Declined Card Error Handling${NC}"
echo "Making payment with declined card..."

DECLINED_RESPONSE=$(curl -s -X POST "$API_URL/payments" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceId": "cnp:card-nonce-declined",
    "amountCents": 5000,
    "currency": "USD",
    "idempotencyKey": "test-declined-'$TIMESTAMP'"
  }')

echo "Response: $DECLINED_RESPONSE"

if echo "$DECLINED_RESPONSE" | grep -q '"success":false'; then
  echo -e "${GREEN}✅ Declined card properly rejected${NC}"
  
  # Check status code is 400
  STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/payments" \
    -H "Content-Type: application/json" \
    -d '{
      "sourceId": "cnp:card-nonce-declined",
      "amountCents": 5000,
      "currency": "USD",
      "idempotencyKey": "test-declined-check-'$TIMESTAMP'"
    }')
  
  echo "HTTP Status Code: $STATUS_CODE"
  
  if [ "$STATUS_CODE" = "400" ]; then
    echo -e "${GREEN}✅ Correct status code (400)${NC}"
  else
    echo -e "${RED}❌ Wrong status code (expected 400, got $STATUS_CODE)${NC}"
  fi
else
  echo -e "${RED}❌ Declined card not properly handled${NC}"
fi

echo ""

# Test 4: Invalid Token
echo -e "${YELLOW}[TEST 4] Invalid Token Error Handling${NC}"
echo "Making payment with invalid token..."

INVALID_RESPONSE=$(curl -s -X POST "$API_URL/payments" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceId": "invalid-token-12345",
    "amountCents": 5000,
    "currency": "USD",
    "idempotencyKey": "test-invalid-'$TIMESTAMP'"
  }')

echo "Response: $INVALID_RESPONSE"

if echo "$INVALID_RESPONSE" | grep -q '"success":false'; then
  echo -e "${GREEN}✅ Invalid token properly rejected${NC}"
  
  # Check for 400 status
  INVALID_STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_URL/payments" \
    -H "Content-Type: application/json" \
    -d '{
      "sourceId": "invalid-token-12345",
      "amountCents": 5000,
      "currency": "USD",
      "idempotencyKey": "test-invalid-check-'$TIMESTAMP'"
    }')
  
  if [ "$INVALID_STATUS" = "400" ]; then
    echo -e "${GREEN}✅ Correct status code (400)${NC}"
  else
    echo -e "${RED}❌ Wrong status code (expected 400, got $INVALID_STATUS)${NC}"
  fi
else
  echo -e "${RED}❌ Invalid token not properly handled${NC}"
fi

echo ""

# Test 5: Missing Amount
echo -e "${YELLOW}[TEST 5] Missing Required Fields${NC}"
echo "Making payment without amount..."

MISSING_RESPONSE=$(curl -s -X POST "$API_URL/payments" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceId": "cnp:card-nonce-ok",
    "currency": "USD",
    "idempotencyKey": "test-missing-'$TIMESTAMP'"
  }')

echo "Response: $MISSING_RESPONSE"

if echo "$MISSING_RESPONSE" | grep -q '"success":false\|"error"'; then
  echo -e "${GREEN}✅ Missing fields properly rejected${NC}"
else
  echo -e "${RED}❌ Missing fields not properly validated${NC}"
fi

echo ""

# Test 6: Negative Amount
echo -e "${YELLOW}[TEST 6] Negative Amount Validation${NC}"
echo "Making payment with negative amount..."

NEGATIVE_RESPONSE=$(curl -s -X POST "$API_URL/payments" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceId": "cnp:card-nonce-ok",
    "amountCents": -5000,
    "currency": "USD",
    "idempotencyKey": "test-negative-'$TIMESTAMP'"
  }')

echo "Response: $NEGATIVE_RESPONSE"

if echo "$NEGATIVE_RESPONSE" | grep -q '"success":false'; then
  echo -e "${GREEN}✅ Negative amount properly rejected${NC}"
else
  echo -e "${RED}❌ Negative amount not properly validated${NC}"
fi

echo ""

# Summary
echo -e "${YELLOW}=== Test Summary ===${NC}"
echo -e "${GREEN}Payment API Testing Complete${NC}"
echo ""
echo "Order ID (for database verification): $ORDER_ID"
echo "Payment ID: $PAYMENT_ID"
echo ""
echo "Next steps:"
echo "1. Verify payment in Square Dashboard:"
echo "   https://connect.squareup.com/payments"
echo ""
echo "2. Check database for order status:"
echo "   db.orders.findOne({ id: '$ORDER_ID' })"
echo ""
echo "3. Check database for payment record:"
echo "   db.payments.findOne({ orderId: '$ORDER_ID' })"
echo ""
echo "4. Verify customer received confirmation email"
echo "5. Verify admin received order notification"

