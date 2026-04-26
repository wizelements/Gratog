#!/bin/bash
# Payment API Tests using curl
# Tests the payment flow endpoints

BASE_URL="https://tasteofgratitude.shop"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

passed=0
failed=0

test_endpoint() {
    local name="$1"
    local method="$2"
    local url="$3"
    local data="$4"
    local expected_codes="$5"
    
    echo -n "Testing $name... "
    
    if [ "$method" = "POST" ]; then
        response=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$url" \
            -H "Content-Type: application/json" \
            -d "$data" 2>/dev/null)
    else
        response=$(curl -s -o /dev/null -w "%{http_code}" "$url" 2>/dev/null)
    fi
    
    if echo "$expected_codes" | grep -q "$response"; then
        echo -e "${GREEN}PASS${NC} (HTTP $response)"
        ((passed++))
    else
        echo -e "${RED}FAIL${NC} (Expected $expected_codes, got $response)"
        ((failed++))
    fi
}

echo "========================================"
echo "PAYMENT SYSTEM API TESTS"
echo "========================================"
echo ""

# Test 1: Health endpoint
test_endpoint "Health Check" "GET" "$BASE_URL/api/health" "" "200"

# Test 2: Webhook endpoint (should require auth)
test_endpoint "Webhook (no auth)" "POST" "$BASE_URL/api/webhooks/square" \
    '{"type":"test"}' "401"

# Test 3: Orders by-ref (should require auth)
test_endpoint "Orders by-ref (no auth)" "GET" "$BASE_URL/api/orders/by-ref?orderRef=test" "" "401"

# Test 4: Create order (should validate input)
test_endpoint "Create order (invalid data)" "POST" "$BASE_URL/api/orders/create" \
    '{"test":"invalid"}' "400"

# Test 5: Payments endpoint (should validate input)
test_endpoint "Payments (invalid data)" "POST" "$BASE_URL/api/payments" \
    '{"test":"invalid"}' "400"

# Test 6: Checkout endpoint (should validate input)
test_endpoint "Checkout (invalid data)" "POST" "$BASE_URL/api/checkout" \
    '{"test":"invalid"}' "400"

# Test 7: Create-checkout endpoint
test_endpoint "Create-checkout (invalid data)" "POST" "$BASE_URL/api/create-checkout" \
    '{"test":"invalid"}' "400"

echo ""
echo "========================================"
echo "TEST SUMMARY"
echo "========================================"
echo -e "${GREEN}Passed: $passed${NC}"
echo -e "${RED}Failed: $failed${NC}"
echo ""

if [ $failed -eq 0 ]; then
    echo -e "${GREEN}✅ All critical endpoints are responding${NC}"
    echo ""
    echo "Next: Test actual payment flow with Square sandbox"
else
    echo -e "${RED}❌ Some endpoints failed${NC}"
    echo "Check Vercel logs for details"
fi

echo ""
echo "Note: 401/400 responses indicate endpoints exist and are working."
echo "      404 would mean endpoints are not deployed."
echo ""
