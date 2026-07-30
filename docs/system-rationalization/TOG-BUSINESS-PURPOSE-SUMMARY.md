# TOG-BUSINESS-PURPOSE-SUMMARY.md

Taste of Gratitude — Business Purpose Summary for System Rationalization

Generated: 2026-07-29 18:50 EDT
Source: `memory/taste-of-gratitude-purpose.md` and `docs/business/TASTE-OF-GRATITUDE-PURPOSE.md`

---

## 1. Why Taste of Gratitude Exists

Taste of Gratitude is an Atlanta-based wellness beverage and sea moss business founded by Jenneisha Glover from her own lived wellness journey. The business exists to make thoughtfully prepared wellness beverages and sea moss products easier for real people to access and incorporate into their lives.

It is **not**:
- A mass-production beverage company
- A generic dropshipping wellness brand
- A supplement company making aggressive medical promises
- A technology showcase

It **is**:
- Founder-led
- Relationship-centered
- Small-batch
- Local-market rooted
- Honest about what it sells and what customers can expect

---

## 2. Who It Serves

### Primary customer groups
1. **New customers** — Need education without overwhelm; may not know what sea moss gel is or how weekly batches work.
2. **Farmers-market customers** — Discover at Serenbe, Dunwoody, or approved local markets; need current menu, correct dates, pickup details.
3. **Returning customers** — Know what they want; need a fast path to reorder, request a favorite, or arrange pickup/delivery.
4. **Availability-request customers** — Want something not currently listed; need a clear request process with no false reservation.
5. **Delivery customers** — Need to know area eligibility, minimum order, fee, and delivery window before payment.

### Operator
- **Jenneisha Glover** — founder, product authority, kitchen operator, market seller.

---

## 3. How It Earns Revenue

Primary commerce paths:
- **Weekly small-batch menu** — rotating selection reflecting what is actively being prepared.
- **Farmers-market preorder** — reserve products for a specific approved market.
- **General available-product checkout** — buy confirmed available inventory.
- **Arranged pickup** — approved returning/local customers request or schedule pickup outside market.
- **Fair local delivery** — offered within approved areas for a transparent fee.
- **Approved seasonal releases** — limited products when operationally ready.

Revenue must be protected by:
- Accurate pricing
- Accurate availability
- Secure payment
- Clear order truth (paid = reserved)
- Reliable fulfillment

---

## 4. How Customers Currently Buy

Verified active paths (2026-07-28/29):
- Homepage → catalog/weekly menu → product → cart → checkout → Square payment
- Market pickup selection at Serenbe or Dunwoody
- Guest checkout with order access token for status lookup
- Direct Square payment integration (production environment)

Unverified or partially verified paths:
- Delivery eligibility and fee calculation (code exists; real transaction not verified)
- Arranged pickup request flow (exists in fresh-batch/request-a-flavor code)
- Availability requests (fresh-batch request flow exists)

Deprecated or removed paths:
- SMS (Twilio removed; code references remain but not operational)

---

## 5. What the Owner Must Control

The admin system must let Jenneisha control without editing code:
- Products and categories
- Prices and variants
- Inventory and availability
- Weekly-menu inclusion
- Market dates and pickup windows
- Delivery settings
- Orders and requests
- Fulfillment status
- Customer/subscriber records
- Notifications

Current admin capabilities include:
- Product sync with Square
- Inventory management
- Order management
- Campaign creation
- Customer management
- Market/menus management
- Analytics dashboards

---

## 6. What Technology Should Accomplish

Technology must:
- Show current availability clearly
- Allow secure purchasing
- Support market pickup
- Support approved arranged pickup
- Support fair local delivery
- Accept availability requests
- Provide fast path for returning customers
- Capture weekly-menu subscribers
- Keep orders organized
- Reduce unstructured DMs
- Preserve easy human communication
- Be maintainable, secure, cost-conscious, mobile-first
- Resist duplicate orders, pricing inconsistencies, and stale inventory

Technology must **not**:
- Remove warmth or founder presence
- Force every customer through one rigid funnel
- Introduce unnecessary paid services
- Make medical claims
- Invent products, prices, or market dates
- Create commitments the business cannot fulfill

---

## 7. What the Business Explicitly Does Not Want to Become

Per the permanent operating constitution:
- Not a mass-production company
- Not a dropshipping brand
- Not a supplement company making medical promises
- Not a generic online store optimized only for technical completeness
- Not a feature-heavy dashboard with confusing admin controls
- Not a business that eliminates all human communication
- Not a company that forces customer accounts
- Not a brand that uses fake urgency, fake inventory, fake reviews, or aggressive wellness copy

---

## 8. OPEE Decision Filter

Every system must pass these tests:
1. **Purpose** — supports the actual business
2. **Customer value** — makes ordering/understanding/pickup/delivery/communication easier
3. **Founder value** — reduces work, errors, missed orders, or confusion
4. **Operational reality** — can be consistently fulfilled
5. **Financial value** — protects margin, reduces cost, increases useful sales
6. **Brand alignment** — sounds and feels like Taste of Gratitude
7. **Truthfulness** — every claim supported by real system and business
8. **Maintainability** — owner and future agents can understand and manage
9. **Verification** — behavior can be proven end to end

---

## 9. Priority Framework

### P0 — Trust, money, and safety
- Correct prices and charges
- Secure payment
- Accurate availability
- Order persistence
- Webhook security
- Private-data protection
- Admin security
- No false confirmations
- No paid unavailable products

### P1 — Customer success
- Clear weekly menu
- Returning-customer fast path
- Availability requests
- Market pickup
- Arranged pickup
- Delivery clarity
- Verified Instagram
- Working customer email
- Working owner/kitchen notification

### P2 — Operational efficiency
- Inventory management
- Request conversion
- Order filtering
- Fulfillment controls
- Notification retry
- Reporting
- Cache invalidation

### P3 — Growth optimization
Only after core system works:
- SEO refinement
- Reorder convenience
- Bundles
- Email campaigns
- Analytics
- Conversion testing
- Additional automation

---

## 10. Verification Standard

For every meaningful change:
1. Source code
2. Database state
3. External provider state
4. API behavior
5. Public interface
6. Admin interface
7. Mobile experience
8. Notification behavior
9. Production or preview deployment
10. Error and rollback behavior

Rule: *If the behavior has not been observed, it has not been verified.*

---

*This summary governs the TOG system rationalization. Every system must be evaluated against these criteria.*
