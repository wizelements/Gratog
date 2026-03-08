#!/usr/bin/env node

/**
 * End-to-end review QA runner for all products.
 *
 * Flow per product:
 * 1) Submit review via /api/reviews (admin QA bypass enabled)
 * 2) Verify review is not public pre-approval
 * 3) Approve via /api/admin/reviews/[id]
 * 4) Verify review is public post-approval
 * 5) Delete via /api/admin/reviews/[id]
 * 6) Verify review is not public after deletion
 *
 * Required env vars:
 * - ADMIN_E2E_EMAIL
 * - ADMIN_E2E_PASSWORD
 *
 * Optional env vars:
 * - BASE_URL (default: https://tasteofgratitude.shop)
 */

const BASE_URL = process.env.BASE_URL || 'https://tasteofgratitude.shop';
const ADMIN_EMAIL = process.env.ADMIN_E2E_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_E2E_PASSWORD;

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Missing required env vars: ADMIN_E2E_EMAIL and ADMIN_E2E_PASSWORD');
  process.exit(1);
}

function extractCookie(setCookieHeaderValue) {
  return setCookieHeaderValue.split(';')[0];
}

function extractCookieValue(setCookieHeaderValue, cookieName) {
  const pattern = new RegExp(`${cookieName}=([^;]+)`);
  const match = setCookieHeaderValue.match(pattern);
  return match ? match[1] : '';
}

async function parseResponse(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function run() {
  const runTag = `qa-review-${Date.now()}`;
  const created = [];

  const summary = {
    runTag,
    baseUrl: BASE_URL,
    totalProducts: 0,
    attempted: 0,
    submitOk: 0,
    hiddenBeforeApprovalOk: 0,
    approveOk: 0,
    visibleAfterApprovalOk: 0,
    deleteOk: 0,
    hiddenAfterDeleteOk: 0,
    failed: [],
  };

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
  const csrfCookieRaw = setCookie.find((value) => value.startsWith('admin_csrf=')) || '';
  const csrfToken = extractCookieValue(csrfCookieRaw, 'admin_csrf');

  if (!cookieHeader.includes('admin_token=')) {
    throw new Error('Admin login succeeded, but admin_token cookie was not returned');
  }
  if (!csrfToken) {
    throw new Error('Admin login succeeded, but admin_csrf cookie was not returned');
  }

  const productsRes = await fetch(`${BASE_URL}/api/products`);
  const productsBody = await parseResponse(productsRes);

  if (!productsRes.ok || !Array.isArray(productsBody.products)) {
    throw new Error(`Failed to load products: ${productsRes.status} ${JSON.stringify(productsBody)}`);
  }

  const products = productsBody.products.filter((product) => product?.id);
  summary.totalProducts = products.length;

  for (let index = 0; index < products.length; index += 1) {
    const product = products[index];
    const productId = String(product.id);
    const productName = String(product.name || productId);
    const email = `${runTag}-${index}@example.com`;

    summary.attempted += 1;
    const state = { productId, productName, email, reviewId: null };

    try {
      const submitRes = await fetch(`${BASE_URL}/api/reviews`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          cookie: cookieHeader,
        },
        body: JSON.stringify({
          productId,
          productName,
          name: 'Admin QA Bot',
          email,
          rating: 5,
          title: `[${runTag}] Review QA ${index + 1}`,
          comment: `Automated QA validation for ${productName}.`,
          images: [],
          qaBypassRateLimit: true,
          suppressConfirmationEmail: true,
        }),
      });

      const submitBody = await parseResponse(submitRes);
      if (!submitRes.ok || !submitBody?.success || !submitBody?.review?._id) {
        throw new Error(`Submit failed (${submitRes.status}): ${JSON.stringify(submitBody)}`);
      }

      state.reviewId = String(submitBody.review._id);
      created.push({ reviewId: state.reviewId, productId });
      summary.submitOk += 1;

      const preApprovalRes = await fetch(`${BASE_URL}/api/reviews?productId=${encodeURIComponent(productId)}&limit=100`);
      const preApprovalBody = await parseResponse(preApprovalRes);
      const preApprovalReviews = Array.isArray(preApprovalBody.reviews) ? preApprovalBody.reviews : [];
      const visibleBeforeApproval = preApprovalReviews.some((review) => String(review?._id) === state.reviewId);

      if (visibleBeforeApproval) {
        throw new Error('Review became public before approval');
      }
      summary.hiddenBeforeApprovalOk += 1;

      const approveRes = await fetch(`${BASE_URL}/api/admin/reviews/${encodeURIComponent(state.reviewId)}`, {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          cookie: cookieHeader,
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({ action: 'approve', adminNote: `Automated QA approval (${runTag})` }),
      });
      const approveBody = await parseResponse(approveRes);

      if (!approveRes.ok || !approveBody?.success) {
        throw new Error(`Approve failed (${approveRes.status}): ${JSON.stringify(approveBody)}`);
      }
      summary.approveOk += 1;

      const postApprovalRes = await fetch(`${BASE_URL}/api/reviews?productId=${encodeURIComponent(productId)}&limit=100`);
      const postApprovalBody = await parseResponse(postApprovalRes);
      const postApprovalReviews = Array.isArray(postApprovalBody.reviews) ? postApprovalBody.reviews : [];
      const visibleAfterApproval = postApprovalReviews.some((review) => String(review?._id) === state.reviewId);

      if (!visibleAfterApproval) {
        throw new Error('Approved review was not publicly visible');
      }
      summary.visibleAfterApprovalOk += 1;

      const deleteRes = await fetch(`${BASE_URL}/api/admin/reviews/${encodeURIComponent(state.reviewId)}`, {
        method: 'DELETE',
        headers: {
          cookie: cookieHeader,
          'x-csrf-token': csrfToken,
        },
      });
      const deleteBody = await parseResponse(deleteRes);

      if (!deleteRes.ok || !deleteBody?.success) {
        throw new Error(`Delete failed (${deleteRes.status}): ${JSON.stringify(deleteBody)}`);
      }
      summary.deleteOk += 1;

      const postDeleteRes = await fetch(`${BASE_URL}/api/reviews?productId=${encodeURIComponent(productId)}&limit=100`);
      const postDeleteBody = await parseResponse(postDeleteRes);
      const postDeleteReviews = Array.isArray(postDeleteBody.reviews) ? postDeleteBody.reviews : [];
      const stillVisibleAfterDelete = postDeleteReviews.some((review) => String(review?._id) === state.reviewId);

      if (stillVisibleAfterDelete) {
        throw new Error('Deleted review is still publicly visible');
      }
      summary.hiddenAfterDeleteOk += 1;

      console.log(`PASS ${index + 1}/${products.length} ${productName} (${productId})`);
    } catch (error) {
      summary.failed.push({
        ...state,
        error: error instanceof Error ? error.message : String(error),
      });

      console.log(`FAIL ${index + 1}/${products.length} ${productName} (${productId}) ${error instanceof Error ? error.message : String(error)}`);

      if (state.reviewId) {
        await fetch(`${BASE_URL}/api/admin/reviews/${encodeURIComponent(state.reviewId)}`, {
          method: 'DELETE',
          headers: {
            cookie: cookieHeader,
            'x-csrf-token': csrfToken,
          },
        }).catch(() => undefined);
      }
    }
  }

  for (const item of created) {
    await fetch(`${BASE_URL}/api/admin/reviews/${encodeURIComponent(item.reviewId)}`, {
      method: 'DELETE',
      headers: {
        cookie: cookieHeader,
        'x-csrf-token': csrfToken,
      },
    }).catch(() => undefined);
  }

  console.log('SUMMARY_START');
  console.log(JSON.stringify(summary, null, 2));
  console.log('SUMMARY_END');

  if (summary.failed.length > 0) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error('Fatal error:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
