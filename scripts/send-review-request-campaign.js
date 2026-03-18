#!/usr/bin/env node

/**
 * Send review request emails to real purchasers for products that have no public reviews.
 *
 * Usage:
 *   ADMIN_E2E_EMAIL='admin@tasteofgratitude.com' \
 *   ADMIN_E2E_PASSWORD='***' \
 *   RESEND_API_KEY='re_***' \
 *   node scripts/send-review-request-campaign.js --send
 *
 * By default, runs in dry-run mode and only prints planned recipients.
 */

const { Resend } = require('resend');

try {
  require('dotenv').config({ path: '.env.local' });
  require('dotenv').config();
} catch {
  // Optional in production environments where env vars are already injected.
}

const BASE_URL = process.env.BASE_URL || 'https://tasteofgratitude.shop';
const ADMIN_EMAIL = process.env.ADMIN_E2E_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_E2E_PASSWORD;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'hello@tasteofgratitude.net';

const SEND_MODE = process.argv.includes('--send');
const MAX_PER_RUN = parsePositiveIntArg('--max-per-run') || 46;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Missing required env vars: ADMIN_E2E_EMAIL and ADMIN_E2E_PASSWORD');
  process.exit(1);
}

if (SEND_MODE && !RESEND_API_KEY) {
  console.error('Missing RESEND_API_KEY while using --send');
  process.exit(1);
}

const resend = SEND_MODE ? new Resend(RESEND_API_KEY) : null;

function parsePositiveIntArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  const raw = process.argv[index + 1];
  const parsed = Number.parseInt(raw || '', 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function extractCookie(setCookieHeaderValue) {
  return setCookieHeaderValue.split(';')[0];
}

async function parseResponse(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function isDeliverableCustomerEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized || !normalized.includes('@')) return false;

  const blockedDomains = ['example.com', 'test.com', 'mailinator.com'];
  const [, domain = ''] = normalized.split('@');
  if (blockedDomains.includes(domain)) return false;

  if (normalized.startsWith('qa-review-')) return false;
  if (normalized.includes('+qa@')) return false;
  if (normalized.includes('+test@')) return false;

  return true;
}

function isPaidOrder(order) {
  const allowedStatuses = new Set([
    'paid',
    'completed',
    'fulfilled',
    'delivered',
    'ready_for_pickup',
  ]);

  const status = normalizeText(order?.status);
  const paymentStatus = normalizeText(order?.paymentStatus);
  return allowedStatuses.has(status) || allowedStatuses.has(paymentStatus);
}

function parseOrderDate(order) {
  const candidate = order?.createdAt || order?.updatedAt || order?.statusUpdatedAt;
  const parsed = candidate ? new Date(candidate) : null;
  return parsed instanceof Date && !Number.isNaN(parsed.getTime()) ? parsed : null;
}

function buildReviewUrl(product) {
  const slug = String(product?.slug || '').trim();
  if (slug) {
    return `${BASE_URL}/product/${encodeURIComponent(slug)}?review=true`;
  }

  return `${BASE_URL}/products?review=true&productId=${encodeURIComponent(String(product?.id || ''))}`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildReviewRequestEmail({ customerName, productName, reviewUrl }) {
  const safeName = escapeHtml(customerName || 'there');
  const safeProductName = escapeHtml(productName || 'your recent purchase');
  const safeUrl = escapeHtml(reviewUrl);

  const subject = `Could You Share a Quick Review for ${productName}?`;
  const text = `Hi ${customerName || 'there'},\n\nThank you for choosing Taste of Gratitude. If you have a minute, we'd love your honest feedback on ${productName}.\n\nWrite your review here: ${reviewUrl}\n\nYour review helps other customers and supports our small business.\n\nWith gratitude,\nTaste of Gratitude`;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Share Your Feedback</title>
</head>
<body style="margin:0;padding:0;background:#f6f8fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#1f2937;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 8px 28px rgba(0,0,0,0.08);">
          <tr>
            <td style="padding:28px 30px;background:linear-gradient(135deg,#0f766e 0%,#14b8a6 100%);color:#ffffff;text-align:center;">
              <h1 style="margin:0;font-size:28px;line-height:1.2;">How Was Your Experience?</h1>
              <p style="margin:10px 0 0;font-size:15px;opacity:0.95;">Your honest feedback helps our community grow.</p>
            </td>
          </tr>
          <tr>
            <td style="padding:30px;">
              <p style="margin:0 0 14px;font-size:16px;">Hi ${safeName},</p>
              <p style="margin:0 0 14px;font-size:16px;line-height:1.6;">
                Thank you for choosing Taste of Gratitude. If you have a minute, we would love your honest feedback on
                <strong>${safeProductName}</strong>.
              </p>
              <div style="text-align:center;margin:28px 0;">
                <a href="${safeUrl}" style="display:inline-block;padding:14px 26px;border-radius:10px;background:#0f766e;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;">
                  Leave A Review
                </a>
              </div>
              <p style="margin:0 0 10px;font-size:14px;color:#6b7280;line-height:1.6;">
                We are not looking for perfect reviews, just real ones. Your perspective helps other customers make informed decisions.
              </p>
              <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;">
                With gratitude,<br />Taste of Gratitude
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return { subject, text, html };
}

async function loginAdmin() {
  const loginRes = await fetch(`${BASE_URL}/api/admin/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
  });

  if (!loginRes.ok) {
    throw new Error(`Admin login failed: ${loginRes.status} ${JSON.stringify(await parseResponse(loginRes))}`);
  }

  const setCookie = loginRes.headers.getSetCookie?.() || [];
  const cookieHeader = setCookie.map(extractCookie).join('; ');

  if (!cookieHeader.includes('admin_token=')) {
    throw new Error('Admin login succeeded, but admin_token cookie was not returned');
  }

  return { cookieHeader };
}

async function fetchProducts() {
  const productsRes = await fetch(`${BASE_URL}/api/products`);
  const productsBody = await parseResponse(productsRes);

  if (!productsRes.ok || !Array.isArray(productsBody.products)) {
    throw new Error(`Failed to load products: ${productsRes.status} ${JSON.stringify(productsBody)}`);
  }

  return productsBody.products.filter((product) => product?.id);
}

async function fetchOrders(cookieHeader) {
  const ordersRes = await fetch(`${BASE_URL}/api/admin/orders`, {
    headers: { cookie: cookieHeader },
  });
  const ordersBody = await parseResponse(ordersRes);

  if (!ordersRes.ok || !Array.isArray(ordersBody.orders)) {
    throw new Error(`Failed to load admin orders: ${ordersRes.status} ${JSON.stringify(ordersBody)}`);
  }

  return ordersBody.orders;
}

async function fetchProductsWithPublicReviews(products) {
  const visibility = new Map();

  for (const product of products) {
    const productId = String(product.id);
    const res = await fetch(`${BASE_URL}/api/reviews?productId=${encodeURIComponent(productId)}&limit=1`);
    const body = await parseResponse(res);
    const reviews = Array.isArray(body.reviews) ? body.reviews : [];
    visibility.set(productId, reviews.length > 0);
  }

  return visibility;
}

function collectCandidatesByProduct({ products, orders }) {
  const productById = new Map();
  const productByNormalizedName = new Map();

  for (const product of products) {
    const productId = String(product.id);
    productById.set(productId, product);
    productByNormalizedName.set(normalizeText(product.name), product);
  }

  const candidatesByProduct = new Map();

  for (const order of orders) {
    if (!isPaidOrder(order)) continue;

    const email = String(order?.customer?.email || '').trim().toLowerCase();
    if (!isDeliverableCustomerEmail(email)) continue;

    const customerName = String(order?.customer?.name || 'there').trim();
    const orderDate = parseOrderDate(order);
    const items = Array.isArray(order?.items) ? order.items : [];

    for (const item of items) {
      const rawItemProductId = String(item?.productId || item?.id || item?.catalogObjectId || '').trim();
      const itemName = String(item?.name || '').trim();

      let matchedProduct = null;
      if (rawItemProductId && productById.has(rawItemProductId)) {
        matchedProduct = productById.get(rawItemProductId);
      } else {
        const normalizedName = normalizeText(itemName);
        matchedProduct = productByNormalizedName.get(normalizedName) || null;
      }

      if (!matchedProduct) continue;

      const productId = String(matchedProduct.id);
      const existing = candidatesByProduct.get(productId) || [];
      existing.push({
        email,
        customerName,
        orderDate,
      });
      candidatesByProduct.set(productId, existing);
    }
  }

  // Deduplicate by email and prefer most recent order for each product.
  for (const [productId, candidates] of candidatesByProduct.entries()) {
    const deduped = new Map();
    for (const candidate of candidates) {
      const existing = deduped.get(candidate.email);
      if (!existing) {
        deduped.set(candidate.email, candidate);
        continue;
      }

      const existingTime = existing.orderDate?.getTime?.() || 0;
      const candidateTime = candidate.orderDate?.getTime?.() || 0;
      if (candidateTime > existingTime) {
        deduped.set(candidate.email, candidate);
      }
    }

    candidatesByProduct.set(
      productId,
      [...deduped.values()].sort((a, b) => (b.orderDate?.getTime?.() || 0) - (a.orderDate?.getTime?.() || 0))
    );
  }

  return candidatesByProduct;
}

async function sendReviewRequest({ to, subject, html, text }) {
  if (!SEND_MODE) {
    return { success: true, provider: 'dry-run', id: null };
  }

  const result = await resend.emails.send({
    from: RESEND_FROM_EMAIL,
    to,
    subject,
    html,
    text,
    replyTo: 'support@tasteofgratitude.shop',
  });

  return {
    success: true,
    provider: 'resend',
    id: result?.id || result?.data?.id || null,
  };
}

async function run() {
  const summary = {
    mode: SEND_MODE ? 'send' : 'dry-run',
    baseUrl: BASE_URL,
    maxPerRun: MAX_PER_RUN,
    totalProducts: 0,
    productsWithoutPublicReviews: 0,
    productsWithNoEligibleCustomer: 0,
    planned: 0,
    processed: 0,
    sent: 0,
    failures: [],
    noEligibleCustomer: [],
  };

  const { cookieHeader } = await loginAdmin();
  const [products, orders] = await Promise.all([
    fetchProducts(),
    fetchOrders(cookieHeader),
  ]);

  summary.totalProducts = products.length;

  const hasPublicReview = await fetchProductsWithPublicReviews(products);
  const candidatesByProduct = collectCandidatesByProduct({ products, orders });

  const productsMissingReviews = products.filter((product) => !hasPublicReview.get(String(product.id)));
  summary.productsWithoutPublicReviews = productsMissingReviews.length;

  const alreadyContactedEmails = new Set();
  let sentCount = 0;

  for (const product of productsMissingReviews) {
    if (sentCount >= MAX_PER_RUN) break;

    const productId = String(product.id);
    const candidates = candidatesByProduct.get(productId) || [];

    if (candidates.length === 0) {
      summary.productsWithNoEligibleCustomer += 1;
      summary.noEligibleCustomer.push({
        productId,
        productName: product.name,
      });
      continue;
    }

    // Prefer a customer not already contacted in this run.
    let candidate = candidates.find((item) => !alreadyContactedEmails.has(item.email));
    if (!candidate) {
      candidate = candidates[0];
    }

    const reviewUrl = buildReviewUrl(product);
    const emailPayload = buildReviewRequestEmail({
      customerName: candidate.customerName,
      productName: String(product.name || productId),
      reviewUrl,
    });

    summary.planned += 1;

    try {
      const sendResult = await sendReviewRequest({
        to: candidate.email,
        ...emailPayload,
      });

      if (!sendResult.success) {
        throw new Error('Unknown send error');
      }

      alreadyContactedEmails.add(candidate.email);
      sentCount += 1;
      summary.processed += 1;
      if (SEND_MODE) {
        summary.sent += 1;
      }

      console.log(`${SEND_MODE ? 'SENT' : 'PLAN'} ${product.name} -> ${candidate.email} (${reviewUrl})`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      summary.failures.push({
        productId,
        productName: product.name,
        email: candidate.email,
        error: message,
      });
      console.log(`FAIL ${product.name} -> ${candidate.email}: ${message}`);
    }
  }

  console.log('SUMMARY_START');
  console.log(JSON.stringify(summary, null, 2));
  console.log('SUMMARY_END');

  if (summary.failures.length > 0) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error('Fatal error:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
