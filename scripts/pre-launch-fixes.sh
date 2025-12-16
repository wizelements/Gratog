#!/bin/bash
# Pre-Launch Quick Fixes Script
# Run this before deploying to fix critical issues

set -e

echo "🚀 TASTE OF GRATITUDE - PRE-LAUNCH FIXES"
echo "=========================================="
echo ""

# 1. Install dependencies
echo "📦 Step 1: Installing dependencies..."
npm install
echo "✅ Dependencies installed"
echo ""

# 2. Delete broken files
echo "🗑️  Step 2: Removing broken/unused files..."
if [ -f "app/api/orders/create/route.js.OLD" ]; then
    rm app/api/orders/create/route.js.OLD
    echo "   Deleted route.js.OLD"
fi

if [ -f "app/api/orders/create/route.js.broken" ]; then
    rm app/api/orders/create/route.js.broken
    echo "   Deleted route.js.broken"
fi

if [ -f "app/(admin)/admin/catalog/page.js.unused" ]; then
    rm "app/(admin)/admin/catalog/page.js.unused"
    echo "   Deleted page.js.unused"
fi
echo "✅ Cleanup complete"
echo ""

# 3. Test build
echo "🔨 Step 3: Testing build..."
npm run build
if [ $? -eq 0 ]; then
    echo "✅ Build successful!"
else
    echo "❌ Build failed - fix errors before deploying"
    exit 1
fi
echo ""

# 4. Check for environment variables
echo "🔍 Step 4: Checking environment variables..."
REQUIRED_VARS=(
    "MONGO_URL"
    "SQUARE_ACCESS_TOKEN"
    "SQUARE_LOCATION_ID"
    "JWT_SECRET"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -eq 0 ]; then
    echo "✅ All required environment variables set"
else
    echo "⚠️  Missing environment variables (set in Vercel):"
    for var in "${MISSING_VARS[@]}"; do
        echo "   - $var"
    done
fi
echo ""

# 5. Run linter
echo "🧹 Step 5: Running linter..."
npm run lint -- --quiet || echo "⚠️  Linting warnings (non-blocking)"
echo ""

echo "=========================================="
echo "✅ PRE-LAUNCH FIXES COMPLETE!"
echo ""
echo "Next steps:"
echo "1. Set environment variables in Vercel (if any missing)"
echo "2. Deploy: git push origin main"
echo "3. Test live site using PRE_LAUNCH_CHECKLIST.md"
echo ""
echo "🎉 Ready to ship!"
