# Connect ChatGPT in 5 Minutes

Choose the easiest option for you:

---

## Option A: Browser Testing (Easiest - No Setup)

**Time:** 0 minutes  
**Requirements:** Just ChatGPT

### Step 1: Go to ChatGPT
https://chatgpt.com

### Step 2: Give this prompt:
```
You are a QA Tester. Test tasteofgratitude.shop completely.

1. Visit https://tasteofgratitude.shop
2. Take a mental screenshot of the homepage
3. Test these paths:
   - Click on "Catalog"
   - Click on a product
   - Add to cart
   - Go to checkout
   - Enter contact info: John Doe, john@example.com, 404-555-0123
   - Select delivery method
   - Review order
   
4. Report:
   ✅ What works great
   ❌ What breaks
   ⚠️ What needs improvement

Use this format:
HOMEPAGE: [description]
CATALOG: [description]
PRODUCT: [description]
CHECKOUT: [passed/failed and details]
ERROR HANDLING: [tested invalid inputs - passed/failed]
OVERALL: [ready/needs fixes]
```

### Step 3: Read the report
ChatGPT will test your site and describe what it sees.

---

## Option B: ChatGPT Custom Instructions (Quick - 2 min)

**Time:** 2 minutes  
**Requirements:** ChatGPT (Free or Plus)

### Step 1: Open ChatGPT Settings
https://chatgpt.com → Click your profile icon → Settings → Custom instructions

### Step 2: Click "Create new instructions"

### Step 3: In "Instructions" section, paste:
```
You are a QA Tester for Taste of Gratitude (tasteofgratitude.shop).

Your job is to test the website thoroughly and report findings.

When testing, you will:
1. Visit the website mentally (describe what you see)
2. Click links and navigate
3. Fill out forms
4. Test error handling
5. Check mobile responsiveness
6. Note any issues

Test areas:
- Homepage & navigation
- Product catalog
- Shopping cart
- Checkout flow (3 stages)
- Form validation
- Error messages
- Mobile layout

Always report in this format:
✅ PASSED: [what works]
❌ FAILED: [what breaks]
⚠️ WARNING: [concerns]

API Endpoints you can use:
- GET https://tasteofgratitude.shop/api/health
- GET https://tasteofgratitude.shop/api/products
- POST https://tasteofgratitude.shop/api/test/checkout
```

### Step 4: Click Save

### Step 5: Start testing
Just ask: "Test tasteofgratitude.shop and give me a detailed report"

---

## Option C: ChatGPT Actions (Advanced - 5 min)

**Time:** 5 minutes  
**Requirements:** ChatGPT Plus subscription

### Step 1: Go to Custom Actions
https://chatgpt.com/gpts/editor

### Step 2: Create New GPT
- Name: "Taste of Gratitude Tester"
- Description: "Tests and monitors Taste of Gratitude ecommerce site"

### Step 3: Add Instructions
Paste this:
```
You are a QA Test Agent for Taste of Gratitude.
You have access to testing APIs.

Test the site by:
1. Calling GET /api/health to check if site is up
2. Calling GET /api/products to verify products load
3. Calling POST /api/test/checkout with test data
4. Calling GET /api/test/performance to check speed
5. Calling POST /api/test/errors to verify error handling
6. Calling GET /api/sentry/errors to get recent errors
7. Calling POST /api/test/mobile to check mobile

Then visit https://tasteofgratitude.shop in a browser
and manually test the full user journey.

Provide detailed findings.
```

### Step 4: Add Actions
1. Click "Actions" → "Create new action"
2. Select "Import from URL"
3. Paste the OpenAPI schema from the project file:
   - Go to `/workspaces/Gratog/openapi-chatgpt.json`
   - Copy entire contents
   - Paste into ChatGPT Actions

Or upload the file directly if you have it.

### Step 5: Configure Base URL
- Base URL: `https://tasteofgratitude.shop/api`
- Authentication: "None" (for public endpoints)

### Step 6: Save and Test
- Click "Save"
- Ask: "Run a complete test of tasteofgratitude.shop"
- ChatGPT will use the APIs automatically

---

## Option D: Simple API Testing (No AI)

**Time:** 1 minute  
**Requirements:** Terminal or Postman

### Quick health check:
```bash
curl https://tasteofgratitude.shop/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-12-21T21:00:00Z",
  "uptime": 123456
}
```

### Get products:
```bash
curl https://tasteofgratitude.shop/api/products
```

### Test checkout flow:
```bash
curl -X POST https://tasteofgratitude.shop/api/test/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "404-555-0123",
    "fulfillmentType": "delivery",
    "address": {
      "street": "123 Main St",
      "city": "Atlanta",
      "state": "GA",
      "zip": "30301"
    },
    "testMode": true
  }'
```

---

## Testing Prompts for ChatGPT

Once connected, use these prompts:

### Prompt 1: Quick Health Check
```
Check if tasteofgratitude.shop is healthy:
1. Is the homepage responding?
2. Can you see products?
3. Can you access the catalog?
4. No errors showing?

Give me yes/no answers.
```

### Prompt 2: Full Checkout Test
```
Complete a full checkout test:
1. Go to https://tasteofgratitude.shop
2. Go to /catalog
3. Click any product
4. Add to cart
5. Go to checkout
6. Fill contact info:
   - First: Jane
   - Last: Doe
   - Email: jane@example.com
   - Phone: 404-555-0100
7. Select delivery method
8. Enter address:
   - Street: 456 Oak Ave
   - City: Atlanta
   - State: GA
   - Zip: 30301
9. Review order
10. Note any errors

Report what you see at each stage.
```

### Prompt 3: Error Handling Test
```
Test error handling:
1. Try submitting checkout form with empty first name
2. What error message appears?
3. Try with invalid email: "abc@"
4. What error message appears?
5. Try with invalid ZIP: "12345"
6. What error message appears?

For each error:
- Is it user-friendly (or JavaScript error)?
- Can you recover (click back)?
- No "Application Error" page?

Give me detailed findings.
```

### Prompt 4: Mobile Test
```
Emulate iPhone 12 (390x844 screen) and test:
1. Can you see the homepage?
2. Can you tap buttons?
3. Is the menu accessible (hamburger)?
4. Can you fill out a checkout form?
5. Any text too small to read?
6. Any layout broken?

Report what works and what breaks on mobile.
```

### Prompt 5: Performance Check
```
Check performance of tasteofgratitude.shop:
1. How fast does the homepage load?
2. Are there any slow interactions?
3. Do images load smoothly?
4. Is there any lag or stuttering?
5. Do animations feel smooth?

Give me ratings: Fast / Moderate / Slow
```

### Prompt 6: Comprehensive Report
```
Run a comprehensive QA test on tasteofgratitude.shop.

Test areas:
1. FUNCTIONALITY - Does everything work?
2. ERROR HANDLING - Does it handle errors gracefully?
3. FORMS - Do form validations work?
4. MOBILE - Is it mobile responsive?
5. PERFORMANCE - Is it fast?
6. ACCESSIBILITY - Can you keyboard navigate?
7. SECURITY - Do you see any security issues?

Format your report as:

✅ PASSED (what works)
- [item 1]
- [item 2]
- [item 3]

❌ FAILED (what breaks)
- [item 1]
- [item 2]

⚠️ WARNINGS (concerns)
- [item 1]

📊 METRICS
- Load time: __ms
- Responsiveness: [Good/Fair/Poor]
- Errors: [None/Minor/Major]

✨ OVERALL: [READY / NEEDS FIXES]
```

---

## Which Option Should I Choose?

| Option | Effort | Automation | Best For |
|--------|--------|-----------|----------|
| **A: Browser** | 0 min | 50% | Quick testing, no setup |
| **B: Instructions** | 2 min | 60% | Regular testing, easy to use |
| **C: Actions** | 5 min | 90% | Automated testing, API integration |
| **D: API** | 1 min | 100% | Continuous monitoring, CI/CD |

**Recommendation:** Start with **Option A** (0 setup), then move to **Option B** (2 min setup) for regular testing.

---

## Troubleshooting

### "ChatGPT says it can't access the website"
- ChatGPT can describe what it sees but can't actually interact like a browser
- Ask it to describe what it "would" see or what "should" happen
- Use Option C (Actions) for actual API testing

### "ChatGPT doesn't know about the checkout flow"
- Copy the CHATGPT_INTEGRATION_GUIDE.md content to custom instructions
- ChatGPT will have the testing framework available

### "I want real browser automation"
- That requires Playwright (see `playwright.config.ts` in project)
- Or use: https://browserbase.com or https://www.playwright.dev/docs/browsers

### "How do I know tests passed?"
- ChatGPT will tell you ✅ or ❌
- For API testing, check HTTP status codes:
  - 200 = Success
  - 400 = Client error (bad input)
  - 500 = Server error

---

## Next Steps

1. **Right now:** Try Option A (copy/paste a prompt into ChatGPT)
2. **Today:** Set up Option B (2-minute custom instructions setup)
3. **This week:** Implement Option C (5-minute Actions setup) for automation
4. **Ongoing:** Use these regularly to monitor your site

---

## Test Now!

### For Option A (Fastest - Right now):

Go to https://chatgpt.com and paste:

```
Test tasteofgratitude.shop:

1. Is the homepage loading?
2. Can you see 29 products?
3. Can you add an item to cart?
4. Can you start checkout?
5. When you fill the form with valid info, can you proceed?
6. When you fill the form with INVALID info (bad email), do you see an error message (not crash)?

Give me:
✅ Works / ❌ Broken for each item
```

ChatGPT will test the site and report back!

---

## Free Resources

- OpenAPI schema: `/workspaces/Gratog/openapi-chatgpt.json`
- Testing guides: `CHATGPT_INTEGRATION_GUIDE.md`, `QUICK_TEST_CHECKLIST.md`
- API endpoints: `ERROR_MONITORING_GUIDE.md`
- Sentry monitoring: https://sentry.io (errors tracked automatically)

**Everything you need is in the GitHub repo!**
