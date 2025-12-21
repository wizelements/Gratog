# Deep Test Plan - Taste of Gratitude

**Objective:** Comprehensive testing of all critical user journeys and error handling

---

## Test Coverage Areas

### 1. Homepage & Navigation (5 tests)
- [ ] Homepage loads without errors (no "Something went wrong")
- [ ] All navigation links work (Header, Footer, Breadcrumbs)
- [ ] Hero section displays correctly
- [ ] Featured products load and display prices
- [ ] Customer reviews section renders (4.9/5 rating)

### 2. Product Catalog (5 tests)
- [ ] Catalog page loads with 29 products
- [ ] Filter by category works
- [ ] Sort by price/rating works
- [ ] Product detail page loads
- [ ] Product images load correctly

### 3. Shopping Cart (5 tests)
- [ ] Add product to cart
- [ ] Update quantity in cart
- [ ] Remove item from cart
- [ ] Cart total updates correctly
- [ ] Cart persists on page reload

### 4. Checkout Flow (8 tests)
- [ ] **Stage 1 (Cart):** Review cart items
- [ ] **Stage 1 (Cart):** Cart summary shows correct totals
- [ ] **Stage 2 (Details):** Enter contact info validation
  - First name required
  - Last name required
  - Email validation (valid format)
  - Phone required
- [ ] **Stage 2 (Details):** Select fulfillment method
  - Pickup option
  - Delivery option
  - Shipping option
- [ ] **Stage 2 (Details):** Address validation
  - Street address required
  - City required
  - ZIP code required
  - Valid ZIP format
- [ ] **Stage 3 (Review):** Review all information
- [ ] **Stage 3 (Review):** Payment button appears
- [ ] **Error recovery:** Can go back between stages

### 5. Payment Processing (6 tests)
- [ ] Payment form loads (Square integration)
- [ ] Valid payment processes without error
- [ ] Invalid card shows error message (not crash)
- [ ] Duplicate payment prevention works
- [ ] Payment confirmation shows order ID
- [ ] Order confirmation email triggers

### 6. Authentication (4 tests)
- [ ] Login page loads
- [ ] Login with valid credentials succeeds
- [ ] Login with invalid credentials shows error
- [ ] Logged-in user sees account menu

### 7. Wishlist (4 tests)
- [ ] Add product to wishlist
- [ ] Wishlist icon updates badge count
- [ ] Remove product from wishlist
- [ ] Wishlist persists on page reload

### 8. Rewards System (4 tests)
- [ ] Rewards badge shows points
- [ ] Add points after purchase
- [ ] Tier progression updates
- [ ] Redeem reward works

### 9. Error Handling (6 tests)
- [ ] **Global Error:** Trigger JavaScript error → See error page with "Try again"
- [ ] **Component Error:** Analytics fails → Page still works
- [ ] **API Error:** Checkout fails → See error message, not crash
- [ ] **Network Error:** Offline → Shows graceful fallback
- [ ] **Form Validation:** Invalid input → Error message, not crash
- [ ] **Session Expired:** Login timeout → Redirect to login

### 10. Performance & UX (5 tests)
- [ ] Lighthouse score > 80
- [ ] First Contentful Paint < 2s
- [ ] Largest Contentful Paint < 4s
- [ ] No layout shifts during loading
- [ ] Mobile responsive (hamburger menu, touch targets)

### 11. Mobile (5 tests)
- [ ] Responsive on iPhone 12 (390px)
- [ ] Responsive on iPad (768px)
- [ ] Touch interactions work (tap buttons, swipe)
- [ ] Mobile menu opens/closes
- [ ] Checkout usable on mobile

### 12. Security (4 tests)
- [ ] HTTPS enforced (no mixed content)
- [ ] CSP headers present
- [ ] No sensitive data in localStorage
- [ ] Payment data encrypted (Square iframe)

### 13. Accessibility (5 tests)
- [ ] Keyboard navigation works (Tab, Enter)
- [ ] Images have alt text
- [ ] Color contrast sufficient (WCAG AA)
- [ ] Form labels associated
- [ ] Skip to main content link works

### 14. Browser Compatibility (4 tests)
- [ ] Chrome latest
- [ ] Firefox latest
- [ ] Safari latest
- [ ] Edge latest

### 15. Analytics & Monitoring (3 tests)
- [ ] Google Analytics fires (page_view)
- [ ] Sentry captures JavaScript errors
- [ ] Custom events tracked (add_to_cart, checkout_started)

---

## Critical User Journeys

### Journey 1: Browse & Purchase
```
1. Visit homepage
2. Browse catalog
3. Click product
4. Add to cart (quantity = 2)
5. View cart
6. Proceed to checkout
7. Enter contact info
8. Select delivery option
9. Review order
10. Enter payment
11. Confirm order
12. See confirmation page
```

**Expected:** No errors, order created, confirmation email sent

### Journey 2: Error Recovery
```
1. Start checkout
2. Enter contact info
3. Trigger network error (disable network)
4. Try to continue
5. See error message
6. Re-enable network
7. Retry
8. Succeed
```

**Expected:** Graceful error handling, recovery works

### Journey 3: Mobile Checkout
```
1. Visit site on iPhone
2. Browse catalog (mobile view)
3. Add product to cart
4. Checkout on mobile
5. Complete purchase
```

**Expected:** Mobile-optimized, all touches work

---

## Test Execution Checklist

- [ ] Manual testing completed (all 60+ tests)
- [ ] No "Something went wrong" pages encountered
- [ ] All error messages are user-friendly
- [ ] All forms validate correctly
- [ ] Payment processes successfully
- [ ] Lighthouse score captured
- [ ] Mobile testing completed
- [ ] Screenshots taken of each major page
- [ ] Sentry monitored for errors
- [ ] Performance metrics collected

---

## Success Criteria

✅ All critical paths execute without errors  
✅ Error handling shows graceful fallbacks (not crashes)  
✅ Payment processing works end-to-end  
✅ Mobile experience is seamless  
✅ No unhandled JavaScript exceptions  
✅ Performance within acceptable limits  
✅ Accessibility standards met  

---

## Tools for Testing

- **Browser:** Chrome DevTools (Network, Console, Performance)
- **Mobile:** Chrome DevTools device emulation or real device
- **Accessibility:** Lighthouse, axe DevTools
- **Performance:** Lighthouse, WebPageTest
- **Monitoring:** Sentry dashboard
- **Analytics:** Google Analytics real-time
