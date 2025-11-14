#!/bin/bash

# Square Payment Integration - Test Runner Script
# Comprehensive testing with detailed reporting

set -e

echo "====================================="
echo "Square Payment Integration Test Suite"
echo "====================================="
echo ""

BASE_DIR="/app"
TEST_DIR="$BASE_DIR/tests/square"
RESULTS_DIR="$BASE_DIR/test-results/square"

mkdir -p "$RESULTS_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test phases
PHASES=(
  "01-environment-config.spec.ts"
  "02-sdk-initialization.spec.ts"
  "03-api-endpoints.spec.ts"
  "04-frontend-integration.spec.ts"
  "05-payment-flow.spec.ts"
  "06-edge-cases-security.spec.ts"
)

PHASE_NAMES=(
  "Environment Configuration"
  "SDK Initialization"
  "API Endpoints"
  "Frontend Integration"
  "Order & Payment Flow"
  "Edge Cases & Security"
)

# Summary variables
TOTAL_PASSED=0
TOTAL_FAILED=0
FAILED_PHASES=()

# Run each test phase
for i in "${!PHASES[@]}"; do
  PHASE="${PHASES[$i]}"
  PHASE_NAME="${PHASE_NAMES[$i]}"
  
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BLUE}Phase $((i+1))/6: $PHASE_NAME${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  
  TEST_FILE="$TEST_DIR/$PHASE"
  RESULT_FILE="$RESULTS_DIR/phase-$((i+1))-results.json"
  
  if [ -f "$TEST_FILE" ]; then
    # Run tests and capture results
    cd "$BASE_DIR"
    
    if yarn test "$TEST_FILE" --reporter=json > "$RESULT_FILE" 2>&1; then
      echo -e "${GREEN}✓ Phase $((i+1)) PASSED${NC}"
      TOTAL_PASSED=$((TOTAL_PASSED + 1))
    else
      echo -e "${RED}✗ Phase $((i+1)) FAILED${NC}"
      TOTAL_FAILED=$((TOTAL_FAILED + 1))
      FAILED_PHASES+=("$PHASE_NAME")
    fi
    
    # Show summary from results
    if [ -f "$RESULT_FILE" ]; then
      echo -e "${YELLOW}View detailed results: $RESULT_FILE${NC}"
    fi
  else
    echo -e "${YELLOW}⚠ Test file not found: $TEST_FILE${NC}"
  fi
  
  echo ""
done

# Final summary
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Test Summary${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Total Phases: 6"
echo -e "${GREEN}Passed: $TOTAL_PASSED${NC}"
echo -e "${RED}Failed: $TOTAL_FAILED${NC}"
echo ""

if [ $TOTAL_FAILED -gt 0 ]; then
  echo -e "${RED}Failed Phases:${NC}"
  for phase in "${FAILED_PHASES[@]}"; do
    echo -e "${RED}  ✗ $phase${NC}"
  done
  echo ""
  echo -e "${YELLOW}⚠ Action Required:${NC}"
  echo "1. Review test results in $RESULTS_DIR"
  echo "2. Check /diagnostic page for environment issues"
  echo "3. Verify Square credentials in .env"
  echo "4. Review application logs"
  echo ""
  exit 1
else
  echo -e "${GREEN}✓ All tests passed!${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Review test coverage report"
  echo "2. Deploy with confidence"
  echo "3. Monitor production metrics"
  echo ""
  exit 0
fi
