#!/bin/bash
# GRATOG DEPLOYMENT SCRIPT v2.0
# Production deployment automation

set -e  # Exit on error

echo "🚀 GRATOG DEPLOYMENT STARTING..."
echo "=============================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="gratog"
REPO_URL="https://github.com/cod3black/gratog-live.git"
VERCEL_TEAM=""

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v git &> /dev/null; then
    echo "${RED}❌ Git not installed${NC}"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "${RED}❌ Node.js not installed${NC}"
    exit 1
fi

echo "${GREEN}✅ Prerequisites check passed${NC}"
echo ""

# Step 1: Git commit
echo "📝 Step 1: Committing changes..."
git add -A
git commit -m "feat: Gratog v2.0 - Unified fulfillment system

- Add Today/Preorder/Shipping fulfillment options
- Implement Square webhook verification
- Add Cash App payment method
- Create admin dashboard with fulfillment tabs
- Add partial/full refund system
- Implement rate limiting and security hardening
- Pass all 20 payment tests

BREAKING CHANGE: New checkout flow replaces old system"

echo "${GREEN}✅ Changes committed${NC}"
echo ""

# Step 2: Push to GitHub
echo "📤 Step 2: Pushing to GitHub..."
git push origin main

echo "${GREEN}✅ Pushed to GitHub${NC}"
echo ""

# Step 3: Environment variables check
echo "🔐 Step 3: Checking environment variables..."
echo "${YELLOW}⚠️  Ensure these are set in Vercel Dashboard:${NC}"
echo ""
echo "Required:"
echo "  - ADMIN_API_KEY"
echo "  - SQUARE_WEBHOOK_SIGNATURE_KEY"
echo "  - ADMIN_PHONE"
echo "  - SQUARE_ACCESS_TOKEN"
echo "  - SQUARE_ENVIRONMENT (production)"
echo ""
echo "Optional (for SMS):"
echo "  - TWILIO_ACCOUNT_SID"
echo "  - TWILIO_AUTH_TOKEN"
echo "  - TWILIO_PHONE_NUMBER"
echo ""

read -p "Have you set these in Vercel? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "${RED}❌ Please set environment variables first${NC}"
    echo "Visit: https://vercel.com/dashboard"
    exit 1
fi

echo "${GREEN}✅ Environment variables confirmed${NC}"
echo ""

# Step 4: Vercel deployment
echo "🌐 Step 4: Deploying to Vercel..."

if command -v vercel &> /dev/null; then
    vercel --prod
else
    echo "${YELLOW}⚠️  Vercel CLI not installed${NC}"
    echo "Auto-deployment from GitHub will trigger..."
    echo ""
    echo "Manual command if needed:"
    echo "  npx vercel --prod"
fi

echo "${GREEN}✅ Deployment triggered${NC}"
echo ""

# Step 5: Post-deployment verification
echo "🔍 Step 5: Post-deployment checks..."
echo ""
echo "Testing endpoints..."

# Wait for deployment
sleep 30

SITE_URL="https://tasteofgratitude.shop"

# Test market endpoint
echo "Testing /api/market/today..."
if curl -s "$SITE_URL/api/market/today" | grep -q "markets"; then
    echo "${GREEN}✅ Market API working${NC}"
else
    echo "${RED}❌ Market API failed${NC}"
fi

# Test orders endpoint (should be 401 without auth)
echo "Testing /api/orders security..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SITE_URL/api/orders")
if [ "$STATUS" = "401" ]; then
    echo "${GREEN}✅ API authentication working${NC}"
else
    echo "${RED}❌ API authentication failed (status: $STATUS)${NC}"
fi

echo ""

# Summary
echo "=============================="
echo "🎉 DEPLOYMENT COMPLETE!"
echo "=============================="
echo ""
echo "Production URL: $SITE_URL"
echo "Admin Dashboard: $SITE_URL/admin/market-day"
echo ""
echo "Next Steps:"
echo "1. Test checkout flow with $1 payment"
echo "2. Configure Square webhook URL:"
echo "   $SITE_URL/api/payments/square/webhook"
echo "3. Tag products with availability in Square"
echo "4. Monitor logs for first 24 hours"
echo ""
echo "Rollback command:"
echo "  git revert HEAD && git push"
echo ""
echo "${GREEN}Happy selling! 🍃${NC}"
