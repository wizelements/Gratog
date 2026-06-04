# Gratog Preorder System

**Status**: IN-PROGRESS  
**Last Updated**: 2026-06-02  
**Owner**: Taste of Gratitude / Cod3Black

## Overview
Customer-side preorder system that:
- Lets customers reserve made-fresh items before arriving at the market
- Generates waitlist numbers (e.g., S-2815 for Serenbe)
- Sends notifications to Square team chat/email
- Returns a pickup number customers can show at the booth

Preorders are positioned for intentional customers who already know what they want or are stocking up for a weekly wellness routine. Market samples are still the discovery path for new customers.

## Routes

### Customer Pages
- `/preorder` - Main preorder form (market → items → customer info)
- `/preorder/status` - Check order status with waitlist number

### API Routes
- `POST /api/preorder` - Create new preorder
- `GET /api/preorder/status` - Get preorder status
- `POST /api/preorder/status` - Update status (staff only)

## Waitlist Number Format
- **S-2815**: Serenbe, 28th day, order #15
- **D-2803**: Dunwoody, 28th day, order #3
- **SS-2801**: Sandy Springs, 28th day, order #1

## Configuration

### Environment Variables
```bash
# Square Team Notifications
SQUARE_CHAT_WEBHOOK_URL=        # Webhook URL for Square chat
SQUARE_TEAM_EMAIL=              # Team email for notifications
PREORDER_STAFF_KEY=             # Secret key for staff status updates
```

### Square Chat Integration
To enable Square chat notifications:
1. Create a webhook in your Square dashboard
2. Set `SQUARE_CHAT_WEBHOOK_URL` to the webhook URL
3. The system will POST order data to this webhook

### Staff Status Updates
Staff can update order status via API:
```bash
curl -X POST /api/preorder/status \
  -H "Content-Type: application/json" \
  -d '{
    "orderNumber": "PRE-XXXXX",
    "status": "ready",
    "staffKey": "your-secret-key"
  }'
```

## Preorder Business Rules

Preorders are for intentional market-pickup customers who want made-fresh items reserved before arriving.

### Market Pickup Strategy
- Samples are for discovery at the booth.
- Preorders are for customers who already know what they want or are stocking up for the week.
- Customers pay at pickup unless the order is placed through the standard online checkout flow.
- Staff should confirm availability before market day when possible.

### Minimums and Limits
- Preorder items require a **$60 subtotal minimum**.

### Customer Messaging
- "Come taste at the market, then preorder when you want your wellness routine guaranteed."
- "Samples are for discovery. Preorders are for customers who already know what they want."
- "If you are intentional about your health and want your weekly routine ready, preorder for market pickup."

## Home Delivery Pricing

Home delivery should be quoted by mileage before payment.

Current recommended tiers:
- 0–5 miles: free
- 5–10 miles: $3.99
- 10–15 miles: $7.99
- 15–20 miles: $11.99
- 20–25 miles: $15.99
- Over 25 miles: not available without manual approval

Implementation rules:
- The customer-facing checkout displays a delivery quote after the full address is entered.
- `/api/orders/create` recomputes delivery mileage and fee server-side.
- Do not trust client-submitted `deliveryFee`.
- Geocode only after a full address is entered, not on every keystroke.

## Status Flow
1. **pending** - Order received, awaiting confirmation
2. **confirmed** - Order confirmed by staff
3. **preparing** - Items being prepared
4. **ready** - Order ready for pickup
5. **completed** - Order picked up

> Current limitation: status lookup is still placeholder/demo-backed until preorder persistence is added. Staff notification is the operational source of truth.

## Compliance and Marketing Guardrails

### Product Claims
Avoid disease, cure, treatment, detox, or guaranteed health outcome claims.

Use:
- "crafted with sea moss"
- "made for your wellness routine"
- "traditionally valued for minerals"
- "refreshing market-made drinks"

Avoid:
- "treats inflammation"
- "cures gut issues"
- "detoxes your body"
- "boosts immunity" as a guaranteed medical outcome

### FDA Disclaimer
Where wellness benefits are mentioned, include:

> These statements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease.

### Sampling
Market samples should follow local food-safety requirements:
- single-use sample cups/spoons
- ingredient/allergen visibility
- cold-holding where required
- no medical advice at the booth

### Phone and Email
Phone numbers collected during preorder are for transactional order communication only unless the customer separately opts into marketing.

## Features
- Mobile-first design
- Staff preorder notifications
- Customer waitlist number confirmation
- SMS notifications (when configured)
- Email confirmations
- Square chat integration
