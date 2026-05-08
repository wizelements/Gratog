# Gratog UI Fixes - Implementation Plan

**Priority Order:** P0 → P1 → P2  
**Estimated Timeline:** 2-3 weeks  
**Last Updated:** 2026-05-07

---

## Week 1: Critical Fixes (P0)

### Day 1-2: Mobile Redirect Fix
**Issue:** Mobile users redirected to `/pay` without navigation access

**Files to Modify:**
- `app/page.js` - Add switch banner
- `components/pay-flow/MobileSwitchBanner.tsx` - Create switch component

**Implementation:**
```typescript
// Add to MobileSwitchBanner.tsx
export function MobileSwitchBanner() {
  return (
    <div className="bg-emerald-600 text-white px-4 py-2 text-center text-sm">
      <span>Fast checkout mode</span>
      <a href="/?fullSite=true" className="underline ml-2">
        Switch to full site
      </a>
      <span className="mx-2">|</span>
      <a href="/about" className="underline">About</a>
      <span className="mx-1">·</span>
      <a href="/faq" className="underline">FAQ</a>
    </div>
  );
}
```

**Testing:**
- [ ] Mobile UA shows banner
- [ ] Full site link works
- [ ] Info pages accessible

---

### Day 3-4: Preorder Tab Explanation
**Issue:** Delivery tab disabled without clear explanation

**Files to Modify:**
- `components/checkout/FulfillmentTabs.tsx` - Add inline banner

**Implementation:**
```typescript
// Add above tabs when hasPreorderItems
{hasPreorderItems && (
  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-3">
    <p className="text-sm text-amber-800">
      <strong>⏳ Preorder items in your cart</strong>
      <br />
      These items must be picked up at a market. Delivery is unavailable.
    </p>
  </div>
)}
```

**Testing:**
- [ ] Banner appears with preorder items
- [ ] Banner hidden without preorder items
- [ ] Delivery tab still disabled

---

### Day 5-7: Stock Validation in Cart
**Issue:** No stock validation on quantity increment

**Files to Modify:**
- `components/checkout/CartSummary.tsx` - Add stock checks
- `components/cart/EnhancedFloatingCart.jsx` - Add stock checks

**Implementation:**
```typescript
// Add stock check before increment
const handleQuantityChange = (itemId: string, delta: number) => {
  const item = cart.find(i => i.id === itemId);
  if (!item) return;
  
  const newQuantity = item.quantity + delta;
  
  // Check stock limit
  if (delta > 0 && item.stock && newQuantity > item.stock) {
    toast.error(`Only ${item.stock} available`);
    return;
  }
  
  if (newQuantity <= 0) {
    onRemoveItem(itemId);
  } else {
    onUpdateQuantity(itemId, newQuantity);
  }
};
```

**Testing:**
- [ ] Cannot exceed stock limit
- [ ] Toast shows available quantity
- [ ] Works in both cart components

---

## Week 2: High Priority Fixes (P1)

### Day 8-9: Phone Input Formatting
**Issue:** Phone accepts any text without validation

**Files to Modify:**
- `components/checkout/ContactForm.tsx` - Add phone mask

**Implementation:**
```typescript
const formatPhone = (value: string) => {
  const cleaned = value.replace(/\D/g, '');
  const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
  if (match) {
    return `(${match[1]}) ${match[2]}-${match[3]}`;
  }
  return value;
};

// In input
onChange={(e) => onChange({ phone: formatPhone(e.target.value) })}
```

**Testing:**
- [ ] Auto-formats as user types
- [ ] Validates 10 digits minimum
- [ ] Accepts pasting formatted numbers

---

### Day 10-11: ZIP Validation Timing
**Issue:** ZIP shows error before full entry

**Files to Modify:**
- `components/checkout/DeliveryForm.tsx` - Validate on blur only

**Implementation:**
```typescript
const [touched, setTouched] = useState(false);

// Only validate after blur
const zipValid = touched && data.address.zip.length === 5
  ? Fulfillment.isZipServiceable(data.address.zip)
  : null;

// In input
onBlur={() => setTouched(true)}
```

**Testing:**
- [ ] No validation during typing
- [ ] Validates on blur
- [ ] Validates at 5 digits only

---

### Day 12-13: Global Loading States
**Issue:** No global feedback during add to cart

**Files to Modify:**
- `components/QuickAddButton.jsx` - Add global toast
- `components/EnhancedProductCard.jsx` - Add loading overlay

**Implementation:**
```typescript
// In QuickAddButton
toast.promise(
  addToCartPromise,
  {
    loading: 'Adding to cart...',
    success: (data) => `${data.name} added!`,
    error: 'Failed to add item',
  }
);
```

**Testing:**
- [ ] Toast appears immediately
- [ ] Cart animation plays
- [ ] Double-click prevented

---

### Day 14: Custom Confirm Modal
**Issue:** Native confirm blocks UI

**Files to Modify:**
- Create `components/ui/ConfirmModal.tsx`
- Update `EnhancedFloatingCart.jsx`

**Implementation:**
```typescript
// ConfirmModal.tsx
export function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl p-6 max-w-sm mx-4">
        <h3 className="text-lg font-bold mb-2">{title}</h3>
        <p className="text-gray-600 mb-4">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2 border rounded-lg">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 py-2 bg-red-500 text-white rounded-lg">
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
```

**Testing:**
- [ ] Modal appears styled correctly
- [ ] Cancel dismisses modal
- [ ] Confirm clears cart

---

## Week 3: Medium Priority & Polish (P2)

### Day 15-17: Back to Catalog Links
**Issue:** No way back from empty cart/checkout

**Files to Modify:**
- `components/checkout/CheckoutRoot.tsx` - Add browse link
- `components/cart/EnhancedFloatingCart.jsx` - Add browse link

**Implementation:**
```typescript
// In empty cart state
<div className="text-center py-8">
  <ShoppingCart className="w-16 h-16 text-gray-300 mx-auto mb-4" />
  <p className="text-gray-500 mb-4">Your cart is empty</p>
  <Link href="/catalog">
    <Button className="bg-emerald-600">
      <ArrowLeft className="w-4 h-4 mr-2" />
      Continue Shopping
    </Button>
  </Link>
</div>
```

**Testing:**
- [ ] Link appears on empty cart
- [ ] Link navigates to catalog
- [ ] Preserves scroll position optional

---

### Day 18-19: Form Progress Indicator
**Issue:** No visual progress in multi-step checkout

**Files to Modify:**
- `components/checkout/CheckoutProgress.tsx` - Enhance progress bar

**Implementation:**
```typescript
// Add progress percentage
const progress = {
  cart: 0,
  details: 50,
  review: 100
}[stage];

<div className="w-full bg-gray-200 h-2 rounded-full mb-4">
  <div 
    className="bg-emerald-600 h-2 rounded-full transition-all"
    style={{ width: `${progress}%` }}
  />
</div>
<p className="text-sm text-gray-600 text-center">
  Step {stage === 'cart' ? 1 : stage === 'details' ? 2 : 3} of 3
</p>
```

**Testing:**
- [ ] Progress bar updates with stage
- [ ] Step indicator accurate
- [ ] Mobile view works

---

### Day 20-21: Accessibility Fixes
**Issue:** WCAG 2.1 AA compliance gaps

**Files to Modify:**
- `components/checkout/CartSummary.tsx` - Add aria-live
- `components/ProductCard.jsx` - Fix alt text
- `app/layout.js` - Add skip link

**Implementation:**
```typescript
// Add aria-live region
<div aria-live="polite" aria-atomic="true" className="sr-only">
  {itemCount} items in cart, total {total}
</div>

// Skip link in layout
<a href="#main-content" className="sr-only focus:not-sr-only">
  Skip to main content
</a>
<main id="main-content">...</main>
```

**Testing:**
- [ ] Screen reader announces cart updates
- [ ] Skip link visible on focus
- [ ] All images have alt text

---

## Testing Checklist

### Before Merge
- [ ] All new tests pass
- [ ] Existing tests still pass
- [ ] Manual QA on mobile device
- [ ] Accessibility audit with screen reader
- [ ] Performance metrics unchanged

### After Deploy
- [ ] Monitor error rates
- [ ] Check conversion funnel
- [ ] Review customer feedback
- [ ] Verify analytics tracking

---

## Rollback Plan

If critical issues arise:

1. **Immediate:** Revert to previous commit
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Vercel:** Promote previous deployment
   ```bash
   vercel --prod
   ```

3. **Monitor:** Watch error rates for 1 hour

---

## Success Metrics

| Metric | Before | Target | Measurement |
|--------|--------|--------|-------------|
| Cart abandonment | ~70% | <60% | Analytics |
| Checkout errors | Unknown | <2% | Sentry |
| Mobile conversion | ~2% | >3% | Analytics |
| Support tickets | Unknown | -20% | Zendesk |

---

## Notes

- **Coordinate with:** Design team for modal styling
- **Blockers:** None identified
- **Dependencies:** None beyond existing codebase
- **Documentation:** Update README.md with mobile flow explanation

---

*Implementation plan created for Gratog UI Deep Evaluation*