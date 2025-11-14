#!/bin/bash

# Square Payment Diagnostic Script
# Runs comprehensive checks against the deployed application

set -e

echo "🔍 Square Payment Integration Diagnostic Tool"
echo "=============================================="
echo ""

SITE_URL="${1:-https://gratog.vercel.app}"
PREVIEW_URL="${2:-http://localhost:3000}"

echo "Target Site: $SITE_URL"
echo "Preview URL: $PREVIEW_URL"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

check_pass() {
  echo -e "${GREEN}✓${NC} $1"
  PASS_COUNT=$((PASS_COUNT + 1))
}

check_fail() {
  echo -e "${RED}✗${NC} $1"
  FAIL_COUNT=$((FAIL_COUNT + 1))
}

check_warn() {
  echo -e "${YELLOW}⚠${NC} $1"
  WARN_COUNT=$((WARN_COUNT + 1))
}

check_info() {
  echo -e "${BLUE}ℹ${NC} $1"
}

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1. Environment Variables Check"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check local environment variables
if [ -f "/app/.env" ]; then
  check_pass ".env file exists"
  
  if grep -q "NEXT_PUBLIC_SQUARE_APPLICATION_ID" /app/.env; then
    check_pass "NEXT_PUBLIC_SQUARE_APPLICATION_ID found in .env"
  else
    check_fail "NEXT_PUBLIC_SQUARE_APPLICATION_ID missing from .env"
  fi
  
  if grep -q "NEXT_PUBLIC_SQUARE_LOCATION_ID" /app/.env; then
    check_pass "NEXT_PUBLIC_SQUARE_LOCATION_ID found in .env"
  else
    check_fail "NEXT_PUBLIC_SQUARE_LOCATION_ID missing from .env"
  fi
  
  if grep -q "SQUARE_ACCESS_TOKEN" /app/.env; then
    check_pass "SQUARE_ACCESS_TOKEN found in .env"
  else
    check_fail "SQUARE_ACCESS_TOKEN missing from .env"
  fi
else
  check_fail ".env file not found"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2. API Health Checks"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check health endpoint
if curl -s -f "$PREVIEW_URL/api/health" > /dev/null 2>&1; then
  check_pass "Health endpoint responding"
else
  check_fail "Health endpoint not responding"
fi

# Check checkout endpoint
if curl -s -f "$PREVIEW_URL/api/checkout" > /dev/null 2>&1; then
  check_pass "Checkout endpoint responding"
else
  check_fail "Checkout endpoint not responding"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3. Production Site Checks"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if site is accessible
if curl -s -f "$SITE_URL" > /dev/null 2>&1; then
  check_pass "Production site accessible"
else
  check_fail "Production site not accessible"
fi

# Check diagnostic page
if curl -s -f "$SITE_URL/diagnostic" > /dev/null 2>&1; then
  check_pass "Diagnostic page accessible"
  check_info "Visit $SITE_URL/diagnostic for browser-side checks"
else
  check_warn "Diagnostic page not accessible"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Final Summary"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${GREEN}Passed: $PASS_COUNT${NC}"
echo -e "${RED}Failed: $FAIL_COUNT${NC}"
echo -e "${YELLOW}Warnings: $WARN_COUNT${NC}"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
  echo -e "${GREEN}✓ All critical checks passed!${NC}"
  exit 0
else
  echo -e "${RED}✗ $FAIL_COUNT critical issues found!${NC}"
  exit 1
fi
