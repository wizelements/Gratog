# 🔬 E2E Testing Plan - Voracious Scrutiny Mode

**Tester**: Senior Expert Developer (Psychological Marketing & Optimization Specialist)  
**Date**: November 26, 2025  
**Scope**: Interactive Features + Trust Enhancements  
**Standard**: Production-Ready, Zero Tolerance for Bugs

---

## 🎯 Testing Philosophy

### Core Principles
1. **Extreme Scrutiny**: Every line, every interaction, every edge case
2. **Psychological Excellence**: User trust, engagement, delight at every touchpoint
3. **Performance Obsession**: Fast, smooth, optimized
4. **Playful Precision**: Fun to use, precise in execution

### What Gets Tested
- ✅ Functional correctness
- ✅ Edge cases & error states
- ✅ Performance & optimization
- ✅ Psychological triggers & trust signals
- ✅ Accessibility & UX
- ✅ Cross-browser compatibility
- ✅ Mobile responsiveness

---

## 📋 Test Suites

### Suite 1: Build & Type Safety
- [ ] TypeScript compilation (zero errors)
- [ ] Next.js build (zero errors)
- [ ] Bundle size analysis
- [ ] Dependency audit
- [ ] ESLint checks

### Suite 2: 3D/AR Viewer
- [ ] Component renders without errors
- [ ] Model loading states
- [ ] Error handling (missing models)
- [ ] Camera controls (rotate, zoom, pan)
- [ ] Fullscreen toggle
- [ ] AR mode availability
- [ ] Mobile touch interactions
- [ ] Performance (60fps rendering)
- [ ] Bundle lazy-loading

### Suite 3: Mini-Games
- [ ] BenefitSort: Drag-drop mechanics
- [ ] BenefitSort: Scoring logic
- [ ] BenefitSort: Timer accuracy
- [ ] BenefitSort: High score persistence
- [ ] IngredientRush: Tap detection
- [ ] IngredientRush: Lives system
- [ ] IngredientRush: Spawn rate progression
- [ ] IngredientRush: Accuracy calculation
- [ ] Audio feedback timing
- [ ] Game state cleanup
- [ ] Performance (60fps gameplay)

### Suite 4: Kiosk Mode
- [ ] Provider initialization
- [ ] Idle detection accuracy
- [ ] Auto-reset to /explore
- [ ] AttractMode display
- [ ] Touch interaction reset
- [ ] Wake Lock API (graceful degradation)
- [ ] Fullscreen API (graceful degradation)
- [ ] State cleanup on disable

### Suite 5: Trust Enhancements
- [ ] Currency formatting (all locales)
- [ ] SMS link generation
- [ ] Dynamic location data (Serenbe, Browns Mill)
- [ ] Square fulfillment creation
- [ ] Order status API
- [ ] Pickup code display
- [ ] Maps link generation
- [ ] Calendar file generation
- [ ] Email templates

### Suite 6: Psychological Marketing
- [ ] Trust signals present
- [ ] Social proof elements
- [ ] Scarcity indicators (where appropriate)
- [ ] Progress feedback (games, checkout)
- [ ] Achievement recognition (high scores)
- [ ] Playful copy & microcopy
- [ ] Color psychology (trust: green/blue, urgency: amber)
- [ ] Call-to-action clarity

### Suite 7: Performance & Optimization
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3.5s
- [ ] Cumulative Layout Shift < 0.1
- [ ] Bundle size < 250KB initial
- [ ] Lazy-loaded routes
- [ ] Image optimization
- [ ] Code splitting
- [ ] Tree shaking verification

### Suite 8: Accessibility
- [ ] Keyboard navigation
- [ ] Screen reader labels
- [ ] ARIA attributes
- [ ] Color contrast (WCAG AA)
- [ ] Focus indicators
- [ ] Touch target sizes (min 44px)

---

## 🔍 Critical Bug Checklist

### High Priority
- [ ] Any runtime errors in console
- [ ] Any TypeScript errors
- [ ] Build failures
- [ ] Broken routes (404s)
- [ ] State management bugs
- [ ] Memory leaks
- [ ] Performance bottlenecks

### Medium Priority
- [ ] Visual regressions
- [ ] Accessibility issues
- [ ] UX friction points
- [ ] Missing error handling
- [ ] Suboptimal loading states

### Low Priority
- [ ] Code style inconsistencies
- [ ] Missing documentation
- [ ] Optimization opportunities

---

## 🎮 Test Scenarios

### Scenario 1: New User - Game Discovery
1. Lands on /explore
2. Sees "Interactive Games" CTA
3. Clicks to /explore/games
4. Browses 5 games
5. Clicks "Play Now" on BenefitSort
6. Plays full 60s game
7. Sees high score saved
8. Navigates to IngredientRush
9. Plays until game over (lives exhausted)
10. Returns to games index

**Expected**: Smooth flow, zero errors, engaging feedback, scores persist

### Scenario 2: Kiosk Mode - Trade Show
1. Opens /explore on tablet
2. Enables kiosk mode
3. Plays MemoryMatch game
4. Leaves tablet idle for 3+ minutes
5. AttractMode appears
6. New visitor taps screen
7. AttractMode dismisses
8. Idle timer resets
9. Visitor plays BenefitSort
10. Admin disables kiosk mode

**Expected**: Automatic lifecycle, no manual intervention needed

### Scenario 3: 3D Product Exploration
1. Opens /explore/showcase
2. Sees product selector
3. Clicks "Sea Moss Gel"
4. 3D viewer loads (or shows placeholder gracefully)
5. Rotates model with mouse
6. Zooms in/out
7. Clicks fullscreen
8. Exits fullscreen
9. Switches to AR View tab
10. Sees AR instructions

**Expected**: Smooth interactions, clear feedback, graceful placeholder handling

### Scenario 4: Mobile AR Experience
1. Opens /explore/showcase on iPhone
2. Selects product
3. Switches to AR View
4. Taps AR button
5. iOS Quick Look opens (if USDZ available)
6. Places product in space
7. Takes screenshot
8. Exits AR mode

**Expected**: Native AR experience, no crashes

### Scenario 5: Pickup Order Flow (Trust)
1. Adds product to cart
2. Goes to checkout
3. Selects "Pickup at Market"
4. Chooses "Browns Mill" location
5. Completes order
6. Success page shows:
   - ✅ Correct total (e.g., $45.00 not $0.45)
   - ✅ Pickup code in large text
   - ✅ "Open in Maps" button
   - ✅ "Add to Calendar" button
   - ✅ "Browns Mill" location (not Serenbe)
   - ✅ "Sat 3-6PM" time (not 9-1)

**Expected**: Zero confusion, complete transparency, actionable buttons

---

## 🧪 Automated Tests to Run

### Build Tests
```bash
npm run build
npm run typecheck
npm run lint
```

### Unit Tests (If Configured)
```bash
npm run test:unit
```

### E2E Tests (Playwright)
```bash
npm run test:e2e:headless
```

### Performance Tests
```bash
npm run lighthouse
```

---

## 📊 Success Metrics

### Build Quality
- ✅ 0 TypeScript errors
- ✅ 0 ESLint errors
- ✅ 0 build warnings
- ✅ All routes generate successfully

### Performance
- ✅ Lighthouse score > 90
- ✅ FCP < 1.5s
- ✅ TTI < 3.5s
- ✅ Bundle size optimized

### Functional
- ✅ 100% of features work as designed
- ✅ 0 critical bugs
- ✅ 0 console errors in happy path

### Psychological Marketing
- ✅ Trust signals on every page
- ✅ Clear CTAs with action verbs
- ✅ Progress indicators where needed
- ✅ Playful but professional tone
- ✅ Social proof visible
- ✅ Scarcity used ethically

---

## 🐛 Bug Severity Classification

### P0 - Critical (Ship Blocker)
- Site doesn't load
- Major feature completely broken
- Data loss or corruption
- Security vulnerability
- Payment flow broken

### P1 - High (Must Fix Before Deploy)
- Feature partially broken
- Poor UX in critical flow
- Performance regression
- Accessibility barrier
- Trust signal missing

### P2 - Medium (Should Fix)
- Minor visual issues
- Suboptimal UX
- Missing nice-to-have features
- Code quality issues

### P3 - Low (Nice to Fix)
- Code style
- Documentation
- Future enhancements

---

## 🎯 Test Execution Plan

### Phase 1: Automated (5 min)
1. Run build checks
2. Run type checks
3. Run lint checks
4. Check bundle sizes

### Phase 2: Manual Component Testing (20 min)
1. Test each new component in isolation
2. Test edge cases
3. Test error states
4. Test loading states

### Phase 3: Integration Testing (30 min)
1. Test full user flows
2. Test cross-component interactions
3. Test state management
4. Test navigation

### Phase 4: Psychological Audit (15 min)
1. Review all copy
2. Check trust signals
3. Verify CTAs
4. Test emotional journey

### Phase 5: Performance Audit (10 min)
1. Run Lighthouse
2. Check bundle analyzer
3. Test load times
4. Test animations (60fps)

### Phase 6: Bug Fixing (Variable)
1. Fix P0 bugs immediately
2. Fix P1 bugs before deploy
3. Document P2/P3 for later

---

**Total Estimated Time**: 1.5-2 hours for thorough testing

**Starting now...**
