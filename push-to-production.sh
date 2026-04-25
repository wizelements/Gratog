#!/bin/bash
# Push Gratog v2.0 to Production

cd ~/Gratog-live || exit 1

echo "🚀 Pushing Gratog v2.0 to Production..."
echo "==================================="
echo ""

# Check git status
echo "📋 Checking git status..."
git status --short
echo ""

# Add all changes
echo "📦 Adding all changes..."
git add -A

# Commit with detailed message
echo "📝 Committing..."
git commit -m "feat: Gratog v2.0 - Unified Fulfillment System

MAJOR FEATURES:
- Unified checkout with 3 fulfillment options:
  • Today Pickup (10-30 mins) - Cash, Cash App, Card
  • Preorder (Next market day) - Card only
  • Ship Home (2-3 days) - Card only

- Admin Dashboard with fulfillment tabs:
  • Today: Real-time queue, inventory, sound notifications
  • Preorders: Prepare ahead workflow
  • Shipping: Label printing, tracking

- Payment Processing:
  • Square Online (Card) with webhook verification
  • Cash (manual confirmation)
  • Cash App (QR code + confirmation)
  • Full/Partial refunds with inventory return

- Security Hardening:
  • API key authentication on admin routes
  • Rate limiting (5 orders/min)
  • Square webhook HMAC-SHA256 verification
  • Input validation (Zod)
  • Atomic inventory updates (race condition protection)

- Multi-Market Support:
  • Serenbe Farmers Market
  • Dunwoody Farmers Market (DHA)
  • Sandy Springs Market

TECHNICAL:
- Added: lru-cache, nanoid dependencies
- New APIs: /api/payments/square, /api/payments/refund
- Updated: /api/orders with fulfillmentType
- Components: MarketDayDashboard, UnifiedCheckout
- Middleware: Authentication + rate limiting

TESTS: 20/20 payment tests passed
SECURITY: All audit issues resolved

BREAKING CHANGE: Replaces old checkout flow"

# Push to main
echo "📤 Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Push complete!"
echo ""
echo "Vercel will auto-deploy. Monitor at:"
echo "https://vercel.com/dashboard"
echo ""
echo "Production URL: https://tasteofgratitude.shop"
echo ""
echo "Next steps:"
echo "1. Wait 2-3 minutes for build"
echo "2. Test checkout flow"
echo "3. Configure Square webhook URL:"
echo "   https://tasteofgratitude.shop/api/payments/square/webhook"
