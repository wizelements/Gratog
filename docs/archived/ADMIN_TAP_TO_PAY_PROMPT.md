# Admin Dashboard with Tap-to-Pay Feature - Detailed Build Prompt

## 🎯 Objective
Build a simple, efficient admin dashboard for Taste of Gratitude that enables authorized staff to process in-person payments using tap-to-pay (NFC/contactless) functionality at farmers markets and physical locations, similar to Square POS.

---

## 📋 Core Requirements

### 1. Authentication & Authorization

**Admin User Management:**
- Secure admin login system (email + password)
- Role-based access control:
  - **Admin**: Full access (manage users, products, payments, reports)
  - **Staff**: Limited access (process payments, view orders)
  - **Manager**: Mid-level access (payments, reports, inventory)
- JWT-based authentication with refresh tokens
- Session management with auto-logout after inactivity
- Two-factor authentication (2FA) optional for admins

**Device Authorization:**
- Whitelist specific devices by device ID/fingerprint
- QR code-based device pairing for quick setup
- Ability to revoke device access remotely
- Track which device processed which transaction

---

### 2. Tap-to-Pay Integration (Square Terminal API)

**Payment Processing:**
- Integrate Square Terminal API for tap-to-pay
- Support for:
  - NFC/contactless cards (Visa, Mastercard, Amex, Discover)
  - Mobile wallets (Apple Pay, Google Pay, Samsung Pay)
  - Chip cards (as fallback)
  - Manual card entry (backup option)

**Terminal Requirements:**
- Support Square Reader SDK or Web Payments SDK
- Compatible devices:
  - Square Terminal
  - Square Reader for contactless + chip
  - iOS/Android devices with Square Reader SDK
  - Web-based checkout for desktop

**Payment Flow:**
1. Staff selects products from catalog
2. System calculates total with tax
3. Staff initiates payment
4. Customer taps card/phone on device
5. Instant payment confirmation
6. Digital/printed receipt option
7. Transaction logged in database

---

### 3. Admin Dashboard Pages

#### **A. Dashboard Home (`/admin`)**
- Login required with redirect
- Overview cards:
  - Today's sales total
  - Number of transactions today
  - Top selling products
  - Low stock alerts
- Quick actions:
  - Start new sale
  - View recent orders
  - Sync inventory

#### **B. Point of Sale (`/admin/pos`)**
**Simple, Fast Interface for In-Person Sales:**

**Left Panel - Product Catalog:**
- Grid view of all products with images
- Search/filter by category:
  - Sea Moss Gels
  - Lemonades
  - Wellness Shots
- Quick select with quantity adjustment
- Visual stock indicators

**Right Panel - Cart:**
- Selected items with quantity
- Real-time price calculation
- Apply discounts (percentage or fixed)
- Add customer notes
- Tax calculation (Georgia: 7%)

**Payment Section:**
- Display total prominently
- Payment options:
  - **Tap to Pay** (primary button)
  - **Cash** (manual entry)
  - **Other** (Venmo, CashApp - manual)
- Split payment option
- Tip option (optional field)

**Post-Payment:**
- Success confirmation
- Print/email/SMS receipt options
- Option to send digital receipt via email
- Clear cart and ready for next sale

#### **C. Orders Management (`/admin/orders`)**
- Searchable table of all transactions
- Filters:
  - Date range
  - Payment method
  - Staff member
  - Amount range
- Order details view:
  - Items purchased
  - Customer info (if collected)
  - Payment details
  - Staff who processed
  - Device used
- Export to CSV/Excel
- Refund capability (with manager approval)

#### **D. Inventory Management (`/admin/inventory`)**
- Product list with stock levels
- Add/edit/remove products
- Set stock alerts (low stock threshold)
- Batch stock update
- Stock adjustment history
- Sync with online store inventory

#### **E. Reports & Analytics (`/admin/reports`)**
- Date range selector
- Key metrics:
  - Total sales
  - Average transaction value
  - Sales by product
  - Sales by category
  - Sales by payment method
  - Sales by staff member
  - Peak sales times
- Visual charts (bar, line, pie)
- Export reports as PDF/CSV
- Compare periods (this week vs last week)

#### **F. Settings (`/admin/settings`)**
- User management:
  - Add/remove staff
  - Edit roles and permissions
  - View activity logs
- Device management:
  - List authorized devices
  - Add new device
  - Revoke device access
  - View device transaction history
- Store settings:
  - Business name and address
  - Tax rate configuration
  - Receipt customization
  - Payment preferences
- Square integration:
  - Connect Square account
  - API key management
  - Terminal device pairing
  - Test mode toggle

---

## 🏗️ Technical Architecture

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI**: shadcn/ui + Tailwind CSS
- **State Management**: Zustand or React Context
- **Forms**: React Hook Form + Zod validation
- **Charts**: Recharts
- **Icons**: Lucide React

### Backend
- **API Routes**: Next.js API routes (`/api/admin/*`)
- **Database**: MongoDB
  - Collections: users, orders, products, inventory, devices, transactions
- **Authentication**: NextAuth.js or custom JWT
- **File Upload**: For product images (if needed)

### Payment Integration
- **Primary**: Square Terminal API
- **SDK**: Square Web Payments SDK (for web-based tap-to-pay)
- **Fallback**: Manual entry or cash

### Security
- HTTPS only
- Rate limiting on API routes
- Input sanitization
- SQL injection prevention (using parameterized queries)
- XSS protection
- CSRF tokens
- Encrypted sensitive data at rest

---

## 📊 Database Schema

### Users Collection
```javascript
{
  _id: UUID,
  email: String (unique),
  passwordHash: String,
  role: Enum ['admin', 'manager', 'staff'],
  firstName: String,
  lastName: String,
  phone: String (optional),
  createdAt: Date,
  lastLogin: Date,
  isActive: Boolean,
  twoFactorEnabled: Boolean
}
```

### Authorized Devices Collection
```javascript
{
  _id: UUID,
  deviceId: String (unique),
  deviceName: String,
  deviceType: Enum ['terminal', 'mobile', 'web'],
  authorizedBy: UUID (user reference),
  authorizedAt: Date,
  lastUsed: Date,
  isActive: Boolean,
  squareDeviceId: String (optional)
}
```

### Orders Collection
```javascript
{
  _id: UUID,
  orderNumber: String (auto-increment),
  items: [{
    productId: UUID,
    productName: String,
    quantity: Number,
    priceAtPurchase: Number (cents)
  }],
  subtotal: Number (cents),
  tax: Number (cents),
  discount: Number (cents),
  tip: Number (cents),
  total: Number (cents),
  paymentMethod: Enum ['tap_to_pay', 'cash', 'other'],
  paymentStatus: Enum ['pending', 'completed', 'refunded', 'failed'],
  squarePaymentId: String (optional),
  processedBy: UUID (user reference),
  deviceId: UUID (device reference),
  customerEmail: String (optional),
  customerPhone: String (optional),
  notes: String (optional),
  receiptSent: Boolean,
  createdAt: Date,
  refundedAt: Date (optional),
  refundReason: String (optional)
}
```

### Inventory Collection
```javascript
{
  _id: UUID,
  productId: UUID (reference to products),
  currentStock: Number,
  lowStockThreshold: Number,
  lastRestocked: Date,
  stockHistory: [{
    date: Date,
    adjustment: Number,
    reason: String,
    adjustedBy: UUID (user reference)
  }]
}
```

---

## 🎨 UI/UX Design Guidelines

### Point of Sale Screen
**Must Be:**
- **Fast**: No lag, instant response
- **Simple**: Minimal clicks to complete sale
- **Large Touch Targets**: Finger-friendly (min 44x44px)
- **High Contrast**: Easy to read in outdoor markets
- **Offline Capable**: Queue transactions when offline

**Layout:**
```
┌─────────────────────┬─────────────────┐
│                     │                 │
│   PRODUCT GRID      │   CART PANEL    │
│   (60% width)       │   (40% width)   │
│                     │                 │
│   [Search Bar]      │   Items: 3      │
│                     │                 │
│   ┌──┬──┬──┬──┐    │   Subtotal: $45 │
│   │  │  │  │  │    │   Tax: $3.15    │
│   └──┴──┴──┴──┘    │   ───────────   │
│   ┌──┬──┬──┬──┐    │   TOTAL: $48.15 │
│   │  │  │  │  │    │                 │
│   └──┴──┴──┴──┘    │   [TAP TO PAY]  │
│                     │   [CASH]        │
│                     │   [OTHER]       │
└─────────────────────┴─────────────────┘
```

### Color Coding
- **Success**: Green (#10B981) - Completed transactions
- **Warning**: Yellow (#F59E0B) - Low stock alerts
- **Error**: Red (#EF4444) - Failed payments, errors
- **Primary**: Gold (#D4AF37) - Brand color, primary actions
- **Neutral**: Gray - Secondary info

### Responsive Design
- **Desktop**: Full layout with side-by-side panels
- **Tablet**: Stacked layout with collapsible cart
- **Mobile**: Single column, cart slides up from bottom

---

## 🔐 Security Features

### Payment Security
- Never store full card numbers
- PCI DSS compliance through Square
- End-to-end encryption for all payment data
- Tokenization of payment methods
- No sensitive payment data in logs

### Admin Security
- Password requirements:
  - Min 10 characters
  - Uppercase + lowercase + number + symbol
  - No common passwords
- Failed login attempt lockout (5 attempts)
- IP-based rate limiting
- Session timeout after 30 minutes inactivity
- Device fingerprinting for suspicious activity detection

### API Security
- API key rotation every 90 days
- Webhook signature verification
- Request signing for sensitive endpoints
- Audit logs for all admin actions

---

## 🧪 Testing Requirements

### Unit Tests
- Authentication logic
- Payment calculation functions
- Inventory adjustment logic
- Tax calculation

### Integration Tests
- Square API integration
- Payment flow end-to-end
- Order creation and retrieval
- Receipt generation

### Manual Testing Checklist
- [ ] Admin can log in successfully
- [ ] Staff can be added/removed
- [ ] Device can be authorized
- [ ] Products can be selected in POS
- [ ] Tax is calculated correctly
- [ ] Tap-to-pay payment succeeds
- [ ] Cash payment is recorded
- [ ] Receipt is generated
- [ ] Order appears in orders list
- [ ] Inventory is updated after sale
- [ ] Reports show correct data
- [ ] Refund can be processed
- [ ] Device access can be revoked
- [ ] Low stock alert triggers

---

## 📱 Square Terminal Integration Steps

### Step 1: Square Developer Account Setup
1. Create account at [developer.squareup.com](https://developer.squareup.com)
2. Create new application
3. Get Application ID and Access Token
4. Enable Terminal API in dashboard

### Step 2: Install Square SDK
```bash
npm install square @square/web-sdk
```

### Step 3: Initialize Square Client (Backend)
```javascript
// /lib/square-terminal.js
import { Client, Environment } from 'square';

const client = new Client({
  environment: process.env.SQUARE_ENV === 'production' 
    ? Environment.Production 
    : Environment.Sandbox,
  accessToken: process.env.SQUARE_ACCESS_TOKEN,
});

export const terminalApi = client.terminalApi;
export const paymentsApi = client.paymentsApi;
```

### Step 4: Create Checkout Endpoint
```javascript
// /app/api/admin/terminal/checkout/route.js
import { terminalApi } from '@/lib/square-terminal';

export async function POST(request) {
  const { deviceId, amountMoney, note } = await request.json();
  
  try {
    const { result } = await terminalApi.createTerminalCheckout({
      checkout: {
        amountMoney,
        deviceOptions: {
          deviceId,
        },
        note,
      },
      idempotencyKey: crypto.randomUUID(),
    });
    
    return Response.json({ checkoutId: result.checkout.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
```

### Step 5: Poll Checkout Status
```javascript
// Frontend: Poll for payment completion
const pollCheckoutStatus = async (checkoutId) => {
  const maxAttempts = 60; // 60 seconds
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    const response = await fetch(`/api/admin/terminal/checkout/${checkoutId}`);
    const { status } = await response.json();
    
    if (status === 'COMPLETED') {
      return { success: true };
    } else if (status === 'CANCELED') {
      return { success: false, message: 'Payment canceled' };
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    attempts++;
  }
  
  return { success: false, message: 'Payment timeout' };
};
```

---

## 🚀 Implementation Phases

### Phase 1: Foundation (Week 1)
- [ ] Set up admin authentication
- [ ] Create admin layout with navigation
- [ ] Build dashboard home with overview
- [ ] Implement user management

### Phase 2: POS Core (Week 2)
- [ ] Build POS interface
- [ ] Implement product selection
- [ ] Add cart functionality
- [ ] Create cash payment option
- [ ] Build receipt generation

### Phase 3: Square Integration (Week 3)
- [ ] Integrate Square SDK
- [ ] Connect to Square account
- [ ] Implement device authorization
- [ ] Add tap-to-pay payment flow
- [ ] Test with Square reader device

### Phase 4: Orders & Inventory (Week 4)
- [ ] Build orders management page
- [ ] Implement inventory tracking
- [ ] Add stock alerts
- [ ] Create refund functionality
- [ ] Build inventory adjustment

### Phase 5: Reports & Analytics (Week 5)
- [ ] Create reports dashboard
- [ ] Add sales charts
- [ ] Implement date filtering
- [ ] Build export functionality
- [ ] Add performance metrics

### Phase 6: Polish & Testing (Week 6)
- [ ] Comprehensive testing
- [ ] Bug fixes
- [ ] Performance optimization
- [ ] Documentation
- [ ] Staff training materials

---

## 📝 Environment Variables

```env
# Admin Authentication
ADMIN_JWT_SECRET=your_jwt_secret_here
ADMIN_SESSION_TIMEOUT=1800000 # 30 minutes

# Square Integration
SQUARE_APPLICATION_ID=your_app_id
SQUARE_ACCESS_TOKEN=your_access_token
SQUARE_LOCATION_ID=your_location_id
SQUARE_ENV=sandbox # or production

# Database
MONGO_URL=mongodb://localhost:27017
DB_NAME=taste_of_gratitude_admin

# Email (for receipts)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASS=your_password

# Site
NEXT_PUBLIC_BASE_URL=https://admin.tasteofgratitude.com
```

---

## 🎯 Success Metrics

### Performance
- POS transaction completion time: < 30 seconds
- Page load time: < 2 seconds
- API response time: < 500ms
- Uptime: > 99.9%

### Business
- Reduce checkout time by 50% vs manual entry
- Process 100+ transactions per market day
- Zero payment errors
- 100% receipt delivery success

---

## 📚 Documentation Deliverables

1. **Admin User Manual** (PDF)
   - How to log in
   - How to process a sale
   - How to add products
   - How to run reports
   - Troubleshooting guide

2. **Technical Documentation**
   - API endpoints reference
   - Database schema
   - Square integration guide
   - Deployment instructions

3. **Video Tutorials**
   - POS walkthrough (5 min)
   - Daily opening/closing procedures (3 min)
   - Handling refunds (2 min)

---

## 🔧 Troubleshooting Common Issues

### Payment Declined
- Check internet connection
- Verify Square reader battery
- Ask customer to try different card
- Fall back to manual entry

### Device Not Responding
- Restart Square reader
- Check Bluetooth connection
- Re-authorize device in settings
- Contact Square support

### Inventory Sync Issues
- Manually trigger sync
- Check API rate limits
- Verify database connection
- Review error logs

---

## 🎨 Branding Guidelines

- Use Taste of Gratitude gold (#D4AF37) for primary actions
- Keep interface clean and minimal
- Use product images from catalog
- Maintain consistent typography (Inter font)
- Follow accessibility guidelines (WCAG AA)

---

## ✅ Final Checklist Before Launch

- [ ] All admin users created and tested
- [ ] Square account connected and verified
- [ ] Test payments completed successfully
- [ ] All devices authorized and tested
- [ ] Inventory synced with online store
- [ ] Tax rates configured correctly
- [ ] Receipt template customized
- [ ] Backup procedures in place
- [ ] Staff trained on POS system
- [ ] Emergency contact list prepared
- [ ] Internet backup plan (mobile hotspot)
- [ ] Cash handling procedures documented

---

**This admin dashboard will enable Taste of Gratitude staff to efficiently process in-person sales at farmers markets with a professional, Square-like tap-to-pay experience!** 🎉
