# USER_JOURNEY_ANALYSIS — Business-Value Lens

> Phase 2 deliverable. Each journey scored on what blocks revenue and what is decorative.

## 1. Discovery journey

```diagram
 Landing (/) → Catalog (/catalog) → PDP (/product/[slug])
```

- **Expected:** browse, search, filter, find product.
- **Actual:** ✅ works. `/api/products`, `/api/storefront/catalog`, `/api/search/enhanced` all operational.
- **Broken sub-paths:**
  - Quiz (`/quiz` → `/api/quiz/*` ❌) — decorative; not in critical path.
  - Collections — derived from category tags; functional.
  - Recommendations (`/api/recommendations` ❌) — would lift AOV; not currently surfacing.
- **Dropoff risks:** None on the critical path. Mobile catalog grid is responsive; search works.
- **Verdict:** ✅ revenue-safe. Quiz/recommendations are deferrable.

## 2. Shopping journey (the revenue funnel)

```diagram
 /  →  /catalog  →  /product/[slug]
                          │ add to cart (Zustand localStorage)
                          ▼
                      cart drawer
                          │ proceed
                          ▼
                     /checkout
                          │ contact + fulfillment + Square Web SDK
                          ▼
            POST /api/inventory/lock
                          │
                          ▼
            POST /api/orders/create  ← mints orderAccessToken (30 m HMAC)
                          │
                          ▼
            POST /api/payments       ← validates amount vs stored total
                          │           consumes inventory
                          │           awards rewards (DUPLICATE — see CHECKOUT_TRACE)
                          │           marks coupon used (field-name mismatch — see CHECKOUT_TRACE)
                          │           sends Resend confirmation email
                          ▼
            /order/success?orderRef=…&token=…&paid=true
```

| Step | Verified | Risk |
|---|---|---|
| Pricing source | Mixed — server `/api/cart/price` exists but `/api/orders/create` accepts client-supplied prices | 🔴 price tampering |
| Taxes | Not explicitly handled in code path; Square handles in payment | 🟡 verify |
| Shipping | `/api/shipping/rates` exists ✅ | 🟡 |
| Discounts/coupons | `appliedCoupon` stored at create; payment route reads `order.coupon.code` (different field) | 🟠 silent failure to mark used |
| Inventory | Locked at checkout, consumed at payment, idempotent by orderId | 🟢 |
| Payment validation | Server-authoritative amount-match guard (lines 501-555 of payments route) | 🟢 strong |
| Idempotency | `Idempotency-Key` honored at create; payment route also idempotent | 🟢 |
| Reward awarding | **Double-awarded** — once at order-create self-fetch + once at payment success | 🔴 |
| Customer LTV counters | `$inc totalOrders + totalSpent` at order create (pre-payment) | 🟠 inflates if abandoned |

**Verdict:** ✅ canonical happy path works (post `970daff0` + `e1750aac`), BUT three real-money bugs sit inside it:
1. Price tampering possible at create.
2. Reward points double-credited.
3. Coupon usage may not register due to field-name mismatch.

## 3. Post-purchase journey

```diagram
 /order/success
   │  reads via /api/orders/by-ref ✅
   ▼
 Confirmation email (lib/resend-email.js)
   │  ⚠ does not write email_sends → delivery webhook orphaned
   ▼
 Order tracking via /order/[id] (requires orderAccessToken or login)
 Customer-side reorder: /profile/orders ❌ MISSING
 Support: /contact ❌ MISSING
```

| Step | Status |
|---|---|
| Success page | ✅ |
| Confirmation email send | ✅ sends |
| Confirmation email tracked | ❌ no `email_sends` row → bounce blind |
| Order tracking link | ✅ guest can return via tokened URL |
| Repeat purchase | ⚠️ no account-based reorder; cart in `localStorage` only |
| Support contact | ❌ `/contact` form submits into void |

**Revenue impact:** Lost repeat conversions; silent email failures invisible; "support" non-functional → escalates to direct social-media DMs or lost customer.

## 4. Newsletter journey

```diagram
 footer/popup signup → POST /api/newsletter/subscribe ❌ MISSING
 confirmation email → never fires
 /unsubscribe → POST /api/unsubscribe ❌ MISSING
```

| Step | Status |
|---|---|
| Signup | ❌ no API |
| DB entry to `email_subscribers` | ❌ |
| Confirmation email | ❌ |
| Unsubscribe | ❌ |

**Compliance verdict:** 🔴 **Legal exposure.** Any marketing email sent without a working unsubscribe is a CAN-SPAM/CCPA violation. Token-generation code exists in `lib/email/service.js`; HTTP handler does not.

## 5. Contact journey

```diagram
 /contact → POST /api/contact ❌ MISSING
```

**Failure mode:** customer types name + email + question, presses Send, gets silent failure or vague success toast (verify in UI), vendor never sees message.

**Business impact:** every dropped pre-sale inquiry, wholesale lead, partnership request, and complaint is lost. Direct revenue impact unmeasurable but real.

## 6. Review journey

```diagram
 PDP "Write a review" → POST /api/reviews ❌ MISSING
 Helpful vote → POST /api/reviews/helpful ❌ MISSING
 Admin moderation → /api/admin/reviews ✅
```

**Trust impact:** PDP shows static "no reviews" or fails silently. Admin moderation works but has nothing to moderate. Reviews are the strongest trust signal for a food brand — currently 0.

## 7. Loyalty journey (✅ mostly working)

```diagram
 Order paid → rewards awarded (twice — see bug 2 above)
 /profile/rewards → /api/user/rewards ✅
 /passport → /api/rewards/passport ✅
 Scan QR → /api/rewards/passport/scan ❌ MISSING
 Stamp → /api/rewards/stamp ❌ MISSING
 Gratitude account → /api/gratitude/* (8 routes) ✅
```

**Verdict:** Loyalty mechanics work for points; passport-scan flow is half-built. Gratitude flow is solid.

## 8. Market-day journey (vendor side)

```diagram
 Customer at market → /passport (QR) → /api/rewards/passport ✅
 Customer joins queue → /api/queue/join ✅
 Vendor sees queue → /vendor/queue → /api/queue/active ❌ MISSING
 Vendor updates → /api/queue/update ❌ MISSING
 Customer sees position → /api/queue/position/[id] ✅
```

**Verdict:** Queue half-broken. If markets actively use the queue feature, this is OPS_CRITICAL; if it's purely aspirational, hide it.

## 9. Mobile vs desktop

- ✅ PWA enabled (service worker, manifest, offline page).
- ✅ Responsive Tailwind layouts.
- ✅ Square Web SDK iframe renders on iOS/Android.
- ⚠️ Auto-play background music — friction on first mobile visit; may bounce.
- ⚠️ Checkout long-form — no Apple Pay / Google Pay express button.

## 10. Guest vs registered

- ✅ **Guest:** fully functional, mints HMAC `orderAccessToken` for follow-up payment.
- ❌ **Registered:** entirely broken — `/api/auth/register`, `/api/auth/login` (verify), `/api/auth/reset-password` all missing.

**Business decision:** for current volume, guest checkout is sufficient. Hide account CTAs until accounts are revisited.

## Summary — what blocks revenue today

| Journey | Revenue-blocking? | Trust-blocking? | Legal? |
|---|---|---|---|
| Discovery | ✅ works | — | — |
| Shopping (canonical) | ✅ but 3 real-money bugs inside | — | — |
| Post-purchase | ⚠️ email tracking blind | ⚠️ no /contact | — |
| Newsletter | — | ⚠️ list cannot grow | 🔴 CAN-SPAM if any list email goes out |
| Contact | — | 🔴 every inquiry lost | — |
| Reviews | — | 🟠 no social proof | — |
| Loyalty (points) | — | ✅ works | — |
| Passport scan | — | 🟡 market-day feature half | — |
| Queue (vendor) | ⚠️ if used at markets | — | — |
| Mobile checkout | ✅ works | — | — |
| Guest | ✅ works | — | — |
| Registered | — | 🟢 hidden = no impact | — |

**Bottom line:** the canonical revenue funnel works. The three real-money bugs inside it (price tamper, double-awards, coupon field-mismatch) and the four trust/legal gaps outside it (contact, unsubscribe, newsletter, reviews) are the entire short-term restoration agenda.
