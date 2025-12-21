# ChatGPT Integration Guide - Testing & Monitoring

This guide explains how to set up ChatGPT to test and monitor your Taste of Gratitude site using Agent Mode.

---

## Option 1: ChatGPT Actions (Recommended)

### Step 1: Create OpenAPI Schema
✅ Already done - see `openapi-chatgpt.json` in project root

### Step 2: Set Up ChatGPT Action
1. Go to [ChatGPT Custom Actions](https://chatgpt.com/gpts/editor)
2. Click **"Create New Action"**
3. **Name:** "Taste of Gratitude Tester"
4. **Description:** "Test and monitor the Taste of Gratitude e-commerce site"

### Step 3: Configure Authentication
1. In the action settings, select **Authentication Type:** "OAuth 2.0"
2. Or for simpler setup: **"API Key"** (pass in headers)
3. Add your API key if you have one, or leave empty for public endpoints

### Step 4: Import OpenAPI Schema
1. Click **"Import from URL"**
2. Paste the OpenAPI schema content from `openapi-chatgpt.json`
3. Or upload the file directly
4. Click **"Import"**

### Step 5: Configure Endpoints
- **Base URL:** `https://tasteofgratitude.shop/api`
- Verify all endpoints are imported correctly

### Step 6: Test the Action
```
User prompt: "Test if the Taste of Gratitude site is healthy"

ChatGPT will:
1. Call GET /api/health
2. Parse the response
3. Tell you if site is up
```

---

## Option 2: Custom ChatGPT Instructions

If you don't want to use Actions, provide these instructions to ChatGPT:

### Instructions to Copy-Paste:

```
You are a Quality Assurance Tester for Taste of Gratitude (https://tasteofgratitude.shop).

Your role is to:
1. Test all critical user journeys
2. Verify error handling works correctly
3. Check performance metrics
4. Monitor for "Something went wrong" errors
5. Report findings clearly

When testing:
- Use the website directly (visit pages, click buttons, fill forms)
- Describe what you see (take mental screenshots)
- Report any errors, broken links, or UI issues
- Check mobile responsiveness
- Test form validation
- Verify checkout flow

Use this testing framework:
1. HEALTH CHECK: Is the site up?
2. FUNCTIONALITY: Do all features work?
3. ERROR HANDLING: Does the site handle errors gracefully?
4. PERFORMANCE: Is it fast?
5. ACCESSIBILITY: Can everyone use it?

Format your report as:
✅ PASSED: [description]
❌ FAILED: [description]
⚠️  WARNING: [description]

API Endpoints Available:
- GET /api/health - Check if site is up
- GET /api/products - Get all products
- POST /api/test/checkout - Test checkout flow
- POST /api/test/errors - Test error handling
- GET /api/test/performance - Get performance metrics
- GET /api/sentry/errors - Get recent errors
- GET /api/test/accessibility - Run accessibility audit
- POST /api/test/mobile - Test mobile responsiveness
```

---

## Option 3: GPT-4 with Browser Extension

### Setup:
1. Install [ChatGPT for Web extension](https://chrome.google.com/webstore)
2. Use this prompt:

```
You are a QA Tester. Test the Taste of Gratitude website (tasteofgratitude.shop).

Create a comprehensive test report covering:

## 1. SITE HEALTH
- Is the homepage loading? (screenshot in your mind)
- Are all main sections visible?
- Any error messages?

## 2. CRITICAL PATHS
### Path A: Browse and Purchase
1. Go to /catalog
2. Click on any product
3. Add to cart
4. Go to checkout
5. Fill contact info (First, Last, Email, Phone)
6. Select delivery method
7. Review order
8. Take note of any errors

### Path B: Error Recovery
1. Try submitting empty checkout form
2. Verify error messages appear (not crashes)
3. Try with invalid email
4. Try with invalid ZIP code

## 3. MOBILE TEST
- Resize to 390px width
- Is the layout responsive?
- Can you tap buttons easily?
- Is the checkout usable?

## 4. PERFORMANCE
- Page load time feels fast?
- Any laggy interactions?
- Images load correctly?

## 5. ERROR HANDLING
- Are error messages user-friendly?
- Is there recovery options?
- No "Application Error" page?

## 6. ACCESSIBILITY
- Can you tab through the page?
- Are form labels clear?
- Is contrast good?

Provide detailed findings with:
✅ What works great
❌ What breaks
⚠️  What needs improvement
```

---

## Option 4: Automated Testing via API

### Setup Test Automation:

```bash
# 1. Create test script
cat > test-site.sh << 'EOF'
#!/bin/bash

echo "🧪 Testing Taste of Gratitude..."

# Health check
echo "1. Health Check..."
curl -s https://tasteofgratitude.shop/api/health | jq .

# Products
echo "2. Products..."
curl -s https://tasteofgratitude.shop/api/products?limit=5 | jq .

# Performance
echo "3. Performance Metrics..."
curl -s https://tasteofgratitude.shop/api/test/performance | jq .

# Errors
echo "4. Recent Errors..."
curl -s https://tasteofgratitude.shop/api/sentry/errors | jq .

echo "✅ Tests complete"
EOF

# 2. Run tests
bash test-site.sh
```

---

## Test Prompts for ChatGPT Agent Mode

Use these prompts to have ChatGPT test specific aspects:

### Test 1: Full User Journey
```
"Use Agent Mode to complete a full checkout test on tasteofgratitude.shop:
1. Visit homepage
2. Go to catalog
3. Click a product
4. Add to cart
5. Go to checkout
6. Enter test contact info:
   - First: Jane
   - Last: Doe
   - Email: jane@example.com
   - Phone: 404-555-0123
7. Select delivery method
8. Review order
9. Screenshot each stage
10. Report any errors or issues"
```

### Test 2: Error Handling
```
"Test error handling by:
1. Try to submit checkout with empty first name
2. Try with invalid email (abc@)
3. Try with invalid ZIP (12345)
4. For each error:
   - Screenshot the error message
   - Verify it's user-friendly (not JavaScript error)
   - Click 'Try again'
   - Verify you can recover"
```

### Test 3: Mobile Responsiveness
```
"Emulate an iPhone 12 (390x844) and test:
1. Does homepage layout work?
2. Can you tap buttons easily?
3. Is the menu accessible (hamburger)?
4. Can you complete a checkout on mobile?
5. Any layout breaking?
6. Take screenshots at each step"
```

### Test 4: Performance Check
```
"Measure performance of tasteofgratitude.shop:
1. Open DevTools (F12)
2. Go to Network tab
3. Reload page
4. Check:
   - Total load time
   - Largest Contentful Paint (LCP)
   - First Contentful Paint (FCP)
5. Open Lighthouse
6. Run audit
7. Report all scores"
```

### Test 5: Accessibility Check
```
"Check accessibility:
1. Open DevTools
2. Install axe DevTools extension
3. Run scan on homepage
4. Report any violations
5. Test keyboard navigation:
   - Tab through all links
   - Can you reach all buttons?
   - Does focus ring appear?
6. Check color contrast"
```

---

## What ChatGPT Agent Mode Can Do

✅ **Can Do:**
- Visit web pages
- Click links and buttons
- Fill out forms
- Take screenshots (describe what's visible)
- Read error messages
- Navigate between pages
- Test complete user journeys
- Verify form validation
- Check responsiveness

⚠️ **Limitations:**
- Can't execute JavaScript directly (browser does that)
- Can't access browser DevTools (describe findings instead)
- Can't process payments (use test mode)
- Can't modify site code (read-only)

---

## Expected Results

### Successful Test Report Example:

```
🎯 TASTE OF GRATITUDE - COMPREHENSIVE TEST REPORT

✅ HOMEPAGE
- Loads without errors
- Shows 29 products
- Navigation menu works
- Hero section displays correctly

✅ CHECKOUT FLOW
- Stage 1 (Cart): Shows cart items and totals ✓
- Stage 2 (Details): Form validation works ✓
- Stage 3 (Review): Order summary displays ✓

❌ ERRORS FOUND
- None! Site is stable

⚠️ NOTES
- Mobile layout responsive ✓
- Payment form properly secured ✓
- Error boundaries working (tested with invalid input) ✓

📊 PERFORMANCE
- Homepage loads in ~200ms
- Lighthouse score: 92
- No layout shifts observed

✨ CONCLUSION
Site is production-ready. All critical paths work.
Error handling is graceful (no "Application Error" pages).
```

---

## Integration with CI/CD

To automatically test on every deployment:

```yaml
# .github/workflows/test-staging.yml
name: Test Staging Deployment

on:
  deployment_status:
    types: [created]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Health Check
        run: curl -f https://tasteofgratitude.shop/api/health

      - name: Test Products API
        run: curl -f https://tasteofgratitude.shop/api/products

      - name: Get Performance Metrics
        run: |
          curl -s https://tasteofgratitude.shop/api/test/performance | jq .
```

---

## Support & Debugging

### If tests fail:
1. Check site status: `curl https://tasteofgratitude.shop`
2. Check Sentry: View errors in Sentry dashboard
3. Check logs: View Vercel deployment logs
4. Check network: Verify API endpoints are accessible
5. Check browser: Try different browser (Chrome, Firefox, Safari)

### Common Issues:
- **"Site returned 500 error"** → Check Vercel logs
- **"Checkout fails"** → Check Square payment config
- **"Element not found"** → Might be dynamic content
- **"Mobile layout broken"** → Check responsive styles

---

## Next Steps

1. **Set up ChatGPT Action** (Option 1) - Most automated
2. **Copy custom instructions** (Option 2) - Quick setup
3. **Provide API endpoints** (Option 3) - Best for monitoring
4. **Run scheduled tests** (Option 4) - Continuous monitoring

Choose the option that best fits your workflow!
