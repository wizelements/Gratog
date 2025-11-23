#!/bin/bash
# deployment-diagnostics.sh
# Run this to check if the app is deployment-ready

echo "🔍 Taste of Gratitude - Deployment Diagnostics"
echo "================================================"
echo ""

# Check if running in correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Must run from /app directory"
    exit 1
fi

# Check Node/Yarn versions
echo "📦 Environment Check:"
node --version
yarn --version
echo ""

# Check if .env exists
echo "🔐 Environment Variables:"
if [ -f ".env" ]; then
    echo "✅ .env file exists"
    
    # Check critical variables (without exposing values)
    if grep -q "MONGO_URL=" .env; then
        MONGO_VALUE=$(grep "MONGO_URL=" .env | cut -d'=' -f2)
        if [[ $MONGO_VALUE == *"localhost"* ]]; then
            echo "⚠️  MONGO_URL set to localhost (OK for local, WILL FAIL in preview)"
        elif [[ $MONGO_VALUE == mongodb+srv* ]]; then
            echo "✅ MONGO_URL is cloud connection"
        else
            echo "❓ MONGO_URL format unknown"
        fi
    else
        echo "❌ MONGO_URL not found"
    fi
    
    if grep -q "JWT_SECRET=" .env; then
        echo "✅ JWT_SECRET is set"
    else
        echo "⚠️  JWT_SECRET not set (auth will fail)"
    fi
    
    if grep -q "NEXT_PUBLIC_BASE_URL=" .env; then
        echo "✅ NEXT_PUBLIC_BASE_URL is set"
    else
        echo "⚠️  NEXT_PUBLIC_BASE_URL not set"
    fi
else
    echo "❌ .env file not found"
fi
echo ""

# Test MongoDB connection
echo "🗄️  Database Connection Test:"
if command -v mongosh &> /dev/null; then
    MONGO_URL=$(grep "MONGO_URL=" .env | cut -d'=' -f2)
    timeout 5 mongosh "$MONGO_URL" --eval "db.adminCommand('ping')" &> /dev/null
    if [ $? -eq 0 ]; then
        echo "✅ MongoDB connection successful"
    else
        echo "❌ MongoDB connection failed"
    fi
else
    echo "⚠️  mongosh not installed, skipping connection test"
fi
echo ""

# Check if dependencies are installed
echo "📚 Dependencies:"
if [ -d "node_modules" ]; then
    echo "✅ node_modules exists"
else
    echo "❌ node_modules not found - run 'yarn install'"
fi
echo ""

# Run lint
echo "🔍 Linting:"
yarn lint 2>&1 | tail -5
echo ""

# Check if build works
echo "🏗️  Build Test:"
echo "   Running production build..."
yarn build > /tmp/build.log 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Build successful"
    echo "   Build output:"
    tail -20 /tmp/build.log
else
    echo "❌ Build failed"
    echo "   Last 20 lines of build log:"
    tail -20 /tmp/build.log
    echo ""
    echo "   Full log saved to /tmp/build.log"
fi
echo ""

# Check critical files
echo "📁 Critical Files:"
FILES=("next.config.js" "vercel.json" "package.json" "app/layout.js" "lib/cart-engine.js" "components/FloatingCart.jsx")
for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file missing"
    fi
done
echo ""

# Check if local server is running
echo "🌐 Local Server Check:"
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Server is running on port 3000"
    
    # Test API endpoint
    API_RESPONSE=$(curl -s http://localhost:3000/api/products)
    if echo "$API_RESPONSE" | grep -q "success"; then
        PRODUCT_COUNT=$(echo "$API_RESPONSE" | grep -o '"count":[0-9]*' | grep -o '[0-9]*')
        echo "✅ Products API working - $PRODUCT_COUNT products found"
    else
        echo "⚠️  Products API returned unexpected response"
    fi
else
    echo "⚠️  Server not running (start with 'yarn dev')"
fi
echo ""

# Summary
echo "📊 Deployment Readiness Summary:"
echo "================================"

# Count issues
ERRORS=0
WARNINGS=0

if [ ! -f ".env" ]; then
    ((ERRORS++))
fi

if ! grep -q "JWT_SECRET=" .env 2>/dev/null; then
    ((WARNINGS++))
fi

MONGO_VALUE=$(grep "MONGO_URL=" .env 2>/dev/null | cut -d'=' -f2)
if [[ $MONGO_VALUE == *"localhost"* ]]; then
    ((WARNINGS++))
fi

if [ ! -d "node_modules" ]; then
    ((ERRORS++))
fi

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo "✅ Ready for deployment!"
elif [ $ERRORS -eq 0 ]; then
    echo "⚠️  Ready with warnings ($WARNINGS warnings)"
    echo "   Review warnings above - deployment may work but some features might fail"
else
    echo "❌ NOT ready for deployment ($ERRORS errors, $WARNINGS warnings)"
    echo "   Fix errors above before deploying"
fi

echo ""
echo "📖 For preview deployment issues, see: PREVIEW_DEPLOYMENT_FIX.md"
echo "📖 For Phase 4 bug fixes, see: PHASE_4_BUG_FIXES_COMPLETE.md"
