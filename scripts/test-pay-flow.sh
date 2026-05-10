#!/bin/bash
# 🚀 Gratog Pay Flow — E2E Test Runner
# Comprehensive testing for mobile-first checkout

set -e

echo "🧪 Gratog Pay Flow E2E Tests"
echo "=============================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Playwright is installed
if ! command -v npx &> /dev/null; then
    echo -e "${RED}Error: npx not found. Install Node.js first.${NC}"
    exit 1
fi

# Install playwright browsers if needed
echo -e "${YELLOW}Checking Playwright browsers...${NC}"
npx playwright install chromium firefox webkit --with-deps 2>/dev/null || true

# Run tests based on argument
MODE="${1:-headless}"

case "$MODE" in
    "headed")
        echo -e "${YELLOW}Running tests in HEADED mode (visible browser)...${NC}"
        npx playwright test e2e/pay-flow/pay-flow.spec.ts --config playwright.config.payflow.ts --headed
        ;;
    "debug")
        echo -e "${YELLOW}Running tests in DEBUG mode (step through)...${NC}"
        PWDEBUG=1 npx playwright test e2e/pay-flow/pay-flow.spec.ts --config playwright.config.payflow.ts
        ;;
    "api")
        echo -e "${YELLOW}Running API tests only...${NC}"
        npx playwright test e2e/pay-flow/pay-flow.spec.ts --config playwright.config.payflow.ts --grep "Payment API"
        ;;
    "ui")
        echo -e "${YELLOW}Running UI tests only...${NC}"
        npx playwright test e2e/pay-flow/pay-flow.spec.ts --config playwright.config.payflow.ts --grep "Product Browsing|Cart Operations"
        ;;
    "smoke")
        echo -e "${YELLOW}Running SMOKE tests only (critical path)...${NC}"
        npx playwright test e2e/pay-flow/pay-flow.spec.ts --config playwright.config.payflow.ts --grep "should add product to cart|should proceed to payment"
        ;;
    "report")
        echo -e "${YELLOW}Opening last test report...${NC}"
        npx playwright show-report
        ;;
    "full")
        echo -e "${YELLOW}Running FULL test suite (all projects)...${NC}"
        npx playwright test e2e/pay-flow/pay-flow.spec.ts --config playwright.config.payflow.ts --project=chromium-mobile --project=firefox-mobile --project=webkit-mobile --project=chromium-desktop
        ;;
    *)
        echo -e "${YELLOW}Running tests in HEADLESS mode...${NC}"
        npx playwright test e2e/pay-flow/pay-flow.spec.ts --config playwright.config.payflow.ts --reporter=list
        ;;
esac

# Check exit code
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed!${NC}"
else
    echo -e "${RED}❌ Tests failed. Check report with: npm run test:pay:report${NC}"
    exit 1
fi
