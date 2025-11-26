#!/bin/bash

# Comprehensive Fix Verification Test Script
# Run this after deploying fixes to verify all improvements

set -e

BASE_URL="${BASE_URL:-https://taste-interactive.preview.emergentagent.com}"

echo "🧪 Testing All Fixes Applied"
echo "=============================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_pattern="$3"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo -n "Testing: $test_name... "
    
    if output=$(eval "$test_command" 2>&1); then
        if echo "$output" | grep -q "$expected_pattern"; then
            echo -e "${GREEN}✅ PASS${NC}"
            PASSED_TESTS=$((PASSED_TESTS + 1))
            return 0
        else
            echo -e "${RED}❌ FAIL${NC} (unexpected response)"
            echo "  Expected pattern: $expected_pattern"
            echo "  Got: $output" | head -3
            FAILED_TESTS=$((FAILED_TESTS + 1))
            return 1
        fi
    else
        echo -e "${RED}❌ FAIL${NC} (command failed)"
        echo "  Error: $output" | head -3
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

echo "📍 Phase 1: Health Check"
echo "----------------------"
run_test "Health endpoint responds" \
    "curl -s $BASE_URL/api/health" \
    "healthy"

run_test "Database connection working" \
    "curl -s $BASE_URL/api/health | jq -r '.services.database'" \
    "connected"

run_test "Square API status available" \
    "curl -s $BASE_URL/api/health | jq -r '.services.square_api'" \
    "production"

echo ""
echo "📍 Phase 2: Square Credential Validation"
echo "---------------------------------------"
run_test "Square diagnostic endpoint accessible" \
    "curl -s $BASE_URL/api/square/diagnose" \
    "Square Credential Diagnostic Endpoint"

echo ""
echo "📍 Phase 3: Error Logging Improvements"
echo "-------------------------------------"
run_test "Order creation with missing data shows detailed error" \
    "curl -s -X POST $BASE_URL/api/orders/create -H 'Content-Type: application/json' -d '{}'" \
    "Cart items are required"

run_test "Admin login with invalid data shows error" \
    "curl -s -X POST $BASE_URL/api/admin/auth/login -H 'Content-Type: application/json' -d '{}'" \
    "Email and password required"

echo ""
echo "📍 Phase 4: Square Payment APIs"
echo "------------------------------"
run_test "Payments API input validation working" \
    "curl -s -X POST $BASE_URL/api/payments -H 'Content-Type: application/json' -d '{\"amountCents\": 0}'" \
    "Payment source ID.*required"

run_test "Checkout API input validation working" \
    "curl -s -X POST $BASE_URL/api/checkout -H 'Content-Type: application/json' -d '{\"lineItems\": []}'" \
    "Line items array is required"

echo ""
echo "📍 Phase 5: Webhook Processing"
echo "----------------------------"
run_test "Webhook endpoint responds to GET" \
    "curl -s $BASE_URL/api/square-webhook" \
    "Square webhook endpoint active"

echo ""
echo "📍 Phase 6: Products API"
echo "----------------------"
run_test "Products API returns data" \
    "curl -s $BASE_URL/api/products" \
    "success"

run_test "Products have Square catalog IDs" \
    "curl -s $BASE_URL/api/products | jq -r '.products[0].catalogObjectId'" \
    "[A-Z0-9]"

echo ""
echo ""
echo "=============================="
echo "📊 Test Results Summary"
echo "=============================="
echo ""
echo -e "Total Tests:  $TOTAL_TESTS"
echo -e "${GREEN}Passed:       $PASSED_TESTS${NC}"
echo -e "${RED}Failed:       $FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    echo ""
    echo "✅ Fixes verified successfully"
    echo ""
    echo "Next steps:"
    echo "1. Update Square credentials in environment variables"
    echo "2. Redeploy application"
    echo "3. Run Square diagnostic: curl -X POST $BASE_URL/api/square/diagnose"
    echo "4. Test live payment processing"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some tests failed${NC}"
    echo ""
    echo "Please review failed tests above and:"
    echo "1. Check error logs for detailed information"
    echo "2. Verify environment variables are set correctly"
    echo "3. Ensure database connection is stable"
    exit 1
fi
