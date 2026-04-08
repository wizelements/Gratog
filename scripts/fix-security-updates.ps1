# Gratog Security & Dependency Fix Script
# Run this in PowerShell from the gratog directory

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "    Gratog Security Fix Script" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Critical Security Updates
Write-Host "🔴 STEP 1: Installing Critical Security Updates..." -ForegroundColor Yellow

Write-Host "   → Updating Next.js to 15.5.15..." -ForegroundColor Gray
npm install next@15.5.15 --save --legacy-peer-deps

Write-Host "   → Running npm audit fix..." -ForegroundColor Gray
npm audit fix --legacy-peer-deps

# Step 2: High Priority Dependency Updates
Write-Host ""
Write-Host "🟠 STEP 2: High Priority Dependency Updates..." -ForegroundColor Yellow

Write-Host "   → Updating undici..." -ForegroundColor Gray
npm update undici --legacy-peer-deps

Write-Host "   → Updating ws..." -ForegroundColor Gray  
npm update ws --legacy-peer-deps

Write-Host "   → Updating lodash..." -ForegroundColor Gray
npm update lodash --legacy-peer-deps

Write-Host "   → Updating flatted..." -ForegroundColor Gray
npm update flatted --legacy-peer-deps

Write-Host "   → Updating picomatch..." -ForegroundColor Gray
npm update picomatch --legacy-peer-deps

Write-Host "   → Updating path-to-regexp..." -ForegroundColor Gray
npm update path-to-regexp --legacy-peer-deps

Write-Host "   → Updating dompurify..." -ForegroundColor Gray
npm update dompurify --legacy-peer-deps

# Step 3: Major Package Updates
Write-Host ""
Write-Host "🟡 STEP 3: Major Package Updates..." -ForegroundColor Yellow

Write-Host "   → Updating @stripe/stripe-js..." -ForegroundColor Gray
npm install @stripe/stripe-js@latest --save --legacy-peer-deps

Write-Host "   → Updating stripe..." -ForegroundColor Gray
npm install stripe@latest --save --legacy-peer-deps

Write-Host "   → Updating square..." -ForegroundColor Gray
npm install square@latest --save --legacy-peer-deps

Write-Host "   → Updating mongodb..." -ForegroundColor Gray
npm install mongodb@latest --save --legacy-peer-deps

Write-Host "   → Updating recharts..." -ForegroundColor Gray
npm install recharts@latest --save --legacy-peer-deps

Write-Host "   → Updating sharp..." -ForegroundColor Gray
npm install sharp@latest --save --legacy-peer-deps

Write-Host "   → Updating axios..." -ForegroundColor Gray
npm install axios@latest --save --legacy-peer-deps

Write-Host "   → Updating jose..." -ForegroundColor Gray
npm install jose@latest --save --legacy-peer-deps

Write-Host "   → Updating framer-motion..." -ForegroundColor Gray
npm install framer-motion@latest --save --legacy-peer-deps

Write-Host "   → Updating @sentry/nextjs..." -ForegroundColor Gray
npm install @sentry/nextjs@latest --save --legacy-peer-deps

Write-Host "   → Updating resend..." -ForegroundColor Gray
npm install resend@latest --save --legacy-peer-deps

Write-Host "   → Updating lucide-react..." -ForegroundColor Gray
npm install lucide-react@latest --save --legacy-peer-deps

# Step 4: Dev Dependencies
Write-Host ""
Write-Host "🟢 STEP 4: Dev Dependency Updates..." -ForegroundColor Yellow

Write-Host "   → Updating @types/node..." -ForegroundColor Gray
npm install @types/node@latest --save-dev --legacy-peer-deps

Write-Host "   → Updating @types/react..." -ForegroundColor Gray
npm install @types/react@latest --save-dev --legacy-peer-deps

Write-Host "   → Updating @types/react-dom..." -ForegroundColor Gray
npm install @types/react-dom@latest --save-dev --legacy-peer-deps

Write-Host "   → Updating postcss..." -ForegroundColor Gray
npm install postcss@latest --save-dev --legacy-peer-deps

Write-Host "   → Updating autoprefixer..." -ForegroundColor Gray
npm install autoprefixer@latest --save-dev --legacy-peer-deps

# Step 5: Cleanup
Write-Host ""
Write-Host "🧹 STEP 5: Cleanup..." -ForegroundColor Yellow

Write-Host "   → Running npm dedupe..." -ForegroundColor Gray
npm dedupe --legacy-peer-deps

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host "    Fix Script Complete!" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Review git diff for package.json changes" -ForegroundColor White
Write-Host "  2. Run 'npm run lint' to verify no new issues" -ForegroundColor White
Write-Host "  3. Run 'npm run build' to verify build works" -ForegroundColor White
Write-Host "  4. Run 'npm run test:unit' for unit tests" -ForegroundColor White
Write-Host "  5. Commit changes with: git commit -m 'security: update dependencies'" -ForegroundColor White
Write-Host ""
Write-Host "Note: Vitest 2.x → 4.x upgrade requires manual migration" -ForegroundColor Yellow
Write-Host "      Run: npm install vitest@latest @vitest/coverage-v8@latest --save-dev" -ForegroundColor Yellow
Write-Host ""
