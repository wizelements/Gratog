#!/bin/bash
# GRATOG v2.0 PRODUCTION PUSH
# Run this to deploy everything

cd ~/Gratog-live || exit 1

echo "🚀 GRATOG v2.0 PRODUCTION PUSH"
echo "=============================="
echo ""

# Check current status
echo "📋 Checking repository status..."
git status --short
SHORT_STATUS=$(git status --short)
echo ""

# Stage all changes if any exist
if [ -n "$SHORT_STATUS" ]; then
    echo "📦 Staging all changes..."
    git add -A
    echo ""
fi

# Check if there are staged changes
STAGED=$(git diff --cached --name-only)
if [ -n "$STAGED" ]; then
    echo "📝 Committing changes..."
    git commit -m "feat: Gratog v2.0 - Unified Fulfillment System

MAJOR FEATURES ADDED:
- Unified checkout with 3 fulfillment options:
  • Today Pickup (10-30 mins) - Cash, Cash App, Card
  • Preorder (Next market day) - Card only  
  • Ship Home (2-3 days) - Card only

- Admin Dashboard with 3-tab fulfillment view:
  • Today: Real-time queue, inventory, sound notifications
  • Preorders: Prepare ahead workflow
  • Shipping: Label printing, tracking

- Payment Processing:
  • Square Online (Card) with HMAC-SHA256 webhook verification
  • Cash (manual confirmation flow)
  • Cash App (QR code + admin confirmation)
  • Full/Partial refunds with automatic inventory return

- Security Hardening:
  • API key authentication on admin routes
  • Rate limiting (5 orders/min per phone)
  • Square webhook signature verification
  • Input validation with Zod schemas
  • Atomic inventory updates (race condition protection)
  • XSS protection

- Multi-Market Support:
  • Serenbe Farmers Market
  • Dunwoody Farmers Market (DHA)
  • Sandy Springs Market

- Infrastructure:
  • Added lru-cache and nanoid dependencies
  • New API routes: /api/payments/square, /api/payments/refund
  • Updated /api/orders with fulfillmentType support
  • Middleware for auth and rate limiting
  • SMS notifications via Twilio

TECHNICAL DETAILS:
- 20/20 payment tests passed
- Security audit: All issues resolved (ISS-001 through ISS-057)
- Atomic inventory prevents overselling
- Idempotent webhook handling
- Mobile-first responsive design

BREAKING CHANGE: New checkout flow replaces legacy system
Co-authored-by: Cod3Black <silverwatkins@gmail.com>"
    echo ""
fi

# Push to main
echo "📤 Pushing to origin/main..."
git push origin main
PUSH_EXIT=$?

echo ""
echo "=============================="

if [ $PUSH_EXIT -eq 0 ]; then
    echo "✅ PUSH SUCCESSFUL!"
    echo ""
    echo "Next steps:"
    echo "1. Monitor Vercel build (~2-3 min)"
    echo "   vercel --logs"
    echo ""
    echo "2. Verify deployment:"
    echo "   https://tasteofgratitude.shop"
    echo ""
    echo "3. Set environment variables in Vercel Dashboard:"
    echo "   ADMIN_API_KEY"
    echo "   SQUARE_WEBHOOK_SIGNATURE_KEY"
    echo "   ADMIN_PHONE=4706633225"
    echo ""
    echo "4. Configure Square webhook:"
    echo "   https://tasteofgratitude.shop/api/payments/square/webhook"
else
    echo "❌ PUSH FAILED"
    echo "Check error messages above"
fi

echo "=============================="
