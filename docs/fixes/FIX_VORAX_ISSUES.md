# VORAX Issues Fix Guide

## Priority 1: HIGH (15 issues) - Security & Accessibility

### 1. dangerouslySetInnerHTML Security Issues (8 files)
These are **SAFE** usages because:
- All use JSON.stringify() which escapes all special characters
- Content is in `<script type="application/ld+json">` tags (not executable)
- Data comes from controlled schema generators, not user input

**Files to add security comments:**
- ✅ `/lib/seo/structured-data.tsx` - Lines 264-275
- ✅ `/components/SEOHead.tsx` - Lines 27-31
- ⚠️ `/app/layout.js` - Line 104
- ⚠️ `/app/page.js` - Lines 144, 149
- ⚠️ `/app/(site)/instagram/[slug]/page.tsx`
- ⚠️ `/app/product/[slug]/page.js`
- ⚠️ `/components/IngredientsSchema.tsx`
- ⚠️ `/components/ui/chart.jsx`

**Fix:** Add TypeScript comments explaining why it's safe.

### 2. Missing Image Alt Attributes (5 issues)
- `/components/FloatingCart.jsx` - Line 200
- `/components/MarketPassport.jsx` - Line 191
- `/components/ProductQuickView.jsx` - Line 79
- `/components/SearchEnhanced.jsx` - Line 270
- `/components/cart/EnhancedFloatingCart.jsx` - Line 243

**Fix:** Add descriptive alt text to img tags.

### 3. Missing Form Labels (1 issue)
- `/components/ui/input.jsx`

**Fix:** Add aria-label or label element.

### 4. Accessibility Score: 0/100 (Multiple issues)
- Add ARIA labels to interactive elements
- Add semantic HTML (use <button> instead of <div onclick>)
- Ensure focus indicators are visible

---

## Priority 2: MEDIUM (241 issues)

### TypeScript Errors (10 issues)
- Need to fix Radix UI prop types
- Components likely have incorrect prop spread

### Console.log in Production (40+ issues)
- Replace with proper logging utility
- Or wrap in `if (DEBUG)` checks

### Missing Alt Text & Accessibility
- 70+ accessibility warnings
- Small tap targets (< 44x44px)
- Missing button types
- Very small text (text-xs)

### Error Logging Without Stack Traces (100+ issues)
- Replace `console.error('message')` with `console.error(error.stack)`

### Marketing Issues (8 issues)
- Urgency overload in components
- False scarcity claims

---

## Fix Strategy

### Phase 1: Quick Wins (Security)
1. Add security comments to dangerouslySetInnerHTML usages
2. Add missing alt attributes to images
3. Add aria-labels to form inputs

### Phase 2: Accessibility
1. Fix missing button types
2. Increase small tap targets
3. Add proper ARIA labels

### Phase 3: Logging
1. Create a debug utility wrapper
2. Replace console.log with proper logging
3. Ensure errors include stack traces

### Phase 4: TypeScript
1. Fix Radix UI component prop types
2. Remove `as any` assertions

---

## Quick Fix Commands

```bash
# 1. Find all dangerouslySetInnerHTML usages
grep -r "dangerouslySetInnerHTML" src/ --include="*.tsx" --include="*.jsx"

# 2. Find images without alt attributes
grep -r '<img' src/ --include="*.tsx" --include="*.jsx" | grep -v 'alt='

# 3. Find console.log calls
grep -r "console\.log" src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx"

# 4. Find inputs without labels
grep -r '<input' src/ --include="*.tsx" --include="*.jsx" | grep -v 'aria-label' | grep -v '<label'
```

---

## Files Status

### Completed ✅
- [x] `/lib/seo/structured-data.tsx` - Already has security comments
- [x] `/components/SEOHead.tsx` - Already has security comments

### Need Fixes 🔴
- [ ] All other dangerouslySetInnerHTML files - Add comments
- [ ] 5 img tags - Add alt attributes
- [ ] 40+ console.log calls - Add guards or replace
- [ ] 100+ error logs - Add error.stack
- [ ] 10+ TypeScript errors - Fix component props
