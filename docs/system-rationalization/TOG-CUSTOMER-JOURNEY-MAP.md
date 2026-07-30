# TOG-CUSTOMER-JOURNEY-MAP.md

Taste of Gratitude — Customer Journey Map

Generated: 2026-07-29 19:14 EDT
Authority: Native Termux workspace
Status: Based on code inventory and prior verification reports; live DOM verification blocked by runtime degradation.

---

## 1. New Customer Discovery Journey

Goal: Understand products → see current availability → purchase.

| Step | Route / Component | API | Status | Notes |
|------|-----------------|-----|--------|-------|
| Discover brand | `/` (HomePageClient) | `/api/storefront/catalog` | Active | Markets visible; weekly menu section active |
| Browse catalog | `/catalog` | `/api/storefront/catalog`, `/api/storefront/square-catalog` | Active | Fetches from Square at runtime |
| View product | `/product/[slug]` | `/api/products` | Active | Product detail |
| Add to cart | `components/QuickAddButton`, `ProductCard` | `/api/cart` | Active | Cart state |
| Go to checkout | `/checkout` | `/api/create-checkout`, `/api/orders/create` | Active | Square Web Payments SDK |
| Select fulfillment | `components/checkout/FulfillmentTabs` | `/api/delivery/quote`, `/api/shipping/rates` | Active | Pickup market / delivery / shipping |
| Pay | `components/checkout/SquarePaymentFormV2` | `/api/payments` | Active | Production Square |
| Success | `/checkout/success`, `/order/success` | `/api/orders/by-ref` | Active | Order lookup by ref |

### Mission alignment
- Supports customer trust and product discovery.
- Verified: homepage loads, markets visible, health-claim language sanitized.
- Partially verified: product slugs not visible in raw HTML due to client-side rendering; browser test needed.

## 2. Market Reservation Journey

Goal: View weekly menu → choose market → reserve → pay → pickup.

| Step | Route / Component | API | Status | Notes |
|------|-----------------|-----|--------|-------|
| View weekly menu | `/weekly-menu` | `data/weeklyMenu.ts`, `lib/menus/week-utils.ts` | Active | SSR; uncommitted week-utils fixes date mismatch |
| Choose market | `components/EnhancedMarketCard` | `data/markets.ts`, `/api/markets` | Active | Serenbe, Dunwoody visible |
| Browse products | `/order/menu`, `/order/start` | `/api/menus/current` | Active | |
| Add to cart / preorder | `/preorder` | `/api/preorder` | Active | Preorder flow |
| Confirm preorder | `/preorder/confirm` | `/api/preorder/confirm` | Active | |
| Pay | checkout path | `/api/payments` | Active | |
| Receive pickup info | email / Telegram | Resend / Telegram | Active | Owner alerts verified |

### Mission alignment
- Core farmers-market commerce path.
- Risk: `menus` DB document is stale (June 8, 2026) while code expects current week.

## 3. Returning Customer Journey

Goal: Quickly reorder or request a favorite.

| Step | Route / Component | API | Status | Notes |
|------|-----------------|-----|--------|-------|
| Return to site | `/` | — | Active | |
| View catalog / weekly menu | `/catalog`, `/weekly-menu` | — | Active | |
| Quick add | `components/QuickAddButton` | `/api/cart` | Active | |
| Request a flavor | `/request-a-flavor` | `/api/fresh-batch/requests` | Active | Availability request path |
| Direct message fallback | Contact / Instagram | `/api/contact` | Active | |

### Mission alignment
- Returning-customer fast path exists via catalog/quick-add.
- Account-based reordering is partial/broken because customer auth/account pages are incomplete.

## 4. Availability Request Journey

Goal: Request a product not currently listed or confirmed.

| Step | Route / Component | API | Status | Notes |
|------|-----------------|-----|--------|-------|
| Request form | `/request-a-flavor` | `/api/fresh-batch/requests` | Active | |
| Admin review | `/admin/fresh-batches` | `/api/admin/fresh-batch/requests` | Active | |
| Owner confirmation | email / Telegram | Resend / Telegram | Active | |
| Official payment | checkout path | `/api/orders/create`, `/api/payments` | Active | |

### Mission alignment
- Clear request path exists; payment only after owner confirmation.
- Risk: unclear whether customers understand request vs. order.

## 5. Arranged Pickup Journey

Goal: Approved returning/local customer schedules pickup outside market.

| Step | Route / Component | API | Status | Notes |
|------|-----------------|-----|--------|-------|
| Request arranged pickup | checkout fulfillment tabs or `/request-a-flavor` | `/api/orders/create` | Partial | Code exists; operational rules unclear |
| Owner confirmation | email / Telegram | Resend / Telegram | Active | |
| Receive private instructions | email | Resend | Active | |

### Mission alignment
- Supports flexibility for returning customers.
- Private pickup info must not be publicly exposed.

## 6. Delivery Journey

Goal: Verify eligibility, see fee, pay, receive delivery.

| Step | Route / Component | API | Status | Notes |
|------|-----------------|-----|--------|-------|
| Select delivery | checkout fulfillment tabs | `/api/delivery/quote` | Active code | |
| Enter address/ZIP | `components/checkout/DeliveryForm` | — | Active | |
| Verify eligibility | `/api/delivery/quote` | distance/ZIP checks | Active code | |
| Show fee and minimum | `lib/delivery-pricing.js` | — | Active code | |
| Pay | checkout | `/api/payments` | Active | |
| Delivery notification | email / Telegram | Resend / Telegram | Active | |

### Mission alignment
- Delivery is a valid path but must be operationally realistic.
- Not verified end-to-end with a real transaction.

## 7. Customer Support Journey

Goal: Ask a question → get response → official order path.

| Step | Route / Component | API | Status | Notes |
|------|-----------------|-----|--------|-------|
| Contact form | `/contact` | `/api/contact` | Active | |
| Instagram | link in footer | — | Active link | Handle unverified in this pass |
| Order support | `/order/status/[id]` | `/api/orders/by-ref` | Active | Guest order lookup |
| Unsubscribe | `/unsubscribe` | `/api/unsubscribe` | Active | |

### Mission alignment
- Contact form and order lookup work.
- Instagram handle should be verified.

---

*Next: TOG-PUBLIC-PAGE-INVENTORY.md*
