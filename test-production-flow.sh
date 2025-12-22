#!/bin/bash

# Production Payment Flow Test
# Tests critical endpoints and payment flow after deployment

set -e

BASE_URL="https://tasteofgratitude.shop"
echo "🔍 Testing Production Payment Flow"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Base URL: $BASE_URL"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass_count=0
fail_count=0

# Test function
test_endpoint() {
  local name=$1
  local method=$2
  local endpoint=$3
  local data=$4
  
  echo -n "Testing: $name ... "
  
  if [ "$method" = "POST" ]; then
    response=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL$endpoint" \
      -H "Content-Type: application/json" \
      -d "$data" 2>&1)
  else
    response=$(curl -s -w "\n%{http_code}" "$BASE_URL$endpoint" 2>&1)
  fi
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)
  
  if [[ "$http_code" == "200" ]] || [[ "$http_code" == "201" ]]; then
    echo -e "${GREEN}✅ PASS${NC} (HTTP $http_code)"
    ((pass_count++))
    return 0
  else
    echo -e "${RED}❌ FAIL${NC} (HTTP $http_code)"
    echo "  Response: $(echo "$body" | head -c 100)..."
    ((fail_count++))
    return 1
  fi
}

# Test 1: Health Check
test_endpoint "API Health" "GET" "/api/health" ""

# Test 2: Products
test_endpoint "Products Endpoint" "GET" "/api/products" ""

# Test 3: Homepage (check content, not just HTTP code)
echo -n "Testing: Homepage Content ... "
response=$(curl -s "$BASE_URL")
if echo "$response" | grep -q "Sea Moss\|Gratitude\|Product"; then
  echo -e "${GREEN}✅ PASS${NC} (Content renders)"
  ((pass_count++))
else
  echo -e "${RED}❌ FAIL${NC} (No product content)"
  ((fail_count++))
fi

# Test 4: Check for error page
echo -n "Testing: No Error Page ... "
if echo "$response" | grep -q "Something went wrong"; then
  echo -e "${RED}❌ FAIL${NC} (Error page detected)"
  ((fail_count++))
else
  echo -e "${GREEN}✅ PASS${NC} (No error page)"
  ((pass_count++))
fi

# Test 5: SSL Certificate
echo -n "Testing: SSL Certificate ... "
cert=$(curl -sI "$BASE_URL" 2>&1 | grep -i "https")
if [ ! -z "$cert" ]; then
  echo -e "${GREEN}✅ PASS${NC} (HTTPS active)"
  ((pass_count++))
else
  echo -e "${RED}❌ FAIL${NC} (HTTPS not detected)"
  ((fail_count++))
fi

# Test 6: Square SDK Loaded
echo -n "Testing: Square SDK ... "
sdk=$(curl -s "$BASE_URL" | grep -o "squarecdn" | head -1)
if [ ! -z "$sdk" ]; then
  echo -e "${GREEN}✅ PASS${NC} (Square SDK referenced)"
  ((pass_count++))
else
  echo -e "${RED}❌ FAIL${NC} (Square SDK not found)"
  ((fail_count++))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "Results: ${GREEN}$pass_count passed${NC}, ${RED}$fail_count failed${NC}"

if [ $fail_count -eq 0 ]; then
  echo -e "${GREEN}✅ All tests passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ Some tests failed${NC}"
  exit 1
fi
