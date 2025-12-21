# Quick Test Checklist - 15 Minutes

**How to use:** Open this with ChatGPT and ask it to run through each item while viewing tasteofgratitude.shop

---

## Part 1: Basic Functionality (3 min)

- [ ] **Homepage loads** - Visit https://tasteofgratitude.shop
  - ✅ If you see the hero section with "Wildcrafted Sea Moss"
  - ❌ If you see "Something went wrong"

- [ ] **Products visible** - Scroll down
  - ✅ If you see product cards with prices
  - ❌ If product cards don't load

- [ ] **Navigation works** - Click Header links
  - ✅ If you can click "Catalog", "About", "Contact"
  - ❌ If links are broken

---

## Part 2: Shopping Cart (3 min)

- [ ] **Add to cart** - Go to /catalog and add any product
  - ✅ If cart count increases
  - ❌ If button doesn't work

- [ ] **View cart** - Click cart icon
  - ✅ If you see the product and price
  - ❌ If cart is empty or shows error

- [ ] **Update quantity** - Change quantity and update
  - ✅ If total price updates
  - ❌ If quantity doesn't change

---

## Part 3: Checkout Flow (5 min)

- [ ] **Start checkout** - Click "Checkout" button
  - ✅ If you see "Stage 1: Review Cart"
  - ❌ If you get an error

- [ ] **Enter contact info** - Fill in:
  - First Name: John
  - Last Name: Doe
  - Email: john@example.com
  - Phone: 404-555-0123
  - ✅ If all fields accept input
  - ❌ If fields are readonly

- [ ] **Validate form** - Try submitting empty:
  - Clear first name field
  - Click "Continue to Details"
  - ✅ If you see "First name is required" (error message, not crash)
  - ❌ If page crashes or shows JavaScript error

- [ ] **Select fulfillment** - Pick delivery option
  - ✅ If you can choose Pickup/Delivery/Shipping
  - ❌ If options don't work

- [ ] **Enter address** - Fill delivery address
  - ✅ If you can proceed to next stage
  - ❌ If validation fails unexpectedly

- [ ] **Review order** - Check stage 3
  - ✅ If you see all your info and total price
  - ❌ If information is missing

---

## Part 4: Error Handling (2 min)

- [ ] **Try invalid email** - Go back, change email to "invalid"
  - Click "Continue to Details"
  - ✅ If you see error message "Valid email is required"
  - ❌ If page crashes

- [ ] **Try invalid ZIP** - Change ZIP to "abc"
  - Click next
  - ✅ If you see error message "Valid ZIP code"
  - ❌ If page crashes

- [ ] **Network error recovery** - Go back to cart
  - Add/remove item quickly
  - ✅ If cart updates smoothly
  - ❌ If you get "Something went wrong"

---

## Part 5: Mobile Test (2 min)

- [ ] **Mobile homepage** - Resize to 390px width
  - ✅ If layout stacks vertically
  - ❌ If content overflows

- [ ] **Mobile menu** - Click hamburger icon
  - ✅ If menu opens
  - ❌ If menu doesn't work

- [ ] **Mobile checkout** - Try checkout on mobile size
  - ✅ If form is usable
  - ❌ If buttons are too small

---

## Part 6: Performance (Optional, 2 min)

- [ ] **Page speed** - Open DevTools (F12) → Network tab → Reload
  - ✅ If page loads in < 2 seconds
  - ⚠️ If > 2 seconds (note the time)

- [ ] **No layout shift** - Watch page load in slow motion
  - ✅ If layout is stable while loading
  - ❌ If content jumps around

---

## Part 7: Error Monitoring (Optional)

- [ ] **Trigger error** (DEV ONLY) - Open Console and run:
  ```javascript
  throw new Error("Test error for monitoring")
  ```
  - ✅ Check [Sentry dashboard](https://sentry.io) for the error

---

## Scoring

**0 checks failed** = ✅ Site is production-ready  
**1-2 checks failed** = ⚠️ Minor issues, can deploy with caution  
**3+ checks failed** = ❌ Major issues, do not deploy  

---

## Report Template

Copy and paste this in ChatGPT:

```
TASTE OF GRATITUDE - QUICK TEST REPORT

BASIC FUNCTIONALITY
- Homepage: [PASS/FAIL]
- Products visible: [PASS/FAIL]
- Navigation: [PASS/FAIL]

SHOPPING CART
- Add to cart: [PASS/FAIL]
- View cart: [PASS/FAIL]
- Update quantity: [PASS/FAIL]

CHECKOUT FLOW
- Start checkout: [PASS/FAIL]
- Contact info form: [PASS/FAIL]
- Form validation: [PASS/FAIL]
- Select fulfillment: [PASS/FAIL]
- Enter address: [PASS/FAIL]
- Review order: [PASS/FAIL]

ERROR HANDLING
- Invalid email error: [PASS/FAIL]
- Invalid ZIP error: [PASS/FAIL]
- Network error recovery: [PASS/FAIL]

MOBILE
- Mobile layout: [PASS/FAIL]
- Mobile menu: [PASS/FAIL]
- Mobile checkout: [PASS/FAIL]

PERFORMANCE
- Page speed: [PASS/FAIL] (took __ms)
- No layout shift: [PASS/FAIL]

OVERALL SCORE: __/7 PASS
STATUS: [READY / NEEDS FIXES]

NOTES:
[Any issues found]
```

---

## Next Steps

**If all pass:** Site is ready for full load testing  
**If some fail:** Create issues in GitHub for each failure  
**If many fail:** Rollback and investigate  

For detailed testing, see `DEEP_TEST_PLAN.md`
