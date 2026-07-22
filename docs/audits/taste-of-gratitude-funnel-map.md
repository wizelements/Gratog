# Taste of Gratitude — Funnel Maps

Current state and recommended state for every major customer pathway.

---

## Funnel A — Weekly-menu purchase

### Current

```
Homepage
├─ Hero: 3 CTAs (SMS / Catalog / Quiz)
├─ Weekly Menu section → "Open Full Shop" OR product card
│   ├─ /weekly-menu
│   ├─ /catalog
│   └─ /product/[slug]
├─ Add to cart / QuickAdd
├─ /cart
├─ /checkout
└─ Square payment link
```

**Friction:**
- Hero offers 3 paths before visitor understands the product.
- Catalog includes non-weekly items, diluting "this week" intent.
- Product detail may show $0 Square fallback.
- Cart/checkout depend on broken Square catalog.

### Recommended

```
Homepage
└─ Primary CTA: "View this week's menu"
   └─ /weekly-menu
      ├─ Featured weekly products
      ├─ One-click "Reserve for [market] pickup"
      └─ /preorder?market=...&product=...
         ├─ Market preselected from URL
         ├─ Curated weekly products by category
         ├─ Add items
         ├─ Checkout (Square payment link with curated prices)
         └─ Confirmation + waitlist number
```

---

## Funnel B — Product discovery

### Current

```
Search / social / nav
└─ /catalog
   ├─ Filter by health benefit (Daily Defense, Mineral Balance, etc.)
   ├─ Product card
   └─ /product/[slug]
      ├─ Add to cart (if checkoutReady)
      └─ Reserve via preorder (if market-only)
```

**Friction:**
- Health-benefit filters imply medical utility.
- Catalog sync may return $0 items.

### Recommended

```
Search / social / nav
└─ /catalog
   ├─ Filter by category (Gels, Lemonades, Refreshers, Shots)
   ├─ Filter by flavor profile (citrus, ginger, tropical, berry)
   ├─ Product card with size + price
   └─ /product/[slug]
      ├─ Flavor notes + ingredients + storage
      ├─ Add to cart / reserve for pickup
      └─ Related products by flavor/format
```

---

## Funnel C — Market-specific preorder

### Current

```
Market card (homepage or /markets)
└─ /preorder?market=serenbe
   ├─ Step 1: Select market (redundant)
   ├─ Step 2: Browse products from /api/storefront/catalog
   ├─ Step 3: Add items
   ├─ Step 4: Checkout with customer info
   └─ Square payment or pay-at-pickup
```

**Friction:**
- Market preselected by URL but user must select again.
- `/api/storefront/catalog` may return Unnamed Product / $0 items.
- $60 minimum may surprise.

### Recommended

```
Market card
└─ /preorder?market=serenbe
   ├─ Skip market selection if valid market in URL
   ├─ Show curated weekly menu grouped by category
   ├─ Show minimum progress bar upfront
   ├─ Add items
   ├─ Checkout with curated prices + delivery/pickup options
   └─ Square payment + waitlist number
```

---

## Funnel D — Lead capture

### Current

```
Homepage / weekly-menu / footer / retention prompts
└─ RetentionForm
   ├─ Collect name, email, phone, market, message (varies by intent)
   ├─ Intent: weekly_menu_texts, email_signup, subscription_waitlist, etc.
   └─ /api/lead
```

**Friction:**
- Phone capture implies SMS delivery that is not operational.
- Multiple intents create decision fatigue.
- Some forms precheck SMS opt-in.

### Recommended

```
Homepage / weekly-menu / footer
└─ Single email waitlist form
   ├─ Email required
   ├─ Market optional
   ├─ Copy: "Join the weekly menu email. SMS reminders coming soon."
   └─ /api/lead
```

---

## Funnel E — Founder trust

### Current

```
Homepage founder section
└─ /about
   ├─ Hero with stock Unsplash image
   ├─ Jenneisha's story
   ├─ Process steps
   ├─ Value cards
   └─ CTA: markets or catalog
```

**Friction:**
- Story implies sea moss caused personal health recovery.
- "Wildcrafted" sourcing claim is unsupported.

### Recommended

```
Homepage founder section
└─ /about
   ├─ Hero with founder photo
   ├─ Story reframed as routine/grounding, not cure
   ├─ Sourcing claim qualified
   ├─ Process + value cards
   └─ CTA: "Find us at the market" / "View this week's menu"
```

---

## Funnel F — Quiz

### Current

```
/quiz
├─ Q1: What do you want support with? (digestion, immunity, etc.)
├─ Q2: Product type
├─ Q3: Frequency
├─ Q4: Avoid list
├─ Email/phone capture
└─ Recommendation: primary product + backup + bundle
```

**Friction:**
- Health-goal question implies product treats/supports disease states.
- SMS opt-in prechecked.

### Recommended

```
/quiz
├─ Q1: What format do you prefer? (gel, drink, refresher, shot)
├─ Q2: What flavor profile? (citrus, berry, tropical, spicy/ginger)
├─ Q3: How do you plan to use it? (smoothies, spoonful, on-the-go)
├─ Q4: Pickup market or shipping?
├─ Email capture (optional phone)
└─ Recommendation: primary product + backup + bundle path
```

---

## Funnel G — Gratitude Box

### Current

```
/subscriptions/gratitude-box
├─ Hero: "Weekly subscription waitlist"
├─ Form: name, phone, email, market, bundle, frequency
├─ Submit → /api/subscriptions/gratitude-box
└─ One-time Square payment link or waitlist
```

**Friction:**
- Page title/metadata say "subscription" but it is one-time/waitlist.
- "Pause, skip, cancel anytime" not implemented.

### Recommended

```
/subscriptions/gratitude-box (renamed)
├─ Hero: "Gratitude Box pilot — reserve a weekly batch"
├─ Copy: "One box at a time while we build recurring billing."
├─ Form: name, phone, email, market, bundle
├─ Submit → waitlist or one-time pilot payment
└─ Clear next steps and expectation-setting
```

---

## Funnel H — Returning customer

### Current

```
Direct visit / email / QR / social
├─ May land on homepage and re-scroll
├─ /weekly-menu
└─ /preorder
```

**Friction:**
- No saved favorites, recent orders, or one-click reorder.
- Returning customers see the same first-time onboarding.

### Recommended

```
Direct visit / email / QR / social
├─ Recognized session → show "Welcome back" with last market + recent items
├─ One-click "Reorder my usual"
└─ /preorder with items preloaded
```

---

## Funnel metrics to measure

| Funnel | Entry event | Completion event | Drop-off points |
|---|---|---|---|
| A | `view_weekly_menu` | `purchase_complete` | Hero CTA choice, product page, cart, checkout |
| B | `view_catalog` | `purchase_complete` | Filters, product page, cart |
| C | `preorder_started` | `preorder_submitted` | Market select, product load, minimum, customer info |
| D | `lead_form_view` | `lead_capture_submitted` | Form fields, consent, SMS expectation |
| E | `view_about` | `home_preorder_click` or `weeklymenu_preorder_click` | Story health framing |
| F | `quiz_start` | `quiz_complete` + product view | Health-goal question, email capture |
| G | `gratitude_box_view` | `gratitude_box_submit` | Subscription/pilot mismatch |
| H | `view_homepage` (returning) | `reorder_complete` | No recognition or saved preferences |
