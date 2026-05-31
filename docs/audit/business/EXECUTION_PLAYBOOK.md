# EXECUTION_PLAYBOOK — Full restoration, end to end

> The complete sequence to get from commit `f9d20e98` (working canonical checkout, 41 defects, 64 missing routes) to "boringly reliable, defensible, fully restored" state.
>
> Written as a runbook. One step at a time. Each step has goal, files, code, tests, validation, deploy, rollback, smoke.
>
> Solo-dev assumption: Termux Android, Amp CLI, Vercel deploy, no headless browser locally (phone-browser smoke only).
>
> **Hard rule:** canonical guest checkout (cart → `/api/orders/create` → `/api/payments` → `/order/success` → email) must keep working after every step. Verify with phone-browser sandbox after every deploy.

---

## PHASE 0 — Pre-flight (hour 1)

**Goal:** known-good state captured, rollback known, env audited.

### 0.1 Tag known-good commit
```bash
cd /data/data/com.termux/files/home/Gratog-live
git fetch --all
git rev-parse HEAD                  # confirm f9d20e98 or newer
git tag -a known-good-f9d20e98 -m "Last verified canonical checkout works" f9d20e98
git push cod3black --tags           # or wizelements — verify Vercel-linked remote
```

### 0.2 Verify Vercel project link
```bash
vercel projects ls
cat .vercel/project.json 2>/dev/null || vercel link
```
Identify which remote (cod3black/Gratog-live or wizelements/Gratog) is connected to the production deployment hook. Write the answer here: `_____________`.

### 0.3 Capture current production env list
```bash
vercel env ls production > docs/audit/business/_prod-env-snapshot.txt
```
Sanity check that these exist: `MONGODB_URI`, `SQUARE_ACCESS_TOKEN`, `SQUARE_LOCATION_ID`, `SQUARE_APPLICATION_ID`, `SQUARE_ENVIRONMENT`, `SQUARE_WEBHOOK_SIGNATURE_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_WEBHOOK_SECRET`, `JWT_SECRET`, `ADMIN_API_KEY`, `MASTER_API_KEY`, `CRON_SECRET`, `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_SITE_URL`, `SENTRY_DSN`.

### 0.4 Verify Square sandbox is configured
Confirm there is a sandbox env at preview deployments (separate `SQUARE_ENVIRONMENT=sandbox` env on preview). If not, set it now — sandbox is required for every smoke check.

### 0.5 Create working branch
```bash
git checkout -b restore/tier1
```
Every step below produces ONE atomic commit on this branch (or short-lived sub-branch). No combined PRs.

### 0.6 Document rollback
Add to `docs/SMOKE.md` (will be created in Phase 1):
- Vercel dashboard → Deployments → previous successful → "Promote to Production"
- `git revert <sha>` and push to redeploy
- Tag `known-good-f9d20e98` available

### 0.7 Confirm DB backup posture
Atlas → cluster → Backup → snapshot policy. Verify retention covers at least 7 days. **Do not proceed if backups disabled.**

**Phase 0 done when:** known-good tag pushed, Vercel remote identified, env list captured, branch created.

---

## PHASE 1 — Safety net (hours 2-4)

**Goal:** prevent the *next* `04768656`. Catch regressions before customers do.

### 1.1 Route-coverage CI guard
**File:** `scripts/check-route-coverage.js` (new)

Logic:
1. Walk `app/`, `components/`, `services/`, `lib/`, `stores/` for `/api/...` string literals.
2. Walk `app/api/` for actual `route.{ts,js,tsx,jsx}` files.
3. Normalize both lists (handle `[id]` dynamic segments, strip noise like `/api/payments/route`).
4. Compare against allowlist `scripts/_route-coverage-allowlist.json`.
5. Exit 1 if any reference resolves to nothing AND is not allowlisted.

**Allowlist seed:** the current 64 missing routes (so CI passes today). New misses fail CI immediately.

**Wire:**
```json
// package.json scripts
"check:routes": "node scripts/check-route-coverage.js"
"prebuild": "npm run check:routes"   // optional but recommended
```

**Test:** add a known bad reference in a scratch file; run `npm run check:routes` — must fail. Remove the scratch reference.

**Commit:** `feat(ci): add route-coverage guard with allowlist`

### 1.2 Production smoke checklist
**File:** `docs/SMOKE.md` (new)

Content:
- 10 steps from phone browser:
  1. Open `https://tasteofgratitude.shop/catalog`
  2. Open one product
  3. Add to cart
  4. Open cart drawer, click Checkout
  5. Fill contact + pickup
  6. Apply known test coupon (if any)
  7. Pay with Square sandbox card `4111 1111 1111 1111`
  8. Land on `/order/success`
  9. Confirm email arrives at test inbox
  10. Open `/admin/orders` — confirm order appears

- Curl checks:
  - `curl -i https://tasteofgratitude.shop/api/health` → 200
  - `curl -i https://tasteofgratitude.shop/api/health/payments` → 200
  - `curl -i https://tasteofgratitude.shop/api/square/diagnose` → 404 after Phase 2
  - `curl -i https://tasteofgratitude.shop/api/debug/square` → 404 after Phase 2

**Commit:** `docs: add post-deploy smoke checklist`

### 1.3 Disable swallowed typecheck
**File:** `package.json`

Current:
```json
"typecheck": "tsc --noEmit --skipLibCheck || echo 'TypeScript errors found but continuing...'"
```

Replace with:
```json
"typecheck": "tsc --noEmit --skipLibCheck"
"prebuild": "npm run check:routes && npm run typecheck"
```

If this breaks the build (existing TS errors), fix the most egregious or use `// @ts-expect-error` with TODO comments. Do **not** restore swallowing.

**Commit:** `chore(build): re-enable typecheck as a real gate`

### 1.4 Smoke + deploy
```bash
npm install
npm run check:routes
npm run typecheck
npm test                            # if Termux can run; otherwise targeted vitest
git push cod3black restore/tier1
vercel --prod=false                 # deploy to preview
```
Wait for preview URL. Run smoke checklist against preview. If green, proceed; if not, fix and re-deploy.

**Phase 1 done when:** route-guard PR merged to main, deployed to prod, smoke checklist green.

---

## PHASE 2 — Security perimeter (hours 4-8 today, or day 2)

**Goal:** stop the active exploit paths that don't touch revenue logic. Low blast radius.

### 2.1 Lock down public diagnostics
**Files:**
- `app/api/debug/square/route.ts`
- `app/api/square/diagnose/route.ts`
- `app/api/square/test-rest/route.ts`
- `app/api/square/validate-token/route.ts`
- `app/api/startup/route.ts`
- `app/diagnostic/page.js`
- `app/test-auth/page.js`

**Pattern (per route):**
```ts
import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  // existing handler
}
```

For pages:
```js
// app/diagnostic/page.js
import { notFound } from 'next/navigation';
export default function Page() {
  if (process.env.NODE_ENV === 'production') notFound();
  // existing JSX
}
```

**Test:** add a unit test `tests/security/diagnostics-prod-404.spec.ts` that asserts each handler returns 404 when `NODE_ENV=production`.

**Validation:**
```bash
curl -i https://<preview-url>/api/square/diagnose      # expect 404
curl -i https://<preview-url>/api/debug/square         # expect 404
curl -i https://<preview-url>/diagnostic               # expect 404
```

**Commit:** `fix(security): 404 dev/diagnostic routes in production`

### 2.2 Signed admin session cookie
**Files:**
- `lib/auth/admin-session.ts` (new) — sign/verify with `JWT_SECRET` or new `ADMIN_SESSION_SECRET`
- `app/api/admin/auth/login/route.ts` — on valid creds, set `admin_session` cookie with signed JWT, not raw API key
- `app/api/admin/auth/logout/route.ts` — clear cookie
- `app/api/admin/auth/me/route.ts` — verify cookie, return session info
- `middleware.ts` — read `admin_session` cookie, verify signature, allow; reject otherwise

**Helper sketch:**
```ts
// lib/auth/admin-session.ts
import { SignJWT, jwtVerify } from 'jose';

const SECRET = new TextEncoder().encode(
  process.env.ADMIN_SESSION_SECRET || process.env.JWT_SECRET || ''
);
const ALG = 'HS256';
const TTL = '8h';

export async function issueAdminSession(payload: { sub: string; role: 'admin' | 'master' }) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(TTL)
    .setIssuer('gratog-admin')
    .sign(SECRET);
}

export async function verifyAdminSession(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET, { issuer: 'gratog-admin' });
    return payload as { sub: string; role: 'admin' | 'master' };
  } catch {
    return null;
  }
}
```

**middleware.ts:**
```ts
import { verifyAdminSession } from '@/lib/auth/admin-session';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith('/admin') && !pathname.startsWith('/api/admin')) {
    return NextResponse.next();
  }
  if (pathname === '/admin/login' || pathname.startsWith('/admin/login/')) {
    return NextResponse.next();
  }
  const token = request.cookies.get('admin_session')?.value
    || request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return redirectToLogin(request, pathname);
  const session = await verifyAdminSession(token);
  if (!session) return redirectToLogin(request, pathname);
  return NextResponse.next();
}
```

**login route:**
```ts
// inside POST handler, after credential check passes:
const { password } = await req.json();
if (password !== process.env.ADMIN_API_KEY && password !== process.env.MASTER_API_KEY) {
  return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
}
const role = password === process.env.MASTER_API_KEY ? 'master' : 'admin';
const token = await issueAdminSession({ sub: 'admin', role });
const res = NextResponse.json({ success: true });
res.cookies.set('admin_session', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  maxAge: 60 * 60 * 8,
  path: '/'
});
return res;
```

**Tests:**
- unit: `lib/auth/admin-session.spec.ts` — sign/verify, invalid token, expired token.
- integration: login route sets cookie that is NOT the literal API key.
- middleware: rejects without cookie; accepts with valid; rejects with tampered.

**Validation:**
- Log in to `/admin/login` on preview.
- Devtools → Application → Cookies — confirm `admin_session` value is a JWT (`eyJ…`), not the env API key.
- `curl https://<preview>/api/admin/orders` → 401.
- `curl -H "Cookie: admin_session=<the-jwt>" https://<preview>/api/admin/orders` → 200.

**Commit:** `feat(security): signed admin session cookie replaces literal API key`

### 2.3 Rotate `ADMIN_API_KEY` and `MASTER_API_KEY`
**After 2.2 is deployed to prod:**
```bash
# generate new values
openssl rand -hex 32   # use for ADMIN_API_KEY
openssl rand -hex 32   # use for MASTER_API_KEY
vercel env rm ADMIN_API_KEY production
vercel env add ADMIN_API_KEY production    # paste new
vercel env rm MASTER_API_KEY production
vercel env add MASTER_API_KEY production   # paste new
vercel --prod                              # redeploy
```

**Validation:** old cookie value (if you have one stored) should no longer authenticate. Log back in with new password.

**Commit:** none for the rotation itself; document in `docs/SMOKE.md` "secrets rotated YYYY-MM-DD".

### 2.4 Verify CRON_SECRET enforcement
**Files to check:** `app/api/cron/*/route.{ts,js}`

Each should start with:
```ts
const authHeader = req.headers.get('authorization');
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

If any are missing this, add it.

**Validation:**
```bash
curl -i https://<preview>/api/cron/daily-report                            # expect 401
curl -i -H "Authorization: Bearer <CRON_SECRET>" https://<preview>/api/cron/daily-report  # expect 200
```

**Commit:** `fix(security): enforce CRON_SECRET on all cron routes`

**Phase 2 done when:** diagnostics 404 in prod, admin cookie is a signed JWT, secrets rotated, cron secret enforced. Smoke checklist still green.

---

## PHASE 3 — Revenue integrity (day 2-3)

**Goal:** close the 4 active revenue-leak paths inside the canonical funnel.

### 3.1 Server-authoritative price rebuild at order creation
**Files:**
- `lib/cart-pricing.ts` (new) — extract reusable helper
- `app/api/orders/create/route.js` — use it
- `app/api/cart/price/route.ts` — refactor to use it (single source of truth)

**Helper:**
```ts
// lib/cart-pricing.ts
import { getProductByVariation } from '@/lib/storefront-products';
import { applyCoupon } from '@/lib/coupons';

export interface CartInput {
  variationId?: string;
  catalogObjectId?: string;
  productId?: string;
  quantity: number;
}

export interface PricedItem {
  productId: string;
  variationId: string | null;
  name: string;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
  rewardPoints: number;
  // ...passthrough fields needed by orders
}

export interface PricedCart {
  items: PricedItem[];
  subtotalCents: number;
  discountCents: number;
  deliveryFeeCents: number;
  tipCents: number;
  taxCents: number;
  totalCents: number;
  appliedCoupon: { code: string; discountCents: number } | null;
}

export async function priceCart(
  input: CartInput[],
  opts: {
    fulfillmentType?: 'pickup' | 'delivery';
    deliveryFeeCents?: number;
    tipCents?: number;
    couponCode?: string | null;
  }
): Promise<PricedCart> {
  if (!input?.length) throw new Error('Cart is empty');
  const items: PricedItem[] = [];
  for (const it of input) {
    const product = await getProductByVariation({
      variationId: it.variationId,
      catalogObjectId: it.catalogObjectId,
      productId: it.productId
    });
    if (!product) throw new Error(`Unknown product/variation: ${JSON.stringify(it)}`);
    const unitCents = Math.round(product.priceCents);   // server-authoritative
    const qty = Math.max(1, Math.floor(it.quantity || 1));
    const lineCents = unitCents * qty;
    items.push({
      productId: product.id,
      variationId: product.variationId ?? null,
      name: product.name,
      unitPriceCents: unitCents,
      quantity: qty,
      lineTotalCents: lineCents,
      rewardPoints: product.rewardPoints || 0,
      // ...
    });
  }
  const subtotalCents = items.reduce((s, i) => s + i.lineTotalCents, 0);
  const deliveryFeeCents = opts.deliveryFeeCents ?? 0;
  const tipCents = opts.tipCents ?? 0;
  let discountCents = 0;
  let appliedCoupon: PricedCart['appliedCoupon'] = null;
  if (opts.couponCode) {
    const result = await applyCoupon(opts.couponCode, subtotalCents);
    if (result.valid) {
      discountCents = result.discountCents;
      appliedCoupon = { code: result.code, discountCents };
    }
  }
  const taxCents = 0;  // Square handles tax at payment; or implement locally if needed
  const totalCents = Math.max(0, subtotalCents + deliveryFeeCents + tipCents + taxCents - discountCents);
  return { items, subtotalCents, deliveryFeeCents, tipCents, discountCents, taxCents, totalCents, appliedCoupon };
}
```

**Use in `/api/orders/create`:**
```js
const priced = await priceCart(orderData.cart, {
  fulfillmentType: orderData.fulfillmentType,
  deliveryFeeCents: Math.round((orderData.deliveryFee || 0) * 100),
  tipCents: Math.round((orderData.deliveryTip || 0) * 100),
  couponCode: orderData.appliedCoupon?.code || orderData.couponCode
});
// build enhancedOrder from priced.* — NEVER from client subtotal/total/price
const enhancedOrder = {
  id: orderId,
  // ...
  items: priced.items.map(asOrderItem),
  subtotal: priced.subtotalCents / 100,
  total: priced.totalCents / 100,
  subtotalCents: priced.subtotalCents,
  totalCents: priced.totalCents,
  appliedCoupon: priced.appliedCoupon,
  // ...
};
```

**Tests:**
- `tests/unit/cart-pricing.spec.ts` — happy path; unknown variation rejects; coupon applies; quantity ≥1 enforced.
- `tests/api/orders-create-tamper.spec.ts` — submit `{ price: 0.01 }`, assert stored `totalCents` matches catalog.

**Validation (preview):**
```bash
# tampered request — should be ignored
curl -X POST https://<preview>/api/orders/create \
  -H 'Content-Type: application/json' \
  -d '{
    "customer":{"email":"test@example.com","name":"Tamper","phone":"+15551234567"},
    "cart":[{"variationId":"<real-id>","price":0.01,"quantity":1,"name":"Anything"}],
    "subtotal":0.01,"total":0.01,
    "fulfillmentType":"pickup"
  }'
# Response total should be the REAL catalog total, not 0.01.
```

Phone-browser smoke: full guest checkout with normal cart. Confirm $ charged matches PDP.

**Commit:** `fix(orders): server-authoritative pricing prevents tampering`

### 3.2 Remove pre-payment side effects
**Files:**
- `lib/transactions.ts` — strip coupon `$inc` and customer `$inc totals` from `createOrderAtomic`. Keep order insert + customer upsert (without `$inc totals`).
- `app/api/orders/create/route.js` — remove `awardRewardPointsWithRetry` call.
- `app/api/payments/route.ts` — add coupon `$inc usedCount` + `usageHistory.push` and customer `$inc totalOrders + totalSpent` blocks, inside the existing `isCompleted` branch, using a single condition that prevents duplicates.

**Pattern (payments route, in success block):**
```ts
// Customer LTV (idempotent: guard by orderId)
if (customerInfo?.email && isCompleted) {
  const already = await db.collection('customers').findOne(
    { email: customerInfo.email, processedPaidOrderIds: orderId },
    { projection: { _id: 1 } }
  );
  if (!already) {
    await db.collection('customers').updateOne(
      { email: customerInfo.email },
      {
        $inc: { totalOrders: 1, totalSpent: validatedAmountCents / 100 },
        $addToSet: { processedPaidOrderIds: orderId },
        $set: { lastOrderAt: new Date(), lastOrderId: orderId, updatedAt: new Date() }
      },
      { upsert: true }
    );
  }
}

// Coupon usedCount (idempotent by orderId)
if (order?.appliedCoupon?.code && isCompleted) {
  const couponRes = await db.collection('coupons').updateOne(
    { code: order.appliedCoupon.code.toUpperCase(), 'usageHistory.orderId': { $ne: orderId } },
    {
      $inc: { usedCount: 1 },
      $set: { lastUsedAt: new Date() },
      $push: { usageHistory: { orderId, customerEmail: customerInfo?.email, usedAt: new Date(), discountAmount: order.appliedCoupon.discountCents / 100 } }
    }
  );
  if (couponRes.modifiedCount === 0) {
    logger.warn('API', 'Coupon $inc no-op (already counted for this order)', { code: order.appliedCoupon.code, orderId });
  }
}
```

**Note:** drop the existing `order.coupon.code` block (line 1015) — replace with the above reading `order.appliedCoupon.code`. Drop the `isUsed: true` flag pattern; standardize on `usedCount` + `usageHistory[]`.

**Tests:**
- `tests/api/orders-create-no-prepayment-side-effects.spec.ts` — assert `coupons.usedCount` unchanged after order create; assert `customers.totalOrders` unchanged.
- `tests/api/payments-post-success-effects.spec.ts` — assert single increment after success; assert retry on the same payment does not double-increment.

**Validation (preview):**
- Create order with coupon; do not pay; check Mongo: `coupons.find({code: 'X'}).usedCount` unchanged.
- Pay; check `usedCount` incremented to +1.
- Retry payment POST on same orderId; check still +1.

**Commit:** `fix(checkout): move coupon + customer LTV + rewards to payment success only`

### 3.3 Single-source rewards on payment success
Already partially done in 3.2 by removing the order-create reward call. Confirm `rewardsSystem.addPoints` at `payments/route.ts#L998` is idempotent on `(email, orderId, activityType='purchase')`. If not, wrap it.

**Pattern:**
```ts
// in payments route, where addPoints is called
if (customerInfo?.email && isCompleted && rewardsSystem) {
  const pointsToAward = Math.ceil(validatedAmountCents / 100);
  // ensure addPoints uses orderId-scoped idempotency
  await rewardsSystem.addPoints(customerInfo.email, pointsToAward, 'purchase', { orderId, amountCents: validatedAmountCents });
}
```

In `lib/enhanced-rewards.ts` confirm `addPoints` upserts conditional on `(email, activityData.orderId)`. If it doesn't, modify it:
```ts
await db.collection('rewards').updateOne(
  { email, 'activities.orderId': { $ne: orderId } },
  {
    $inc: { points: pointsToAward, lifetimePoints: pointsToAward },
    $push: { activities: { type, points: pointsToAward, ...activityData, at: new Date() } },
    $set: { updatedAt: new Date() }
  },
  { upsert: true }
);
```

**Test:** invoke `addPoints` twice with same orderId; assert single increment.

**Commit:** `fix(rewards): idempotent on orderId — eliminate double-award`

### 3.4 Smoke + deploy
```bash
git push cod3black restore/tier1
vercel --prod=false
# run smoke from phone
# run tamper curl
# check Mongo state
vercel --prod    # only after green
```

**Phase 3 done when:** real customer pays real price; coupon counts once; rewards counts once; smoke green.

---

## PHASE 4 — Email lifecycle (day 4-5)

**Goal:** stop silent failures; close legal exposure.

### 4.1 Write `email_sends` on every Resend transactional send
**File:** `lib/resend-email.js`

In `sendEmail` (around line 35-80):
```js
import { connectToDatabase } from '@/lib/db-optimized';

async function logEmailSend(record) {
  try {
    const { db } = await connectToDatabase();
    await db.collection('email_sends').insertOne({
      ...record,
      createdAt: new Date()
    });
  } catch (err) {
    logger.error('Email', 'email_sends insert failed', { err: err.message });
    Sentry.captureException(err);
    // never throw — email tracking must not break send
  }
}

export async function sendEmail({ to, subject, html, text, replyTo, emailType, from }) {
  const fromAddress = from || (emailType ? getFromAddress(emailType) : DEFAULT_FROM);
  try {
    if (resend) {
      const result = await resend.emails.send({ from: fromAddress, to, subject, html, text, replyTo: replyTo || EMAIL_SENDERS.support.address });
      if (result.error) {
        await logEmailSend({
          provider: 'resend', to, from: fromAddress, subject, emailType,
          status: 'failed', error: result.error.message || JSON.stringify(result.error)
        });
        return { success: false, error: result.error.message, provider: 'resend' };
      }
      await logEmailSend({
        provider: 'resend', to, from: fromAddress, subject, emailType,
        status: 'sent', messageId: result.data?.id || null, sentAt: new Date()
      });
      return { success: true, messageId: result.data?.id, provider: 'resend' };
    }
    // mock mode
    await logEmailSend({ provider: 'mock', to, from: fromAddress, subject, emailType, status: 'mocked' });
    return { success: true, provider: 'mock' };
  } catch (err) {
    await logEmailSend({ provider: 'resend', to, from: fromAddress, subject, emailType, status: 'error', error: err.message });
    throw err;
  }
}
```

**Verify webhook update path:** `app/api/webhooks/resend/route.js` should `updateOne({ messageId }, { $set: { status: event.type } , $push: { events: ... } })`. If it uses a different key name, align.

**Tests:**
- `tests/unit/email-sends-tracking.spec.ts` — mock Resend, assert insertOne called with messageId on success.
- `tests/api/resend-webhook-update.spec.ts` — webhook with messageId updates the row.

**Validation:**
- Trigger order confirmation on preview.
- `db.email_sends.find().sort({createdAt:-1}).limit(3)` — row exists with `messageId`.
- Resend dashboard → click on the sent email → "Replay webhook" → row updates to `delivered`.

**Commit:** `fix(email): track every transactional Resend send in email_sends`

### 4.2 Restore `/api/unsubscribe`
**File:** `app/api/unsubscribe/route.ts` (new)

```ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { verifyUnsubscribeToken } from '@/lib/email/service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  const email = req.nextUrl.searchParams.get('email');
  return handle({ token, email });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  return handle({ token: body.token, email: body.email });
}

async function handle({ token, email }: { token?: string | null; email?: string | null }) {
  let unsubEmail = email?.trim().toLowerCase();
  if (token) {
    const decoded = verifyUnsubscribeToken(token);
    if (!decoded) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });
    unsubEmail = decoded.email.toLowerCase();
  }
  if (!unsubEmail) return NextResponse.json({ error: 'Email or token required' }, { status: 400 });
  const { db } = await connectToDatabase();
  await db.collection('unsubscribes').updateOne(
    { email: unsubEmail },
    { $set: { email: unsubEmail, unsubscribedAt: new Date() }, $setOnInsert: { source: 'web' } },
    { upsert: true }
  );
  await db.collection('notification_preferences').updateOne(
    { email: unsubEmail },
    { $set: { marketing: false, updatedAt: new Date() } },
    { upsert: true }
  );
  return NextResponse.json({ success: true });
}
```

**Test:** valid token unsubscribes; invalid token 400; email-only unsubscribes.

**Validation:** click unsubscribe link in a real campaign email; confirm Mongo update.

**Commit:** `feat(email): restore /api/unsubscribe (CAN-SPAM compliance)`

### 4.3 Restore `/api/contact`
**File:** `app/api/contact/route.ts` (new)

```ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { sendEmail } from '@/lib/resend-email';
import { SUPPORT_EMAIL } from '@/lib/site-config';
import { rateLimit } from '@/lib/security/redis';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const ok = await rateLimit(`contact:${ip}`, 5, 60 * 60);   // 5 per hour per IP
  if (!ok) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const name = String(body.name || '').trim().slice(0, 100);
  const email = String(body.email || '').trim().toLowerCase().slice(0, 200);
  const message = String(body.message || '').trim().slice(0, 5000);
  const subject = String(body.subject || 'Website contact').trim().slice(0, 200);

  if (!name || !email || !message) {
    return NextResponse.json({ error: 'Name, email, and message are required' }, { status: 400 });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  const { db } = await connectToDatabase();
  const id = crypto.randomUUID();
  await db.collection('communications').insertOne({
    id, type: 'contact_form', name, email, subject, message, ip,
    createdAt: new Date(), status: 'new'
  });

  await sendEmail({
    to: SUPPORT_EMAIL,
    subject: `[Contact] ${subject} — ${name}`,
    html: `<p><b>From:</b> ${name} &lt;${email}&gt;</p><p>${message.replace(/\n/g, '<br/>')}</p>`,
    text: `From: ${name} <${email}>\n\n${message}`,
    replyTo: email,
    emailType: 'contact_form'
  });

  return NextResponse.json({ success: true });
}
```

**Test:** valid submit returns 200 + DB row + email send (mocked); invalid email rejected; rate limit kicks in.

**Validation (preview):**
```bash
curl -X POST https://<preview>/api/contact \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test","email":"test@example.com","message":"hi"}'
```
Confirm `communications` row + email arrives at support inbox.

**Commit:** `feat(contact): restore /api/contact with rate-limit + persistence`

### 4.4 Drop dead SendGrid dep
```bash
npm uninstall @sendgrid/mail
git add package.json package-lock.json
git commit -m "chore(deps): drop unused @sendgrid/mail"
```

Build to confirm nothing imports it.

**Phase 4 done when:** transactional sends visible in `email_sends`; unsubscribe + contact live; smoke green.

---

## PHASE 5 — Admin daily-ops (day 6-7)

**Goal:** make the daily operator workflow complete with zero workarounds.

### 5.1 `/api/admin/inventory` (list)
**File:** `app/api/admin/inventory/route.ts` (new)

```ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const lowOnly = req.nextUrl.searchParams.get('low') === '1';
  const { db } = await connectToDatabase();
  const filter = lowOnly ? { quantity: { $lte: 5 } } : {};
  const rows = await db.collection('inventory').find(filter).limit(500).toArray();
  return NextResponse.json({ items: rows });
}
```

**Test:** returns array; `?low=1` filters.

**Commit:** `feat(admin): restore /api/admin/inventory list view`

### 5.2 `/api/admin/orders/update-status`
**File:** `app/api/admin/orders/update-status/route.ts` (new)

```ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';

export const dynamic = 'force-dynamic';

const ALLOWED = ['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled'];

export async function POST(req: NextRequest) {
  const { orderIds, status } = await req.json();
  if (!Array.isArray(orderIds) || !orderIds.length) {
    return NextResponse.json({ error: 'orderIds required' }, { status: 400 });
  }
  if (!ALLOWED.includes(status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }
  const { db } = await connectToDatabase();
  const res = await db.collection('orders').updateMany(
    { id: { $in: orderIds } },
    { $set: { status, updatedAt: new Date() }, $push: { statusHistory: { status, at: new Date() } } }
  );
  return NextResponse.json({ success: true, matched: res.matchedCount, modified: res.modifiedCount });
}
```

**Test:** invalid status rejected; happy path updates many.

**Commit:** `feat(admin): restore /api/admin/orders/update-status bulk action`

### 5.3 `/api/admin/orders/sync`
**File:** `app/api/admin/orders/sync/route.ts` (new)

```ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db-optimized';
import { searchSquareOrders } from '@/lib/square-orders-sync';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { since } = await req.json().catch(() => ({}));
  const sinceDate = since ? new Date(since) : new Date(Date.now() - 24 * 60 * 60 * 1000);
  const { db } = await connectToDatabase();
  const squareOrders = await searchSquareOrders({ since: sinceDate });
  let updated = 0;
  for (const sq of squareOrders) {
    const local = await db.collection('orders').findOne({ squareOrderId: sq.id });
    if (!local) continue;
    await db.collection('orders').updateOne(
      { id: local.id },
      { $set: { squareFulfillmentState: sq.fulfillments?.[0]?.state, squareUpdatedAt: new Date(sq.updatedAt) } }
    );
    updated += 1;
  }
  return NextResponse.json({ success: true, scanned: squareOrders.length, updated });
}
```

**Note:** verify `lib/square-orders-sync.js` exposes a `searchSquareOrders` function or adapt. Use Square SDK `ordersApi.searchOrders` if not.

**Commit:** `feat(admin): restore /api/admin/orders/sync from Square`

### 5.4 `/api/admin/auth/reset-password`
**Files:** `app/api/admin/auth/reset-password/route.ts` (new) + email template

**Pattern (for a single-operator simple flow):**
- POST `/api/admin/auth/reset-password` with `{ email }` → if email is the configured `ADMIN_NOTIFY_EMAIL`, mint a reset token (JWT 1 h TTL), email it.
- GET `/api/admin/auth/reset-password?token=...` → verify token, show form.
- POST `/api/admin/auth/reset-password/confirm` with `{ token, newPassword }` → if valid, rotate `ADMIN_API_KEY` env via Vercel API (out of scope; manual rotation may be enough). Alternative: store admin password hash in DB and check that on login (more invasive — defer).

**Simplest viable:** the reset link logs a one-time signed message to a Sentry / log channel, and the operator manually rotates the env from Vercel dashboard. Not ideal but unblocks a lockout.

**Commit:** `feat(admin): restore admin password reset (one-time link via email)`

### 5.5 Wire admin UI to new endpoints
- `app/admin/inventory/page.js` — call `/api/admin/inventory` for list.
- `app/admin/orders/page.js` — add bulk-select + status dropdown + "Sync with Square" button.

**Test:** admin pages render and trigger expected APIs.

**Phase 5 done when:** operator can do the daily checklist (orders, refunds, status update, inventory, reviews) end-to-end with zero manual Mongo edits.

---

## PHASE 6 — Hide / remove dead surfaces (day 8)

**Goal:** every visible CTA either works or is gone.

### 6.1 Hide unsupported customer pages

Approach: redirect to homepage or 404 from each unsupported page in production.

**Files to convert to redirect-or-404:**
- `app/login/page.js`
- `app/register/page.js`
- `app/forgot-password/page.js`
- `app/reset-password/page.js`
- `app/profile/page.js`, `app/profile/orders/page.js`, `app/profile/rewards/page.js`, `app/profile/settings/page.js`, `app/profile/challenge/page.js`
- `app/wishlist/page.js`
- `app/quiz/page.js`, `app/quiz/results/[id]/page.js`
- `app/subscriptions/page.js`
- `app/account/page.tsx`, `app/account/subscriptions/*`
- `app/reviews/page.jsx` (until 7.x restores reviews)
- `app/ugc/*`
- `app/explore/games/*`, `app/explore/learn/*` (unless intentionally surfaced)
- `app/order-v2/page.tsx`, `app/order/*` (parallel checkout)
- `app/pay/page.tsx`, `app/checkout/square/page.js`, `app/checkout/success/page.js`
- `app/test-auth/page.js`, `app/diagnostic/page.js`

**Pattern per page:**
```js
import { redirect } from 'next/navigation';
export default function Page() {
  if (process.env.NODE_ENV === 'production') redirect('/');
  // keep dev experience: original JSX below
  return /* … */;
}
```

Or full removal — but tracking redirects is safer if any external link still points.

### 6.2 Remove nav/footer/header links to hidden pages
**Files:** `components/Header.tsx`, `components/Footer.tsx`, `components/MobileMenu.tsx`, `components/cart/*`, etc.

Find any `<Link href="/login">`, `/register`, `/wishlist`, `/quiz`, `/subscriptions`, `/profile`, etc. — remove or wrap in `process.env.NEXT_PUBLIC_FEATURES_ACCOUNTS === '1'` checks.

### 6.3 Hide admin features without backends
**Files:** `app/admin/page.js`, admin sidebar/nav component.

Remove links to:
- `/admin/queue` (unless markets need it)
- `/admin/waitlist`
- `/admin/interactions`
- Notifications broadcast buttons
- Campaign "Generate with AI" / "Send Test" buttons

### 6.4 Remove deprecated API routes
Either delete or short-circuit:
- `app/api/checkout/route.ts`
- `app/api/create-checkout/route.ts`
- `app/api/pay/process/route.ts`

Pattern:
```ts
import { NextResponse } from 'next/server';
export async function POST() { return NextResponse.json({ error: 'Deprecated. Use /api/orders/create + /api/payments.' }, { status: 410 }); }
```

**Test:** route-coverage guard still passes (these were not in the missing list); deprecated routes return 410.

**Commit:** `chore(cleanup): hide unsupported surfaces; deprecate parallel checkout`

**Phase 6 done when:** route-guard passes; every link in production goes somewhere live; smoke green.

---

## PHASE 7 — Tier 2 trust loops (day 9-12)

**Goal:** restore the surfaces that compound conversion.

### 7.1 Newsletter signup
**Files:**
- `app/api/newsletter/subscribe/route.ts` (new)
- `app/api/nurture/subscribe/route.ts` (new) — can alias to newsletter for now

**Pattern:**
```ts
const { db } = await connectToDatabase();
await db.collection('email_subscribers').updateOne(
  { email },
  { $set: { email, source, subscribedAt: new Date() }, $setOnInsert: { confirmed: false } },
  { upsert: true }
);
const token = generateConfirmationToken({ email });
await sendEmail({
  to: email,
  subject: 'Confirm your subscription',
  html: `Click to confirm: <a href="${BASE}/api/newsletter/confirm?token=${token}">Confirm</a>`,
  emailType: 'newsletter_confirmation'
});
return NextResponse.json({ success: true });
```

Add `/api/newsletter/confirm` (GET) — flips `confirmed: true`.

**Test + rate-limit + smoke.**

**Commit:** `feat(email): restore newsletter signup + double opt-in`

### 7.2 Public reviews
**Files:**
- `app/api/reviews/route.ts` (new) — GET list (by productId) + POST submit
- `app/api/reviews/helpful/route.ts` (new) — POST `$inc helpfulCount`

**Pattern:** insert into `product_reviews` with `status: 'pending'` by default; admin moderates via existing `/api/admin/reviews`.

**Test:** invalid productId rejected; submission persisted; helpful increments once per (review, ip).

**Commit:** `feat(reviews): public submit + helpful vote`

### 7.3 Basic recommendations
**File:** `app/api/recommendations/route.ts` (new)

Heuristic: aggregate `orders` for last 90 days; group by item co-occurrence; surface top 5 for given productId. If sparse data, fall back to "same category bestsellers".

**Commit:** `feat(recs): basic frequently-bought-together`

### 7.4 Public coupon validation
**Files:**
- `app/api/coupons/validate/route.ts` (new) — `{ code }` → returns `{ valid, discountCents }` or 404.
- `app/api/coupons/create/route.ts` (new) — admin-gated (require admin session).

Use shared `lib/coupons.ts` helper for validation logic so checkout and `/api/cart/price` share it.

**Commit:** `feat(coupons): public validate + admin create`

### 7.5 Abandoned-cart cron
**Files:**
- `app/api/cron/cleanup-abandoned-orders/route.ts` (new)
- `vercel.json` cron entry (daily 4 AM)

Logic: find `orders` where `status: 'pending'`, `paymentStatus: 'pending'`, `createdAt < now - 30 min`. For each:
- Mark `status: 'expired'`.
- If `customerEmail` present and `abandonedEmailSent !== true`, send recovery email + set flag.

**Test:** verify cron secret enforcement.

**Commit:** `feat(ops): abandoned-cart cleanup + recovery email`

**Phase 7 done when:** newsletter live, reviews live, recommendations live, coupon validate live, abandoned-cart automation running.

---

## PHASE 8 — Tier 2 conversion (day 13-14)

### 8.1 Apple Pay / Google Pay via Square Web SDK
**File:** `components/checkout/Payment.tsx`

Square Web Payments SDK supports `payments.applePay({...})` and `payments.googlePay({...})`. Add buttons above card form. Same tokenize → `/api/payments` pipeline.

**Test:** Apple Pay button only renders on Safari; Google Pay only renders if user is signed into Google Pay.

**Commit:** `feat(checkout): Apple Pay + Google Pay express buttons`

### 8.2 Trust signals on PDP
- Star rating aggregate (from `product_reviews`).
- "X bought in last week" if data permits.
- Security badges in checkout footer (Square logo, "secure payment").

**Commit:** `feat(trust): aggregate ratings + checkout trust signals`

### 8.3 Background music opt-in
Default: off. Show small floating button bottom-right. User clicks → enable. Persist preference in `localStorage`.

**Commit:** `feat(ux): background music opt-in instead of auto-play`

**Phase 8 done when:** express pay live; trust signals visible; music respects user.

---

## PHASE 9 — Final validation + handoff (day 15)

### 9.1 Run full validation suite
```bash
npm run check:routes
npm run typecheck
npm test
npm run build
```
All must pass with zero errors.

### 9.2 Production smoke (full)
Execute every step of `docs/SMOKE.md`. Document outcome in `docs/audit/business/_smoke-YYYY-MM-DD.md`.

### 9.3 Security verification
```bash
curl -i https://tasteofgratitude.shop/api/square/diagnose          # 404
curl -i https://tasteofgratitude.shop/api/debug/square             # 404
curl -i https://tasteofgratitude.shop/api/startup                  # 404
curl -i https://tasteofgratitude.shop/api/cron/daily-report        # 401
curl -i https://tasteofgratitude.shop/diagnostic                   # 404
curl -i https://tasteofgratitude.shop/test-auth                    # 404
```

Tamper test:
```bash
curl -X POST https://tasteofgratitude.shop/api/orders/create \
  -H 'Content-Type: application/json' \
  -d '{"customer":{"email":"t@t.com","name":"x","phone":"+15551111111"},
       "cart":[{"variationId":"<real>","price":0.01,"quantity":1,"name":"X"}],
       "subtotal":0.01,"total":0.01,"fulfillmentType":"pickup"}'
# Response total must equal catalog total, not 0.01
```

Admin cookie verification:
```bash
# log in, then in browser devtools:
# document.cookie  → admin_session=<JWT>, not the env key
```

### 9.4 Email tracking verification
- Send a real test email via `/api/contact`.
- Confirm `email_sends` row exists with `messageId`.
- In Resend dashboard → replay webhook for that send → confirm row status updates to `delivered`.

### 9.5 Update audit docs
- Mark each defect in [MASTER_DEFECT_LOG.md](file:///data/data/com.termux/files/home/Gratog-live/docs/audit/MASTER_DEFECT_LOG.md) as ✅ resolved with commit SHA.
- Create `docs/audit/business/RESOLUTION_LOG.md` mapping each defect → commit SHA → verification result.
- Update [SUPPORTED_SURFACES.md](file:///data/data/com.termux/files/home/Gratog-live/docs/SUPPORTED_SURFACES.md) — list every live customer page + admin page.

### 9.6 Document operating procedure
**File:** `docs/RUNBOOK.md` (new)

Sections:
- "How to log in as admin"
- "How to issue a refund"
- "How to update inventory"
- "How to send a campaign"
- "How to handle a bounce notification"
- "How to roll back a bad deploy"
- "How to rotate Square credentials"
- "How to rotate admin session secret"

### 9.7 Final commit + tag
```bash
git checkout main
git merge --no-ff restore/tier1
git tag -a v1.0-boringly-reliable -m "Tier 1+2 restoration complete: full revenue path hardened, admin daily ops complete, email lifecycle compliant"
git push --tags
vercel --prod
# run smoke one last time on prod
```

**Phase 9 done when:** all defects resolved, all smoke green, runbook published, prod tagged.

---

## What is intentionally NOT in this playbook

Per the audit's "defer until business scales" classification:

- Customer accounts (`/api/auth/register`, `/api/auth/login`, `/api/auth/reset-password`, `/profile/*`, `/wishlist`, `/account`).
- Quiz system.
- Subscriptions system.
- Learning modules.
- UGC submission.
- Waitlist.
- Notifications subsystem (broadcast/send/market-day/new-product/stats).
- AI campaign generation.
- Admin interactions analytics.
- Passport scan/stamp QR features (unless market days actively need them — separate trigger).
- Queue admin (same — trigger on market-day use).
- `/api/v1` versioning prefix.
- Full RBAC.
- A/B test admin.
- Stable customer surrogate id migration.

These are documented as Tier 3 in [RESTORATION_TIERS.md](file:///data/data/com.termux/files/home/Gratog-live/docs/audit/business/RESTORATION_TIERS.md). Restore when actual business demand justifies the maintenance cost.

---

## Total scope of this playbook

| Phase | Days | Outcome |
|---|---|---|
| 0 — Pre-flight | 1 hour | Known-good tagged; rollback known; backups confirmed |
| 1 — Safety net | 2-3 hours | Route-guard live; smoke checklist written; typecheck real |
| 2 — Security perimeter | 4-6 hours | Diagnostics 404; signed admin cookie; secrets rotated |
| 3 — Revenue integrity | 1-2 days | Price tampering blocked; rewards single-award; coupons correct; LTV correct |
| 4 — Email lifecycle | 1 day | Tracking + unsubscribe + contact live |
| 5 — Admin daily-ops | 1-2 days | Operator works without manual Mongo |
| 6 — Hide/remove | 4-6 hours | No broken CTAs anywhere |
| 7 — Trust loops | 3-4 days | Newsletter + reviews + recs + coupons + abandoned-cart |
| 8 — Conversion | 1-2 days | Express pay + trust signals + music opt-in |
| 9 — Validation + handoff | 1 day | Smoke green; runbook published; tagged |
| **TOTAL** | **~15 working days** (~3 calendar weeks at solo-dev pace) | **Boringly reliable, defensible, fully restored, compliant.** |

## Commit count estimate

~25-30 atomic commits. Each tagged with `fix:`, `feat:`, `chore:`, `docs:` per Conventional Commits.

## Risk envelope

- **Highest-risk steps:** 3.1 (price rebuild), 3.2 (side-effect timing), 2.2 (admin session) — each touches a critical path. Each gets its own PR + preview deploy + phone smoke + Mongo verification before merging to main.
- **Mandatory after every push to main:** Vercel preview → phone-browser sandbox checkout → if pass, promote to prod.
- **Rollback target:** `known-good-f9d20e98` tag or previous successful Vercel deployment.

## What "extreme completion" looks like at the end

After day 15:

1. Customers complete checkouts on every device, every time.
2. Every dollar collected matches catalog.
3. Every coupon counts exactly once.
4. Every reward earns exactly once.
5. Every email send is tracked and bounces are visible.
6. Every unsubscribe works.
7. Every contact-form submission lands in your inbox AND in Mongo.
8. Newsletter list grows; double opt-in works.
9. Reviews appear on PDPs with star ratings.
10. Apple/Google Pay buttons render on supported browsers.
11. Abandoned carts get one recovery email.
12. Admin can log in, see orders, refund, update status, sync from Square, see low inventory — all without Mongo.
13. Admin cookie is a signed JWT, not an API key.
14. Square diagnostics return 404 in production.
15. CI fails on any new missing API reference.
16. Every visible CTA goes somewhere live.
17. The 64 unused routes are formally allowlisted with reasons, not silently broken.
18. The 30+ unsupported pages are hidden or removed.
19. The runbook covers every common operator task.
20. The codebase is **smaller, simpler, and more defensible** than when this audit started.

That is extreme completion.
