# 🚀 Gratog Pay Flow — Integration Guide

## Current Status

✅ **PAY FLOW IS BUILT AND READY**

The `/pay` route exists and is fully functional. Here's what's in place and what needs to happen to go live.

---

## 📁 What's Already Created

```
app/pay/
├── page.tsx                    # Main entry ✅
├── README.md                   # Documentation ✅

app/api/pay-flow/
├── payment/route.ts            # Square payment API ✅
├── products/route.ts           # Product catalog API ✅

components/pay-flow/
├── index.ts                    # Component exports ✅
├── PayFlowHeader.tsx           # Brand + staff mode ✅
├── CategoryTabs.tsx            # Category navigation ✅
├── ProductCard.tsx             # Product display ✅
├── ProductFeed.tsx             # Scrollable grid ✅
├── FloatingCartButton.tsx      # Cart CTA ✅
├── CartPanel.tsx               # Slide-up cart ✅
├── PaymentPanel.tsx            # Square Web SDK ✅
└── SuccessScreen.tsx           # Confirmation ✅

lib/pay-flow/
├── index.ts                    # Library exports ✅
├── types.ts                    # TypeScript defs ✅
├── store.ts                    # Zustand stores ✅
├── data.ts                     # Sample products ✅
└── square-extension.ts         # Square integration ✅
```

---

## 🔌 Integration Steps (To Go Live)

### Step 1: Verify Square Configuration

Check your `.env.local` has the required vars:

```bash
# Required for Pay Flow
NEXT_PUBLIC_SQUARE_APPLICATION_ID=sq0id-...
NEXT_PUBLIC_SQUARE_LOCATION_ID=L...
SQUARE_ACCESS_TOKEN=EAAA...
SQUARE_ENVIRONMENT=sandbox  # or production
```

**Test it:**
```bash
cd ~/Gratog-live
npm run dev

# In another terminal:
curl http://localhost:3000/api/pay-flow/products
# Should return JSON with products
```

---

### Step 2: Replace Sample Products with Live Data

**Current:** `lib/pay-flow/data.ts` has 18 sample products

**Options for live data:**

#### Option A: Static JSON (Quick)
Replace `SAMPLE_PRODUCTS` with actual market inventory:

```typescript
// lib/pay-flow/data.ts
export const SAMPLE_PRODUCTS: PayFlowProduct[] = [
  {
    id: 'sq-catalog-id-1',  // Use real Square catalog IDs
    name: 'Classic Lemonade',
    category: 'lemonades',
    priceCents: 600,
    image: '/images/products/lemonade.jpg',
    ingredients: 'Fresh lemons, cane sugar, filtered water',
    available: true,
    stockQuantity: 24,      // Update via staff mode
    tags: ['popular'],
    // ...
  }
];
```

#### Option B: Fetch from Square Catalog (Recommended)
Modify `app/pay/page.tsx` to fetch live catalog:

```typescript
// In useEffect, replace setProducts(SAMPLE_PRODUCTS):
const fetchProducts = async () => {
  const res = await fetch('/api/pay-flow/products?live=true');
  const data = await res.json();
  setProducts(data.products);
};
fetchProducts();
```

---

### Step 3: Connect to Real Square Catalog IDs

**Critical:** The Pay Flow needs actual Square Catalog Object IDs for:
1. Inventory sync
2. Order line items
3. Reporting

**Update data.ts:**
```typescript
{
  id: 'CATALOG_OBJECT_ID_HERE',  // From Square Dashboard
  name: 'Classic Lemonade',
  catalogObjectId: 'CATALOG_OBJECT_ID_HERE', // Same as id
  // ...
}
```

**Get your catalog IDs:**
1. Square Dashboard → Items & Orders → Catalog
2. Export catalog or use API:
```bash
curl https://connect.squareup.com/v2/catalog/list \
  -H "Authorization: Bearer $SQUARE_ACCESS_TOKEN" \
  -H "Square-Version: 2025-10-16"
```

---

### Step 4: Add Link from Main Site

**Option A: QR Code Landing Page**
Create `app/market/page.tsx`:

```typescript
export default function MarketPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      <h1 className="text-2xl font-bold mb-4">Gratog Market</h1>
      <p className="text-gray-600 mb-8 text-center">
        Scan to order directly from the market
      </p>
      
      {/* QR Code to /pay */}
      <div className="bg-white p-6 rounded-2xl shadow-lg">
        <QRCodeSVG value="https://tastegratitude.shop/pay" size={200} />
      </div>
      
      <a 
        href="/pay" 
        className="mt-8 px-6 py-3 bg-amber-400 text-amber-950 rounded-xl font-bold"
      >
        Or order here →
      </a>
    </div>
  );
}
```

**Option B: Header Link**
Add to your main navigation in `components/Nav.tsx`:

```typescript
{isMarketDay && (
  <a 
    href="/pay" 
    className="px-4 py-2 bg-amber-400 text-amber-950 rounded-full font-bold"
  >
    🚀 Quick Order
  </a>
)}
```

---

### Step 5: Test Payment Flow

**Sandbox Testing:**
```bash
# Start dev server
npm run dev

# Open in browser
open http://localhost:3000/pay

# Test card (Square sandbox):
# Card: 4111 1111 1111 1111
# Exp: Any future date
# CVV: Any 3 digits
# ZIP: Any 5 digits
```

**Test Checklist:**
- [ ] Add items to cart
- [ ] Open cart slide-up
- [ ] Click Pay Now
- [ ] Enter test card
- [ ] Complete payment
- [ ] See success screen
- [ ] Check Square Dashboard for order

---

### Step 6: Production Deployment

**Environment Setup:**
```bash
# Vercel dashboard or CLI
vercel env add SQUARE_ENVIRONMENT production
vercel env add NEXT_PUBLIC_SQUARE_APPLICATION_ID
vercel env add NEXT_PUBLIC_SQUARE_LOCATION_ID
vercel env add SQUARE_ACCESS_TOKEN
```

**Deploy:**
```bash
vercel --prod
```

---

### Step 7: Staff Mode Setup

**Current PIN:** `2024` (in `PayFlowHeader.tsx`)

**Change it:**
```typescript
// components/pay-flow/PayFlowHeader.tsx
const STAFF_PIN = 'YOUR_NEW_PIN'; // Change from '2024'
```

**Staff can:**
- View exact stock quantities
- +/- stock counts
- Toggle product availability
- Bypass "sold out" filters

---

## 🔄 Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Customer Browser                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐   │
│  │  /pay page  │ →  │  Cart Panel  │ →  │   Payment   │   │
│  └─────────────┘    └─────────────┘    └─────────────┘   │
└─────────────────────┬──────────────────┬────────────────────┘
                      │                  │
                      ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│              Next.js App (Server Components)                │
│  ┌─────────────────┐    ┌─────────────────────────────┐   │
│  │ /api/pay-flow/ │    │  lib/pay-flow/              │   │
│  │   payment       │ →  │  square-extension.ts        │   │
│  └─────────────────┘    └─────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                 Square REST API                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    │
│  │   Orders    │    │  Payments   │    │   Catalog   │    │
│  └─────────────┘    └─────────────┘    └─────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Quick Start Commands

```bash
# 1. Verify setup
cd ~/Gratog-live
ls app/pay/page.tsx  # Should exist

# 2. Install deps (if needed)
npm install

# 3. Start dev
npm run dev

# 4. Test
curl http://localhost:3000/api/pay-flow/products

# 5. Open in browser
open http://localhost:3000/pay

# 6. Deploy when ready
vercel --prod
```

---

## ❓ Troubleshooting

### "Square not configured" error
Check `.env.local` has all 4 required variables.

### Products not showing
Staff mode is off by default. Only `available: true` products show.

### Payment fails in sandbox
Use test card `4111 1111 1111 1111` (any future date/CVV).

### Cart empty on refresh
Normal — cart persists in localStorage but requires products to display.

---

## 📝 Next Features (Optional)

1. **Live Inventory Sync** — WebSocket updates when stock changes
2. **Order Queue** — "You're #3 in line" display
3. **SMS Receipts** — Add phone number capture
4. **Analytics Dashboard** — Track popular items, peak hours
5. **Multi-location** — Support multiple market locations

---

## ✅ Ready to Test?

```bash
npm run dev
# Navigate to: http://localhost:3000/pay
```

The Pay Flow is **built** and **waiting** — just needs your Square catalog IDs to go live.
