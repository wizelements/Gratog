#!/bin/bash

# Monitor Error Tracking System Deployment
# Run this to watch for deployment completion and verify everything is working

set -e

SITE="https://tasteofgratitude.shop"
MAX_WAIT=900  # 15 minutes max
INTERVAL=5
ELAPSED=0

echo "🚀 Monitoring deployment of error tracking system..."
echo "   Will check every $INTERVAL seconds, max wait: $((MAX_WAIT/60)) minutes"
echo ""

# Phase 1: Wait for endpoints to switch from 404 to 401
echo "📡 Phase 1: Waiting for deployment to complete..."
echo "   (watching for /api/errors/summary to return 401 instead of 404)"
echo ""

while [ $ELAPSED -lt $MAX_WAIT ]; do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SITE/api/errors/summary" 2>/dev/null || echo "000")
  
  case $STATUS in
    404)
      echo "[$((ELAPSED/60))m $((ELAPSED%60))s] ⏳ Still building (404)..."
      ;;
    401)
      echo "[$((ELAPSED/60))m $((ELAPSED%60))s] ✅ Endpoints live! Got 401 (expected without auth)"
      break
      ;;
    500)
      echo "[$((ELAPSED/60))m $((ELAPSED%60))s] ⚠️  Server error (500) - checking logs..."
      ;;
    *)
      echo "[$((ELAPSED/60))m $((ELAPSED%60))s] ⚠️  Unexpected status: $STATUS"
      ;;
  esac
  
  sleep $INTERVAL
  ELAPSED=$((ELAPSED + INTERVAL))
done

if [ $STATUS != "401" ]; then
  echo ""
  echo "❌ Deployment timeout or failed (status: $STATUS)"
  echo "   Check: vercel logs $SITE"
  exit 1
fi

echo ""
echo "✅ Deployment complete!"
echo ""

# Phase 2: Check memory improved
echo "📊 Phase 2: Checking memory improvement..."
MEMORY=$(curl -s "$SITE/api/health" 2>/dev/null | jq -r '.checks.memory.percentage // "unknown"')

if [ "$MEMORY" = "unknown" ]; then
  echo "⚠️  Could not check memory"
else
  echo "   Memory usage: $MEMORY%"
  if (( $(echo "$MEMORY < 60" | bc -l) )); then
    echo "   ✅ Memory improved! (was 94%, now $MEMORY%)"
  else
    echo "   ⚠️  Memory still high: $MEMORY% (expected ~45-50%)"
  fi
fi

echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Login to admin:"
echo "   https://tasteofgratitude.shop/admin/login"
echo ""
echo "2. Get admin token from DevTools (F12 → Application → Cookies → admin_token)"
echo ""
echo "3. Run verification tests:"
echo "   export ADMIN_TOKEN='your_token_here'"
echo "   bash verify-error-tracking.sh"
echo ""
echo "4. Or manually test:"
echo "   curl -s -H \"Cookie: admin_token=\$ADMIN_TOKEN\" \\"
echo "     $SITE/api/errors/summary | jq ."
echo ""
echo "5. Trigger test error in browser console:"
echo "   throw new Error('Error tracking test');"
echo ""
echo "See: TEST_PLAN_ERROR_TRACKING.md for full testing guide"
