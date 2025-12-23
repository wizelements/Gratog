# Error Tracking Integration Guide

## Quick Integration Patterns

### API Route Pattern

```typescript
// app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { captureApiError } from '@/lib/error-tracker';

export async function GET(request: NextRequest) {
  try {
    const products = await db.collection('products').find({}).toArray();
    return NextResponse.json({ products });
  } catch (error) {
    // Automatically captures: endpoint, method, status code, memory
    await captureApiError(
      error,
      '/api/products',
      request,
      500
    );
    
    return NextResponse.json(
      { error: 'Failed to fetch products' },
      { status: 500 }
    );
  }
}
```

### Server Action Pattern

```typescript
// lib/actions/checkout.ts
'use server';

import { captureServerError } from '@/lib/error-tracker';

export async function createOrder(data: OrderData) {
  try {
    const order = await db.collection('orders').insertOne(data);
    return { success: true, orderId: order.insertedId };
  } catch (error) {
    await captureServerError(error, undefined, '/actions/checkout');
    throw error;
  }
}
```

### Client Component Pattern

```typescript
// components/CheckoutForm.tsx
'use client';

import { captureClientError } from '@/lib/error-tracker';

export function CheckoutForm() {
  const handleSubmit = async (e: FormEvent) => {
    try {
      await submitPayment(formData);
    } catch (error) {
      await captureClientError(error, 'CheckoutForm');
      showErrorMessage('Payment failed');
    }
  };
  
  return <form onSubmit={handleSubmit}>...</form>;
}
```

### Hydration Safety Pattern

```typescript
// lib/hooks/useTheme.ts
import { captureHydrationError } from '@/lib/error-tracker';

export function useTheme() {
  const [theme, setTheme] = useState('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    const stored = localStorage.getItem('theme');
    if (stored && stored !== theme) {
      captureHydrationError('Theme hydration mismatch', {
        stored,
        default: theme
      });
    }
    setTheme(stored || 'light');
  }, []);

  // Only render after hydration
  if (!mounted) return null;
  
  return { theme };
}
```

### Error Boundary Wrapper Pattern

```typescript
// components/SafeCheckout.tsx
'use client';

import ErrorBoundary from '@/components/ErrorBoundary';
import CheckoutForm from './CheckoutForm';

export default function SafeCheckout() {
  return (
    <ErrorBoundary name="CheckoutSection">
      <CheckoutForm />
    </ErrorBoundary>
  );
}
```

## Integration Checklist

### For API Routes

- [ ] Wrap try-catch
- [ ] Call `captureApiError` on exception
- [ ] Include request and status code
- [ ] Return user-friendly error message
- [ ] Don't expose stack traces to client

```typescript
// Template
export async function POST(request: NextRequest) {
  try {
    // implementation
  } catch (error) {
    await captureApiError(error, '/api/endpoint', request, 500);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

### For Server Components/Actions

- [ ] Wrap try-catch
- [ ] Call `captureServerError` on exception
- [ ] Include action path in endpoint
- [ ] Provide meaningful error message to UI

```typescript
// Template
'use server';

export async function action(data) {
  try {
    // implementation
  } catch (error) {
    await captureServerError(error, undefined, '/actions/name');
    throw new Error('Action failed');
  }
}
```

### For Client Components

- [ ] Wrap async operations
- [ ] Call `captureClientError` on exception
- [ ] Pass component name
- [ ] Show user-friendly toast/modal
- [ ] Don't block UX on error capture

```typescript
// Template
'use client';

const handleAction = async () => {
  try {
    await riskyOperation();
  } catch (error) {
    captureClientError(error, 'ComponentName')
      .catch(() => {}); // Non-blocking
    toast.error('Something went wrong');
  }
};
```

### For Critical Flows

Wrap entire flows with context:

```typescript
export async function criticalFlow(userId, orderId) {
  try {
    const order = await getOrder(orderId);
    await verifyOwnership(userId, orderId);
    await processPayment(order);
    await updateInventory(order);
    return { success: true };
  } catch (error) {
    await captureServerError(error, undefined, '/critical-flow', {
      userId,
      orderId,
      step: 'unknown' // Add step tracking in production
    });
    throw error;
  }
}
```

## Error Categories to Track

Add these categories when capturing:

```typescript
// Memory errors
await captureError(error, {
  category: 'Memory',
  severity: 'critical',
  metadata: { heapUsed: memory.heapUsed }
});

// Hydration errors
await captureHydrationError(error, {
  component: 'ThemeProvider',
  expected: serverValue,
  actual: clientValue
});

// API errors
await captureApiError(error, '/api/checkout', request, 500, {
  cause: 'Database timeout'
});

// Database errors
await captureServerError(error, request, '/db/query', {
  category: 'Database Error',
  query: 'find_products',
  timeout: 5000
});

// Authentication errors
await captureServerError(error, request, '/auth/verify', {
  category: 'Authentication Error',
  reason: 'Invalid token'
});
```

## Monitoring High-Risk Areas

### Payment Processing

```typescript
export async function processPayment(order: Order) {
  const startTime = Date.now();
  
  try {
    const result = await squareClient.payments.create(order);
    
    // Log success with timing
    logger.info('Payment', `Processed ${order.id} in ${Date.now() - startTime}ms`);
    return result;
  } catch (error) {
    await captureApiError(error, '/api/checkout/payment', request, 500, {
      orderId: order.id,
      amount: order.total,
      duration: Date.now() - startTime,
      provider: 'Square'
    });
    throw error;
  }
}
```

### Database Queries

```typescript
export async function queryProducts(filter: any) {
  try {
    const { db } = await connectToDatabase();
    return await db.collection('products').find(filter).toArray();
  } catch (error) {
    await captureServerError(error, undefined, '/db/products', {
      category: 'Database Error',
      collection: 'products',
      filter: JSON.stringify(filter)
    });
    throw error;
  }
}
```

### User Authentication

```typescript
export async function verifyAdminToken(token: string) {
  try {
    const payload = await jwtVerify(token, secretKey);
    return payload;
  } catch (error) {
    await captureServerError(error, undefined, '/auth/verify', {
      category: 'Authentication Error',
      reason: 'Invalid token',
      severity: 'medium'
    });
    return null;
  }
}
```

## Preventing Error Fatigue

### Don't Track These (Too Noisy)

```typescript
// ❌ DON'T track user input validation errors
try {
  email = EmailSchema.parse(userInput);
} catch (error) {
  // This is expected - user typed bad email
  return { error: 'Invalid email' };
}

// ❌ DON'T track known edge cases
try {
  user = await db.users.findOne({ id });
} catch (error) {
  if (error.code === 'NOT_FOUND') {
    // Expected - user doesn't exist
    return null;
  }
  // But DO track unexpected database errors
  await captureServerError(error);
}

// ❌ DON'T track rate limiting
if (rateLimiter.isExceeded(userId)) {
  return { error: 'Too many requests' }; // Don't capture
}
```

### Do Track These (Important)

```typescript
// ✅ DO track unhandled exceptions
try {
  await riskyOperation();
} catch (error) {
  await captureServerError(error); // Always track
}

// ✅ DO track system state issues
if (memory.percentage > 90) {
  await captureError('Memory near limit', {
    category: 'Memory',
    severity: 'critical',
    memory: { percentage: memory.percentage }
  });
}

// ✅ DO track external API failures
try {
  response = await externalAPI.call();
} catch (error) {
  await captureApiError(error, '/external-api'); // Track
}

// ✅ DO track security issues
if (!authorizedUser(request)) {
  await captureServerError('Unauthorized access attempt', {
    category: 'Security',
    severity: 'high',
    ip: request.headers.get('x-forwarded-for')
  });
}
```

## Testing Error Tracking

### Unit Test

```typescript
import { captureError, getStoredErrors, clearErrorStore } from '@/lib/error-tracker';

describe('Error Tracking', () => {
  beforeEach(() => clearErrorStore());
  
  it('captures errors with context', async () => {
    await captureError('Test error', {
      source: 'test',
      category: 'Test Category'
    });
    
    const errors = getStoredErrors();
    expect(errors).toHaveLength(1);
    expect(errors[0].message).toBe('Test error');
  });
});
```

### Integration Test

```typescript
it('captures API errors', async () => {
  const response = await fetch('/api/test-error', { method: 'POST' });
  expect(response.status).toBe(500);
  
  // Check error was captured
  const summary = generateErrorSummary();
  expect(summary.errorCount).toBeGreaterThan(0);
  expect(summary.topErrors[0].message).toContain('Test error');
});
```

### Manual Test

```bash
# 1. Clear errors
curl -X POST \
  -H "Cookie: admin_token=$TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action":"clear"}' \
  https://tasteofgratitude.shop/api/errors/summary

# 2. Trigger an error
curl https://tasteofgratitude.shop/api/test-error

# 3. Check it was captured
curl -H "Cookie: admin_token=$TOKEN" \
  https://tasteofgratitude.shop/api/errors/summary | jq '.summary.errorCount'
```

## Performance Impact

Error tracking has minimal overhead:

| Operation | Latency | Notes |
|-----------|---------|-------|
| `captureError()` | <1ms | Async, non-blocking |
| `generateErrorSummary()` | 5-50ms | Depends on stored error count |
| `/api/errors/summary` | 50-100ms | Includes analysis |
| `/api/errors/list` | 20-50ms | Paginated query |

**Optimization:** Error capture runs async and doesn't block request handling.

```typescript
// Non-blocking capture
captureError(error).catch(console.error); // Fire and forget
```

## Production Checklist

- [ ] All API routes have try-catch with error capture
- [ ] Critical server actions have error capture
- [ ] Client components wrap async operations
- [ ] Error boundaries are placed at layout/page level
- [ ] API errors include request context
- [ ] Hydration issues are detected and logged
- [ ] Memory errors are monitored
- [ ] Error summaries are checked daily
- [ ] Admin dashboard has error links in playbooks
- [ ] Error IDs are included in user-facing error pages

## Related Documentation

- [ERROR_TRACKING_SYSTEM.md](./ERROR_TRACKING_SYSTEM.md) - Technical reference
- [ERROR_INVESTIGATION_QUICKSTART.md](./ERROR_INVESTIGATION_QUICKSTART.md) - How to investigate
- [lib/error-tracker.ts](./lib/error-tracker.ts) - Source code
