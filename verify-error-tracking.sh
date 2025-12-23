#!/bin/bash

# Verify Error Tracking System
# Run this AFTER deployment is complete and you have an admin_token

set -e

SITE="https://tasteofgratitude.shop"

if [ -z "$ADMIN_TOKEN" ]; then
  echo "❌ Error: ADMIN_TOKEN not set"
  echo ""
  echo "Get token:"
  echo "  1. Login: $SITE/admin/login"
  echo "  2. DevTools: F12 → Application → Cookies → admin_token"
  echo "  3. Set: export ADMIN_TOKEN='paste_token_here'"
  echo "  4. Retry: $0"
  exit 1
fi

echo "🧪 Verifying Error Tracking System"
echo ""

# Test 1: Auth required
echo "✓ Test 1: Verify auth is required"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SITE/api/errors/summary")
if [ "$STATUS" = "401" ]; then
  echo "  ✅ API correctly returns 401 without token"
else
  echo "  ❌ API returned $STATUS instead of 401"
  exit 1
fi

# Test 2: API responds with token
echo ""
echo "✓ Test 2: Query with admin token"
RESPONSE=$(curl -s -H "Cookie: admin_token=$ADMIN_TOKEN" "$SITE/api/errors/summary")
SUCCESS=$(echo "$RESPONSE" | jq -r '.success // "error"')

if [ "$SUCCESS" = "true" ]; then
  echo "  ✅ API returned 200 with valid token"
  
  # Extract summary info
  ERROR_COUNT=$(echo "$RESPONSE" | jq '.summary.errorCount // 0')
  SOURCES=$(echo "$RESPONSE" | jq '.summary.sources // []' | jq -r 'length')
  CATEGORIES=$(echo "$RESPONSE" | jq '.summary.categories // []' | jq -r 'length')
  
  echo "  Current stats:"
  echo "    - Error count: $ERROR_COUNT"
  echo "    - Unique sources: $SOURCES"
  echo "    - Unique categories: $CATEGORIES"
else
  echo "  ❌ API returned error: $RESPONSE"
  exit 1
fi

# Test 3: List endpoint works
echo ""
echo "✓ Test 3: Query error list"
LIST_RESPONSE=$(curl -s -H "Cookie: admin_token=$ADMIN_TOKEN" "$SITE/api/errors/list?limit=5")
LIST_SUCCESS=$(echo "$LIST_RESPONSE" | jq -r '.success // "error"')
TOTAL=$(echo "$LIST_RESPONSE" | jq -r '.data.total // 0')

if [ "$LIST_SUCCESS" = "true" ]; then
  echo "  ✅ Error list endpoint works"
  echo "    - Total errors: $TOTAL"
else
  echo "  ❌ List endpoint failed"
  exit 1
fi

# Test 4: Filtering works
echo ""
echo "✓ Test 4: Test filtering"
FILTERED=$(curl -s -H "Cookie: admin_token=$ADMIN_TOKEN" "$SITE/api/errors/list?source=client&limit=1")
FILTER_SUCCESS=$(echo "$FILTERED" | jq -r '.success // "error"')

if [ "$FILTER_SUCCESS" = "true" ]; then
  echo "  ✅ Filtering works"
  FILTERED_COUNT=$(echo "$FILTERED" | jq -r '.data.total // 0')
  echo "    - Client errors: $FILTERED_COUNT"
else
  echo "  ❌ Filtering failed"
fi

# Test 5: Check memory
echo ""
echo "✓ Test 5: Check system health"
HEALTH=$(curl -s "$SITE/api/health")
MEMORY_PCT=$(echo "$HEALTH" | jq -r '.checks.memory.percentage // "unknown"')
DB_STATUS=$(echo "$HEALTH" | jq -r '.checks.database // "unknown"')

echo "  Memory: $MEMORY_PCT%"
if [ "$MEMORY_PCT" != "unknown" ]; then
  if (( $(echo "$MEMORY_PCT < 60" | bc -l) )); then
    echo "  ✅ Memory looks good"
  else
    echo "  ⚠️  Memory still high (expected < 50%)"
  fi
fi

# Test 6: Clear errors
echo ""
echo "✓ Test 6: Test clear action"
CLEAR=$(curl -s -X POST \
  -H "Cookie: admin_token=$ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"clear"}' \
  "$SITE/api/errors/summary")

CLEAR_SUCCESS=$(echo "$CLEAR" | jq -r '.success // "error"')
if [ "$CLEAR_SUCCESS" = "true" ]; then
  echo "  ✅ Clear action works"
  
  # Verify cleared
  NEW_COUNT=$(curl -s -H "Cookie: admin_token=$ADMIN_TOKEN" "$SITE/api/errors/summary" | jq '.summary.errorCount')
  echo "    - Error count after clear: $NEW_COUNT"
else
  echo "  ⚠️  Clear action returned: $CLEAR"
fi

echo ""
echo "=================================================="
echo "✅ Error Tracking System is operational!"
echo "=================================================="
echo ""
echo "Next: Trigger test error in browser"
echo ""
echo "  1. Visit: $SITE"
echo "  2. Open console: F12 → Console"
echo "  3. Type: throw new Error('Test error');"
echo "  4. Verify error page shows error ID"
echo "  5. Check API: curl -H \"Cookie: admin_token=\$ADMIN_TOKEN\" \\"
echo "       $SITE/api/errors/list?limit=1"
echo ""
echo "See TEST_PLAN_ERROR_TRACKING.md for complete guide"
