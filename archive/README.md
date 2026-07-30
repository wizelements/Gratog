# Archive Directory

This directory contains archived systems that have been deprecated or replaced.

## Contents

### sms-twilio/
Legacy SMS/Twilio notification code. No-SMS remediation complete.
- Owner alerts now use Telegram + Resend
- Twilio env vars removed from production
- Code kept for reference only

### reviews/
Public reviews system. Redirects to catalog.
- `app/reviews/` - Public reviews page
- `app/api/admin/reviews/` - Admin reviews API
- `components/ProductReviews.jsx` - Product reviews component
- `lib/review-visibility.js` - Review visibility logic

### subscriptions/
Subscriptions and Gratitude Box system. Placeholder only.
- `app/subscriptions/` - Public subscriptions pages
- `app/api/subscriptions/` - Subscriptions API
- `lib/subscription-*.ts/js` - Subscription logic

### stripe/
Stripe integration. Placeholder only. Square is payment authority.
- Stripe env vars removed from production
- No Stripe code files exist

### legacy-lib/
Legacy flat modules replaced by directory-based modules.
- `lib/markets.ts` - Replaced by `lib/markets/*`
- `lib/seo.js` - Replaced by `lib/seo/*`
- `lib/email-templates.js` - Replaced by `lib/email/templates.js`
- `lib/search/enhanced-search.js` - Replaced by `lib/search-enhanced.ts`
- `lib/unified-cart.js` - Replaced by `lib/cart-engine.ts`
- `lib/actions/cart.ts` - Replaced by `lib/cart-engine.ts`

### 410-routes/
Deprecated API routes returning 410 Gone.
- `app/api/checkout/route.ts`
- `app/api/create-checkout/route.ts`
- `app/api/pay/process/route.ts`

### shipping/
Shipping system (ShipEngine/EasyPost). Not operational.
- `lib/shipping-service.ts`
- `app/api/shipping/`
- `components/checkout/ShippingForm.tsx`

### wholesale/
Wholesale portal. Demand unknown.
- `app/wholesale/`

### ai-newsletter/
OpenAI newsletter generation. Cost without proven usage.
- `lib/ai-newsletter.js`

### rewards-v1/
Legacy rewards system V1. Replaced by gratitude system.
- `lib/enhanced-rewards.js`
- `lib/rewards-audit-logger.js`
- `lib/rewards-fraud-detection.js`
- `lib/rewards-secure.js`
- `lib/rewards-security.js`

### payment-forms/
Legacy payment form V2. Consolidated to V1.
- `components/checkout/SquarePaymentFormV2.tsx`

## Restoration

To restore any archived system:
1. Copy files back to their original locations
2. Re-enable any removed env vars
3. Verify the system works
4. Deploy to production
