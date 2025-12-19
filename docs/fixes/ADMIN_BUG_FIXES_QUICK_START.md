# Admin Dashboard - Quick Fix Guide

## 🔴 CRITICAL FIXES (Do Now - 30 mins)

### 1. Protect Cleanup Endpoint
**File:** `/workspaces/Gratog/app/api/admin/cleanup-sandbox/route.js`

```javascript
import { requireAdmin } from '@/lib/admin-session';

export async function GET(request) {
  const admin = await requireAdmin(request);  // ADD THIS
  // ... rest of code
}

export async function POST(request) {
  const admin = await requireAdmin(request);  // ADD THIS
  // ... rest of code
}
```

---

### 2. Fix Infinite SetInterval
**File:** `/workspaces/Gratog/app/admin/orders/page.js#L53-L58`

Change from:
```javascript
useEffect(() => {
  fetchOrders();
  const interval = setInterval(() => fetchOrders(false), 30000);
  return () => clearInterval(interval);
}, [fetchOrders]);  // ❌ This causes new intervals
```

To:
```javascript
useEffect(() => {
  fetchOrders();
  const interval = setInterval(() => fetchOrders(false), 30000);
  return () => clearInterval(interval);
}, []);  // ✓ Empty dependency - interval runs once
```

---

### 3. Add response.ok to Dashboard Fetches
**File:** `/workspaces/Gratog/app/admin/page.js#L31-L90`

Add checks before `.json()` calls:

```javascript
const fetchDashboardData = async () => {
  try {
    const response = await fetch('/api/admin/products');
    if (!response.ok) throw new Error('Failed to fetch');  // ADD THIS
    const data = await response.json();
    // ...
  } catch (error) {
    // existing error handling
  }
};

const fetchOrders = async () => {
  try {
    const response = await fetch('/api/admin/orders');
    if (!response.ok) throw new Error('Failed to fetch');  // ADD THIS
    const data = await response.json();
    // ...
  } catch (error) {
    // existing error handling
  }
};

const fetchSyncStatus = async () => {
  try {
    const response = await fetch('/api/admin/orders/sync');
    if (!response.ok) throw new Error('Failed to fetch');  // ADD THIS
    const data = await response.json();
    // ...
  } catch (error) {
    // existing error handling
  }
};
```

---

### 4. Remove Token from localStorage (Campaigns)
**Files:**
- `/workspaces/Gratog/app/admin/campaigns/page.js#L27`
- `/workspaces/Gratog/app/admin/campaigns/new/page.js#L67, L91, L133`

Replace ALL instances of:
```javascript
headers: {
  'Authorization': `Bearer ${localStorage.getItem('admin_token')}`
}
```

With:
```javascript
credentials: 'include'
```

The httpOnly cookie is sent automatically, no need for manual token handling.

---

## 🟠 HIGH PRIORITY FIXES (Next 1-2 hours)

### 5. Add credentials Parameter to All Fetches
Search for `fetch('/api/admin/` in all admin pages and add:
```javascript
{ credentials: 'include' }
```

Files needing fixes:
- `/workspaces/Gratog/app/admin/page.js` - Lines 33, 54, 81
- `/workspaces/Gratog/app/admin/products/page.js` - Lines 26, 40
- `/workspaces/Gratog/app/admin/orders/page.js` - Line 41
- `/workspaces/Gratog/app/admin/inventory/page.js` - Line 35
- `/workspaces/Gratog/app/admin/coupons/page.js` - Lines 34, 51
- `/workspaces/Gratog/app/admin/customers/page.js` - Line 27
- `/workspaces/Gratog/app/admin/settings/page.js` - Line 13
- `/workspaces/Gratog/app/admin/setup/page.js` - Lines 27, 43
- `/workspaces/Gratog/app/admin/waitlist/page.js` - Line 21
- `/workspaces/Gratog/app/admin/layout.js` - Lines 48, 64

---

### 6. Add response.ok to All Other Fetch Calls
Add `if (!response.ok)` check before calling `.json()` on:
- `/workspaces/Gratog/app/admin/products/page.js#L26-L27`
- `/workspaces/Gratog/app/admin/products/page.js#L40-L43`
- `/workspaces/Gratog/app/admin/orders/page.js#L41-L42`
- `/workspaces/Gratog/app/admin/inventory/page.js#L35-L36`
- `/workspaces/Gratog/app/admin/coupons/page.js#L34-L35`
- `/workspaces/Gratog/app/admin/coupons/page.js#L51-L63`
- `/workspaces/Gratog/app/admin/customers/page.js#L27-L28`
- `/workspaces/Gratog/app/admin/settings/page.js#L13-L14`
- `/workspaces/Gratog/app/admin/setup/page.js#L27-L28`
- `/workspaces/Gratog/app/admin/setup/page.js#L43-L49`
- `/workspaces/Gratog/app/admin/waitlist/page.js#L21-L22`
- `/workspaces/Gratog/app/admin/layout.js#L48-L51`

---

### 7. Fix Stale Closures in Dashboard
**File:** `/workspaces/Gratog/app/admin/page.js#L25-L90`

Move function definitions INSIDE useEffect:

```javascript
useEffect(() => {
  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/admin/products', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      if (data.products) {
        const lowStock = data.products.filter(p => p.stock <= p.lowStockThreshold);
        setLowStockProducts(lowStock);
        setStats(prev => ({ ...prev, lowStockCount: lowStock.length, totalProducts: data.products.length }));
      }
    } catch (error) {
      logger.error('Admin', 'Failed to fetch dashboard data', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await fetch('/api/admin/orders', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      if (data.orders) {
        const orders = data.orders;
        const today = new Date().toDateString();
        const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === today);
        const todaySales = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
        const totalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
        setStats(prev => ({ ...prev, todayOrders: todayOrders.length, todaySales: todaySales / 100, totalOrders: orders.length, totalRevenue: totalRevenue / 100 }));
        setRecentOrders(orders.slice(0, 5));
      }
    } catch (error) {
      logger.error('Admin', 'Failed to fetch orders', error);
    }
  };

  const fetchSyncStatus = async () => {
    try {
      const response = await fetch('/api/admin/orders/sync', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      if (data.lastSync) {
        setLastSync(new Date(data.lastSync));
      }
    } catch (error) {
      logger.debug('Admin', 'Could not fetch sync status');
    }
  };

  fetchDashboardData();
  fetchOrders();
  fetchSyncStatus();
}, []);  // ← Empty dependency array is safe now
```

---

### 8. Fix Order Status Race Condition
**File:** `/workspaces/Gratog/app/admin/orders/page.js#L98-L130`

Add guard at start:
```javascript
const updateOrderStatus = async (orderId, newStatus) => {
  if (updatingStatus) return;  // ADD THIS - prevent concurrent updates
  setUpdatingStatus(true);
  try {
    // ... rest of function unchanged
  } finally {
    setUpdatingStatus(false);
  }
};
```

---

### 9. Fix Customer Segment Stale Closure
**File:** `/workspaces/Gratog/app/admin/customers/page.js#L18-L35`

Move function inside useEffect:
```javascript
useEffect(() => {
  const fetchCustomers = async () => {
    try {
      const params = new URLSearchParams();
      if (segment !== 'all') params.append('segment', segment);
      
      const response = await fetch(`/api/customers?${params}`, { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch');
      const data = await response.json();
      setCustomers(data.customers || []);
    } catch (error) {
      logger.error('Admin', 'Failed to fetch customers', error);
    } finally {
      setLoading(false);
    }
  };
  
  setLoading(true);
  fetchCustomers();
}, [segment]);  // ← segment in dependency array
```

---

## 🟡 MEDIUM PRIORITY FIXES (Next sprint)

### 10. Add CSV Export Error Handling
**File:** `/workspaces/Gratog/app/admin/coupons/page.js#L105-L131`

```javascript
const exportCoupons = () => {
  try {
    const csv = [
      ['Code', 'Email', 'Discount', 'Free Shipping', 'Type', 'Used', 'Created', 'Expires'],
      ...coupons.map(coupon => [
        coupon.code,
        coupon.customerEmail,
        `$${(coupon.discountAmount / 100).toFixed(2)}`,
        coupon.freeShipping ? 'Yes' : 'No',
        coupon.type,
        coupon.isUsed ? 'Yes' : 'No',
        new Date(coupon.createdAt).toLocaleDateString(),
        new Date(coupon.expiresAt).toLocaleDateString()
      ])
    ];
    
    const csvContent = csv.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `coupons-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Coupons exported successfully');  // ADD THIS
  } catch (error) {  // ADD THIS
    logger.error('Admin', 'Export failed', error);
    toast.error('Failed to export coupons');
  }
};
```

---

### 11. Change CSRF SameSite from lax to strict
**File:** `/workspaces/Gratog/lib/admin-session.ts#L233`

```javascript
response.cookies.set('admin_token', token, {
  sameSite: 'strict',  // Change from 'lax' to 'strict'
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  maxAge: TOKEN_EXPIRY
});
```

---

### 12. Remove Hardcoded Default Passwords
**File:** `/workspaces/Gratog/scripts/create-admin-user.js#L33-L37`

Generate random password instead:
```javascript
const crypto = require('crypto');
const password = crypto.randomBytes(16).toString('hex');
// Don't print to console, return to user through secure channel
```

---

## ⏱️ Time Estimates

| Fix | Time | Impact |
|-----|------|--------|
| Fix cleanup endpoint | 5 min | 🔴 Critical |
| Fix infinite setInterval | 10 min | 🔴 Critical |
| Add response.ok checks | 45 min | 🔴 Critical |
| Remove token from localStorage | 15 min | 🔴 Critical |
| Add credentials parameter | 30 min | 🟠 High |
| Fix stale closures | 30 min | 🟠 High |
| Fix race condition | 10 min | 🟠 High |
| CSV error handling | 10 min | 🟡 Medium |
| Change SameSite | 5 min | 🟡 Medium |

**Total: ~2.5 hours for all critical & high priority fixes**

---

## Testing Checklist

After applying fixes:

- [ ] Admin can login
- [ ] Dashboard loads with correct data
- [ ] Orders page shows all orders
- [ ] Products sync works
- [ ] Status updates don't duplicate
- [ ] Customer segment filter works
- [ ] Inventory adjustments work
- [ ] Coupons can be created/deleted
- [ ] CSV export works
- [ ] Page doesn't hang on slow connection
- [ ] Navigating away cancels pending requests
- [ ] No React warnings in console
- [ ] Memory usage stable over time
- [ ] Can't access cleanup endpoint without auth

