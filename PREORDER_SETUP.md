# Gratog Preorder System

## Overview
Customer-side preorder system that:
- Lets customers preorder items before arriving at the market
- Generates waitlist numbers (e.g., S-2815 for Serenbe)
- Sends notifications to Square team chat/email
- Tracks order status in real-time

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

## Status Flow
1. **pending** - Order received, awaiting confirmation
2. **confirmed** - Order confirmed by staff
3. **preparing** - Items being prepared
4. **ready** - Order ready for pickup
5. **completed** - Order picked up

## Minimums
- Serenbe: $15 minimum
- Dunwoody: $15 minimum

## Features
- Mobile-first design
- Real-time status tracking
- SMS notifications (when configured)
- Email confirmations
- Square chat integration
