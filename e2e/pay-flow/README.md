# 🧪 Gratog Pay Flow — E2E Testing Guide

Complete end-to-end testing suite for the mobile-first checkout flow.

## 📁 Test Structure

```
e2e/pay-flow/
├── pay-flow.spec.ts          # Main test suite
├── README.md                 # This file
└── fixtures/                 # Test data (if needed)
    └── products.json
```

## 🚀 Quick Start

```bash
# Install Playwright browsers (one-time)
npx playwright install

# Run all pay-flow tests
npm run test:pay

# Run with visible browser
npm run test:pay:headed

# Run smoke tests only (critical path)
npm run test:pay:smoke

# Debug mode (step through tests)
npm run test:pay:debug

# View last report
npm run test:pay:report
```

## 🎯 Test Coverage

### Product Browsing
- ✅ Products load and display
- ✅ Category filtering works
- ✅ Search with debounce
- ✅ Empty states handled

### Cart Operations
- ✅ Add to cart
- ✅ Increment/decrement quantity
- ✅ Remove item from cart
- ✅ Clear cart
- ✅ Stock limit enforcement
- ✅ Cart total calculations

### Payment Flow
- ✅ Proceed to payment
- ✅ Square card form loads
- ✅ Empty cart validation
- ✅ Total calculation accuracy

### Staff Mode
- ✅ PIN authentication
- ✅ Invalid PIN rejection
- ✅ Stock management
- ✅ Availability toggling

### Error Handling
- ✅ Network error recovery
- ✅ Payment error handling
- ✅ Graceful degradation

### Performance
- ✅ Page load under 3s
- ✅ 60fps during scroll
- ✅ Responsive on mobile

## 📱 Test Devices

| Device | Viewport | Use Case |
|--------|----------|----------|
| iPhone 14 | 390×844 | Primary mobile |
| Pixel 7 | 412×915 | Android testing |
| iPhone 14 Pro Max | 430×932 | Large screens |
| Desktop Chrome | 1280×720 | Regression |

## 🔧 Configuration

`playwright.config.payflow.ts`:

```typescript
// Mobile-first configuration
projects: [
  { name: 'chromium-mobile', use: devices['iPhone 14'] },
  { name: 'firefox-mobile', use: devices['Pixel 7'] },
  { name: 'webkit-mobile', use: devices['iPhone 14 Pro Max'] },
]
```

## 🎭 Writing Tests

### Basic Pattern

```typescript
test('should add product to cart', async ({ page }) => {
  // Arrange
  await page.goto('/pay');
  
  // Act
  await page.click('[data-testid="product-card-add"]').first();
  
  // Assert
  const cartButton = page.locator('[data-testid="cart-button"]');
  await expect(cartButton).toContainText('1');
});
```

### Mobile-Specific

```typescript
test('should swipe to dismiss', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  
  // Swipe gesture
  await page.locator('[data-testid="cart-panel"]').swipe({
    start: { x: 200, y: 500 },
    end: { x: 200, y: 800 }
  });
});
```

## 🏷️ Data Test IDs

Components use `data-testid` attributes for stable selectors:

| Component | Test ID |
|-----------|---------|
| Product card | `product-card` |
| Add button | `product-card-add` |
| Cart panel | `cart-panel` |
| Checkout button | `checkout-button` |
| Quantity increment | `quantity-increment` |
| Quantity decrement | `quantity-decrement` |
| Quantity value | `quantity-value` |
| Remove item | `remove-item` |
| Clear cart | `clear-cart` |
| Empty cart | `empty-cart` |
| Cart subtotal | `cart-subtotal` |
| Cart tax | `cart-tax` |
| Cart total | `cart-total` |

## 🔄 CI/CD Integration

Tests run automatically on:
- Push to `main` or `develop`
- PRs touching pay-flow code
- Manual dispatch via Actions tab

### GitHub Actions Workflow

`.github/workflows/pay-flow-e2e.yml`:

- Security scan with TruffleHog
- npm audit for vulnerabilities
- Lighthouse CI for performance
- E2E tests across all browsers

## 🐛 Debugging Failed Tests

### Local Debug

```bash
# Step through test
npm run test:pay:debug

# Slow motion (visible actions)
PWDEBUG=1 npm run test:pay

# Keep browser open
PWDEBUG=console npm run test:pay
```

### CI Artifacts

Download from GitHub Actions:
- Screenshots on failure
- Video recordings
- Full HTML report
- Trace files

### Common Issues

| Issue | Solution |
|-------|----------|
| Tests flaky | Add `await page.waitForLoadState('networkidle')` |
| Element not found | Check `data-testid` exists in component |
| Timeout | Increase `test.setTimeout()` for slow operations |
| Mobile-only failure | Check viewport is set correctly |

## 📊 Performance Benchmarks

| Metric | Target | Current |
|--------|--------|---------|
| Page load | <3s | TBD |
| Time to interactive | <1.5s | TBD |
| First contentful paint | <1s | TBD |
| Lighthouse score | >90 | TBD |

## 🔐 Security Testing

- CSRF token validation
- Price manipulation attempts
- XSS injection in search
- SQL injection attempts
- Session fixation tests

## 📝 Test Data

Use mock data for consistent testing:

```typescript
// Mock products with known prices
test.beforeEach(async ({ page }) => {
  await page.route('**/api/products', async (route) => {
    await route.fulfill({
      status: 200,
      body: JSON.stringify(mockProducts)
    });
  });
});
```

## 🎯 Success Criteria

All tests must pass before deployment:

- [ ] Product browsing works
- [ ] Cart operations complete
- [ ] Payment flow succeeds
- [ ] Staff mode functions
- [ ] Error handling graceful
- [ ] Mobile UX smooth
- [ ] Performance targets met
- [ ] Security scans clean

## 🚀 Next Steps

1. Add visual regression testing
2. Implement A/B test support
3. Add analytics verification
4. Expand to full checkout flow
5. Load testing with k6
