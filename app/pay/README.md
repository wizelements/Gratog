# 🚀 Gratog Pay Flow

## Market-Optimized Mobile Checkout System

A dedicated, high-velocity checkout experience at `/pay` designed for live market environments. This is NOT a replacement for the existing eCommerce checkout — it's a specialized terminal for in-person transactions.

### Key Differentiators

| Feature | /pay (This) | /order (Existing) |
|---------|-------------|-------------------|
| **Target** | Live market customers | Online pre-orders |
| **Speed Target** | <20 seconds | 2-3 minutes |
| **Customer Info** | None required | Name, email, phone, pickup time |
| **Inventory** | Real-time availability | Preorder with limits |
| **Navigation** | Single scroll + cart | Multi-step wizard |
| **Payment** | Inline Square | Redirect or modal |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     /pay Route                              │
├─────────────────────────────────────────────────────────────┤
│  Header (sticky) │ Category Tabs (horizontal scroll)        │
├─────────────────────────────────────────────────────────────┤
│                    Product Feed                             │
│  ┌─────────┐ ┌─────────┐                                  │
│  │ Product │ │ Product │  ...scrollable grid              │
│  │  Card   │ │  Card   │                                  │
│  └─────────┘ └─────────┘                                  │
├─────────────────────────────────────────────────────────────┤
│  Floating Cart Button (bottom right)                        │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Cart Panel (slide-up modal)                                │
│  - Item list with quantity controls                         │
│  - Subtotal, tax, total                                    │
│  - Pay Now CTA                                             │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Payment Panel (slide-up modal)                             │
│  - Apple Pay / Google Pay                                   │
│  - Square card input                                        │
│  - Inline processing                                        │
└─────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│  Success Screen                                             │
│  - Order confirmation                                       │
│  - "Show vendor" message                                    │
│  - Receipt / new order                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Tree

```
app/pay/page.tsx
├── PayFlowHeader
│   ├── Logo + "Market Checkout" label
│   ├── Search toggle
│   └── Staff mode toggle (PIN protected)
├── CategoryTabs
│   └── Horizontal scroll: Lemonades, Juices, Sea Moss, Refreshers, Boba
├── ProductFeed
│   └── Grid of ProductCards (2-column)
├── FloatingCartButton
│   └── Item count + total (fixed bottom-right)
├── CartPanel (modal)
│   ├── Item list with +/- controls
│   ├── Totals
│   └── Pay Now CTA
├── PaymentPanel (modal)
│   ├── Apple Pay / Google Pay
│   ├── Square card input
│   └── Process payment
└── SuccessScreen (modal)
    ├── Order confirmation
    └── New order CTA
```

---

## Data Model

### Product
```typescript
interface PayFlowProduct {
  id: string;
  name: string;
  category: PayFlowCategory;
  priceCents: number;
  image: string;
  ingredients: string;
  available: boolean;
  stockQuantity: number;
  tags: PayFlowTag[];
  upsells?: PayFlowUpsell[];
  isPopular?: boolean;
  isNew?: boolean;
}
```

### Cart
```typescript
interface PayFlowCartItem {
  productId: string;
  quantity: number;
  upsellIds: string[];
  addedAt: number;
}
```

### State Management
- **Zustand** with localStorage persistence for cart
- **Zustand** ephemeral for UI state
- **30-minute cart expiry** (clears if inactive)

---

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/pay-flow/products` | GET | Available products (cached 30s) |
| `/api/pay-flow/payment` | POST | Process Square payment |

---

## Square Integration

### Payment Flow
1. Load Square Web SDK (`https://web.squarecdn.com/v1/square.js`)
2. Initialize with `applicationId` + `locationId`
3. User selects payment method:
   - **Digital Wallets**: Apple Pay / Google Pay via `paymentRequest()`
   - **Card**: Inline card input via `card()`
4. Tokenize → get `sourceId` (nonce)
5. POST to `/api/pay-flow/payment`
6. Server creates Square order + processes payment
7. Return success/failure

### Required Env Vars
```
NEXT_PUBLIC_SQUARE_APP_ID=sq0id-...
NEXT_PUBLIC_SQUARE_LOCATION_ID=L...
SQUARE_ACCESS_TOKEN=EAAA...
SQUARE_ENVIRONMENT=sandbox|production
```

---

## Staff Mode

Hidden feature for inventory management at markets:

- **Access**: Tap staff icon → Enter PIN `2024`
- **Features**:
  - View exact stock quantities
  - Increment/decrement stock inline
  - Toggle product availability
  - Bypass "sold out" filters

---

## Performance Optimizations

1. **No SSR** — Client-only for instant interactivity
2. **Zustand** — Minimal re-renders
3. **30s API cache** — Fresh data without hammering
4. **Image optimization** — Next.js Image with priority for above-fold
5. **Touch targets** — Minimum 44px for all interactive elements
6. **Skeleton states** — Instant visual feedback on tap

---

## Success Metrics

Target: **<20 second full flow**

```
Session Start → First Item Added → Cart Opened → Payment Complete
     │                │                │              │
     └────────────────┴────────────────┴──────────────┘
                   Total: <20 seconds
```

Tracked in `usePayFlowMetrics` store.

---

## Deployment

```bash
# Test locally
npm run dev
# Visit: http://localhost:3000/pay

# Deploy to Vercel
vercel --prod
```

---

## File Structure

```
app/pay/page.tsx                    # Main entry
app/api/pay-flow/
├── payment/route.ts                # Square payment processing
└── products/route.ts               # Product catalog
components/pay-flow/
├── index.ts                        # Exports
├── PayFlowHeader.tsx               # Brand + controls
├── CategoryTabs.tsx                # Horizontal category nav
├── ProductCard.tsx                 # Individual product display
├── ProductFeed.tsx                 # Scrollable product grid
├── FloatingCartButton.tsx          # Persistent cart CTA
├── CartPanel.tsx                   # Slide-up cart
├── PaymentPanel.tsx                # Square payment UI
└── SuccessScreen.tsx               # Confirmation
lib/pay-flow/
├── index.ts                        # Exports
├── types.ts                        # TypeScript definitions
├── store.ts                        # Zustand stores
└── data.ts                         # Sample product catalog
```

---

## Next Steps

1. [ ] Replace `SAMPLE_PRODUCTS` with live Square Catalog API
2. [ ] Add real-time inventory sync via WebSocket
3. [ ] Implement order queue display for customers ("You're #5 in line")
4. [ ] Add SMS receipt option
5. [ ] Analytics: track flow times, popular products, peak hours
