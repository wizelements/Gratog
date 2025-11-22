#!/bin/bash
# Quick Deployment Verification Script
# Run this after deploying with updated Square credentials

DEPLOY_URL="${1:-https://loading-fix-taste.preview.emergentagent.com}"

echo "🔍 Verifying Deployment at: $DEPLOY_URL"
echo "============================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SUCCESS=0
FAILURES=0

verify() {
    local name="$1"
    local url="$2"
    local expected="$3"
    
    echo -n "Testing $name... "
    
    response=$(curl -s "$url")
    
    if echo "$response" | grep -q "$expected"; then
        echo -e "${GREEN}✅ PASS${NC}"
        SUCCESS=$((SUCCESS + 1))
    else
        echo -e "${RED}❌ FAIL${NC}"
        echo "  Expected: $expected"
        echo "  Got: $(echo "$response" | head -c 100)..."
        FAILURES=$((FAILURES + 1))
    fi
}

echo "1️⃣  System Health Check"
echo "─────────────────────"
verify "Health endpoint" "$DEPLOY_URL/api/health" "healthy"
verify "Database connection" "$DEPLOY_URL/api/health" "connected"
verify "Square API status" "$DEPLOY_URL/api/health" "production"

echo ""
echo "2️⃣  Square Integration"
echo "─────────────────────"
verify "Square diagnostic available" "$DEPLOY_URL/api/square/diagnose" "Square"

echo ""
echo "3️⃣  API Endpoints"
echo "─────────────────"
verify "Products API" "$DEPLOY_URL/api/products" "success"
verify "Webhook endpoint" "$DEPLOY_URL/api/square-webhook" "webhook"

echo ""
echo "============================================"
echo "📊 VERIFICATION RESULTS"
echo "============================================"
echo -e "Passed: ${GREEN}$SUCCESS${NC}"
echo -e "Failed: ${RED}$FAILURES${NC}"
echo ""

if [ $FAILURES -eq 0 ]; then
    echo -e "${GREEN}🎉 ALL CHECKS PASSED!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Run Square diagnostic: curl -X POST $DEPLOY_URL/api/square/diagnose"
    echo "2. Test order creation"
    echo "3. Test payment processing"
    echo ""
    echo -e "${GREEN}✅ Deployment successful!${NC}"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some checks failed${NC}"
    echo ""
    echo "Please review failures above"
    exit 1
fi
