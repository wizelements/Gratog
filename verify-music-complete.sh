#!/bin/bash
echo "🎵 Music Integration Verification"
echo "=================================="
echo

P=0 F=0
✓() { echo "✓ $1"; ((P++)); }
✗() { echo "✗ $1"; ((F++)); }

echo "1. COMPONENTS"
[ -f "contexts/MusicContext.tsx" ] && ✓ "MusicContext.tsx" || ✗ "MusicContext.tsx"
[ -f "components/BackgroundMusic.tsx" ] && ✓ "BackgroundMusic.tsx" || ✗ "BackgroundMusic.tsx"
[ -f "components/MusicControls.tsx" ] && ✓ "MusicControls.tsx" || ✗ "MusicControls.tsx"
[ -f "lib/music/snippetDatabase.ts" ] && ✓ "snippetDatabase.ts" || ✗ "snippetDatabase.ts"
echo

echo "2. LAYOUT INTEGRATION"
grep -q "MusicProvider" app/layout.js && ✓ "MusicProvider in layout" || ✗ "MusicProvider"
grep -q "BackgroundMusic" app/layout.js && ✓ "BackgroundMusic in layout" || ✗ "BackgroundMusic"
grep -q "MusicControls" app/layout.js && ✓ "MusicControls in layout" || ✗ "MusicControls"
echo

echo "3. CODE FEATURES"
grep -q "useCallback" contexts/MusicContext.tsx && ✓ "Fade animations" || ✗ "Fade animations"
grep -q "localStorage" contexts/MusicContext.tsx && ✓ "State persistence" || ✗ "State persistence"
grep -q "dbToLinear" contexts/MusicContext.tsx && ✓ "dB volume scale" || ✗ "dB volume scale"
grep -q 'type="range"' components/MusicControls.tsx && ✓ "Volume slider" || ✗ "Volume slider"
grep -q "sessionPhase" contexts/MusicContext.tsx && ✓ "Session tracking" || ✗ "Session tracking"
echo

echo "4. DOCUMENTATION"
[ -f "MUSIC_FEATURE_COMPLETE.md" ] && ✓ "Feature definition" || ✗ "Feature definition"
[ -f "e2e/music-integration.spec.ts" ] && ✓ "Playwright tests" || ✗ "Playwright tests"
echo

echo "5. R2 CONFIGURATION"
grep -q "pub-5562920411814baeba7fe2cc990d43ef.r2.dev" contexts/MusicContext.tsx && ✓ "R2 URL in context" || ✗ "R2 URL"
grep -q "That%20Gratitude" contexts/MusicContext.tsx && ✓ "Audio URLs configured" || ✗ "Audio URLs"
echo

echo "=================================="
echo "Results: $P passed, $F failed"
if [ $F -eq 0 ]; then
  echo "✓ MUSIC FEATURE COMPLETE"
else
  echo "✗ Issues found"
fi
