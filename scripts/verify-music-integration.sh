#!/bin/bash
# Verify Music Integration Setup

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

echo "========================================"
echo "Music Integration Verification"
echo "========================================"
echo ""

# Check 1: Directory structure
echo "Checking directory structure..."
for dir in "public/music/masters" "public/music/snippets/that-gratitude" "public/music/snippets/cant-let-it-go" "public/music/snippets/under-covers" "src/contexts" "src/lib/music" "src/components" "scripts"; do
  if [ -d "$PROJECT_DIR/$dir" ]; then
    echo "  ✓ $dir"
    ((PASS_COUNT++))
  else
    echo "  ✗ $dir (missing)"
    ((FAIL_COUNT++))
  fi
done

echo ""
echo "Checking audio files..."
# Check 2: WAV files
for file in "Can't Let It Go.wav" "That Gratitude (Remastered).wav" "Under the Covers (Remastered).wav"; do
  if [ -f "$PROJECT_DIR/public/music/masters/$file" ]; then
    size=$(du -h "$PROJECT_DIR/public/music/masters/$file" | cut -f1)
    echo "  ✓ $file ($size)"
    ((PASS_COUNT++))
  else
    echo "  ✗ $file (missing)"
    ((FAIL_COUNT++))
  fi
done

echo ""
echo "Checking MP3 files..."
# Check 3: MP3 files
for file in "That Gratitude (Remastered).mp3" "Can't Let It Go.mp3" "Under the Covers (Remastered).mp3"; do
  if [ -f "$PROJECT_DIR/public/music/masters/$file" ]; then
    size=$(du -h "$PROJECT_DIR/public/music/masters/$file" | cut -f1)
    echo "  ✓ $file ($size)"
    ((PASS_COUNT++))
  else
    echo "  ⚠ $file (not yet created)"
    ((WARN_COUNT++))
  fi
done

echo ""
echo "Checking snippets..."
# Check 4: Snippets
snippet_count=$(find "$PROJECT_DIR/public/music/snippets" -name "*.mp3" 2>/dev/null | wc -l)
echo "  Found $snippet_count snippets"
if [ "$snippet_count" -ge 9 ]; then
  echo "  ✓ Sufficient snippets (target: 12)"
  ((PASS_COUNT++))
else
  echo "  ⚠ Low snippet count (found: $snippet_count, target: 12)"
  ((WARN_COUNT++))
fi

echo ""
echo "Checking React components..."
# Check 5: React files
for file in "contexts/MusicContext.tsx" "components/BackgroundMusic.tsx" "components/MusicControls.tsx" "lib/music/snippetDatabase.ts"; do
  if [ -f "$PROJECT_DIR/src/$file" ]; then
    echo "  ✓ $file"
    ((PASS_COUNT++))
  else
    echo "  ✗ $file (missing)"
    ((FAIL_COUNT++))
  fi
done

echo ""
echo "Checking app layout integration..."
# Check 6: Layout integration
if grep -q "MusicProvider" "$PROJECT_DIR/app/layout.js"; then
  echo "  ✓ MusicProvider imported"
  ((PASS_COUNT++))
else
  echo "  ✗ MusicProvider not imported"
  ((FAIL_COUNT++))
fi

if grep -q "BackgroundMusic" "$PROJECT_DIR/app/layout.js"; then
  echo "  ✓ BackgroundMusic imported"
  ((PASS_COUNT++))
else
  echo "  ✗ BackgroundMusic not imported"
  ((FAIL_COUNT++))
fi

if grep -q "MusicControls" "$PROJECT_DIR/app/layout.js"; then
  echo "  ✓ MusicControls imported"
  ((PASS_COUNT++))
else
  echo "  ✗ MusicControls not imported"
  ((FAIL_COUNT++))
fi

echo ""
echo "Checking configuration..."
# Check 7: Config
if [ -f "$PROJECT_DIR/.musicrc.json" ]; then
  echo "  ✓ .musicrc.json found"
  ((PASS_COUNT++))
else
  echo "  ⚠ .musicrc.json not found"
  ((WARN_COUNT++))
fi

echo ""
echo "========================================"
echo "Verification Summary"
echo "========================================"
echo "✓ Passed: $PASS_COUNT"
echo "⚠ Warnings: $WARN_COUNT"
echo "✗ Failed: $FAIL_COUNT"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
  echo "✓ Integration ready for deployment"
  exit 0
else
  echo "✗ Some checks failed. Please review."
  exit 1
fi
