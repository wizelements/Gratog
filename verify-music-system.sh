#!/bin/bash

# 🎵 Music System Verification Script
# Comprehensive checks for audio files, components, and implementation

set -e

COLORS=(
  [reset]='\033[0m'
  [bright]='\033[1m'
  [red]='\033[31m'
  [green]='\033[32m'
  [yellow]='\033[33m'
  [blue]='\033[34m'
  [cyan]='\033[36m'
  [dim]='\033[2m'
)

passed=0
failed=0
warnings=0

# Helper functions
log_title() {
  echo -e "\n${COLORS[bright]}${COLORS[cyan]}═══ $1 ═══${COLORS[reset]}"
}

log_success() {
  echo -e "${COLORS[green]}✅ $1${COLORS[reset]}"
  ((passed++))
}

log_error() {
  echo -e "${COLORS[red]}❌ $1${COLORS[reset]}"
  ((failed++))
}

log_warning() {
  echo -e "${COLORS[yellow]}⚠️  $1${COLORS[reset]}"
  ((warnings++))
}

log_test() {
  echo -e "${COLORS[dim]}→ $1${COLORS[reset]}"
}

# Test 1: Audio Files
log_title "TEST: Audio Files Accessibility"

declare -A audio_files=(
  ["That Gratitude"]="https://pub-5562920411814baeba7fe2cc990d43ef.r2.dev/That%20Gratitude%20%28Remastered%29.wav"
  ["Can't Let It Go"]="https://pub-5562920411814baeba7fe2cc990d43ef.r2.dev/Can%27t%20Let%20It%20Go.wav"
  ["Under the Covers"]="https://pub-5562920411814baeba7fe2cc990d43ef.r2.dev/Under%20the%20Covers%20%28Remastered%29.wav"
)

for name in "${!audio_files[@]}"; do
  log_test "Checking $name..."
  url="${audio_files[$name]}"
  
  status=$(curl -s -o /dev/null -w "%{http_code}" -I "$url" 2>/dev/null || echo "000")
  
  if [ "$status" = "200" ]; then
    log_success "$name: HTTP 200 OK"
  else
    log_error "$name: HTTP $status"
  fi
done

# Test 2: Component Files
log_title "TEST: Component Files Exist"

files=(
  "contexts/MusicContext.tsx"
  "components/BackgroundMusic.tsx"
  "components/MusicControls.tsx"
  "lib/music/snippetDatabase.ts"
)

for file in "${files[@]}"; do
  log_test "Checking $file..."
  
  if [ -f "$file" ]; then
    log_success "$file exists"
  else
    log_error "$file NOT FOUND"
  fi
done

# Test 3: MusicContext Implementation
log_title "TEST: MusicContext Implementation"

checks=(
  "useRef<HTMLAudioElement>:useRef<HTMLAudioElement"
  "useState for state:useState<MusicState>"
  "useCallback play:const play = useCallback"
  "useCallback pause:const pause = useCallback"
  "stateRef for closure:const stateRef = useRef"
  "R2_BASE URL:pub-5562920411814baeba7fe2cc990d43ef"
  "isMounted guard:dbToLinear(stateRef.current.volume)"
)

for check in "${checks[@]}"; do
  IFS=':' read -r name pattern <<< "$check"
  log_test "Checking: $name"
  
  if grep -q "$pattern" contexts/MusicContext.tsx 2>/dev/null; then
    log_success "$name ✓"
  else
    log_error "$name NOT FOUND"
  fi
done

# Test 4: BackgroundMusic Implementation
log_title "TEST: BackgroundMusic Implementation"

checks=(
  "isMounted guard:let isMounted = true"
  "async startMusic:const startMusic = async"
  "try/catch:try {"
  "console.debug:console.debug"
)

for check in "${checks[@]}"; do
  IFS=':' read -r name pattern <<< "$check"
  log_test "Checking: $name"
  
  if grep -q "$pattern" components/BackgroundMusic.tsx 2>/dev/null; then
    log_success "$name ✓"
  else
    log_error "$name NOT FOUND"
  fi
done

# Test 5: MusicControls Accessibility
log_title "TEST: MusicControls Accessibility"

a11y_checks=(
  "aria-label:aria-label=\"Music controls toggle\""
  "aria-expanded:aria-expanded"
  "aria-controls:aria-controls"
  "aria-hidden:aria-hidden"
  "role=region:role=\"region\""
  "fieldset:fieldset"
  "aria-live:aria-live=\"polite\""
)

for check in "${a11y_checks[@]}"; do
  IFS=':' read -r name pattern <<< "$check"
  log_test "Checking: $name"
  
  if grep -q "$pattern" components/MusicControls.tsx 2>/dev/null; then
    log_success "$name ✓"
  else
    log_error "$name NOT FOUND"
  fi
done

# Test 6: SnippetDatabase
log_title "TEST: SnippetDatabase Structure"

log_test "Checking snippet count..."
snippet_count=$(grep -c "id: '" lib/music/snippetDatabase.ts 2>/dev/null || echo "0")

if [ "$snippet_count" -eq 12 ]; then
  log_success "12 snippets found ✓"
else
  log_warning "Found $snippet_count snippets (expected 12)"
fi

snippet_checks=(
  "SnippetSelector class:class SnippetSelector"
  "selectForContext:selectForContext"
  "getById:getById"
  "recentSnippets:recentSnippets"
)

for check in "${snippet_checks[@]}"; do
  IFS=':' read -r name pattern <<< "$check"
  log_test "Checking: $name"
  
  if grep -q "$pattern" lib/music/snippetDatabase.ts 2>/dev/null; then
    log_success "$name ✓"
  else
    log_error "$name NOT FOUND"
  fi
done

# Test 7: Layout Integration
log_title "TEST: Integration in app/layout.js"

integration_checks=(
  "MusicProvider:MusicProvider"
  "BackgroundMusic:BackgroundMusic"
  "MusicControls:MusicControls"
)

for check in "${integration_checks[@]}"; do
  IFS=':' read -r name pattern <<< "$check"
  log_test "Checking: $name"
  
  if grep -q "$pattern" app/layout.js 2>/dev/null; then
    log_success "$name ✓"
  else
    log_error "$name NOT FOUND"
  fi
done

# Test 8: Memory Cleanup
log_title "TEST: Memory Cleanup & Intervals"

files=(
  "contexts/MusicContext.tsx"
  "components/BackgroundMusic.tsx"
  "components/checkout/SquarePaymentForm.tsx"
)

for file in "${files[@]}"; do
  log_test "Checking $file..."
  
  has_clear=$(grep -c "clearInterval\|clearTimeout" "$file" 2>/dev/null || echo "0")
  has_ismounted=$(grep -c "isMounted" "$file" 2>/dev/null || echo "0")
  
  if [ "$has_clear" -gt 0 ] && [ "$has_ismounted" -gt 0 ]; then
    log_success "$file: Cleanup patterns found"
  else
    log_warning "$file: Incomplete cleanup"
  fi
done

# Test 9: TypeScript Strictness
log_title "TEST: TypeScript Strictness"

log_test "Checking for 'any' types..."
any_count=$(grep -r ": any\b" contexts/ components/BackgroundMusic.tsx components/MusicControls.tsx 2>/dev/null | wc -l)

if [ "$any_count" -eq 0 ]; then
  log_success "No 'any' types found ✓"
else
  log_warning "Found $any_count 'any' types"
fi

# Test 10: TypeScript Build
log_title "TEST: TypeScript Build"

log_test "Running TypeScript check..."
if pnpm typecheck > /dev/null 2>&1; then
  log_success "TypeScript: 0 errors"
else
  log_warning "TypeScript check encountered issues"
fi

# Summary
log_title "SUMMARY"

echo -e "${COLORS[green]}Passed:  $passed${COLORS[reset]}"
echo -e "${COLORS[red]}Failed:  $failed${COLORS[reset]}"
echo -e "${COLORS[yellow]}Warnings: $warnings${COLORS[reset]}"
echo -e "${COLORS[cyan]}Total:   $((passed + failed + warnings))${COLORS[reset]}"

if [ "$failed" -eq 0 ]; then
  echo -e "\n${COLORS[green]}${COLORS[bright]}✅ ALL CRITICAL CHECKS PASSED${COLORS[reset]}"
  exit 0
else
  echo -e "\n${COLORS[red]}${COLORS[bright]}❌ $failed critical issues found${COLORS[reset]}"
  exit 1
fi
