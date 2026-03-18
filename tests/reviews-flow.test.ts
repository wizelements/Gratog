import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';

const connectToDatabaseMock = vi.fn();
const sendReviewConfirmationMock = vi.fn();
const verifyAdminTokenMock = vi.fn();
const rateLimitCheckMock = vi.fn();
const loggerErrorMock = vi.fn();
const loggerWarnMock = vi.fn();

vi.mock('@/lib/db-optimized', () => ({
  connectToDatabase: connectToDatabaseMock,
}));

vi.mock('@/lib/resend-email', () => ({
  sendReviewConfirmation: sendReviewConfirmationMock,
}));

vi.mock('@/lib/admin-session', () => ({
  verifyAdminToken: verifyAdminTokenMock,
}));

vi.mock('@/lib/redis', () => ({
  RateLimit: {
    check: rateLimitCheckMock,
  },
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: loggerErrorMock,
    warn: loggerWarnMock,
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

type RecordMap = Record<string, unknown>;

function getByPath(record: RecordMap, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = record;

  for (const part of parts) {
    if (Array.isArray(current)) {
      current = current.map((item) => (item as RecordMap)?.[part]);
      continue;
    }

    if (!current || typeof current !== 'object') {
      return undefined;
    }

    current = (current as RecordMap)[part];
  }

  return current;
}

function valuesMatch(actual: unknown, expected: unknown): boolean {
  if (actual instanceof ObjectId) {
    return valuesMatch(actual.toString(), expected);
  }
  if (expected instanceof ObjectId) {
    return valuesMatch(actual, expected.toString());
  }

  if (Array.isArray(actual)) {
    return actual.some((value) => valuesMatch(value, expected));
  }

  return actual === expected;
}

function matchesQuery(document: RecordMap, query: RecordMap): boolean {
  if (Array.isArray(query.$and)) {
    const andClauses = query.$and as RecordMap[];
    if (!andClauses.every((clause) => matchesQuery(document, clause))) {
      return false;
    }
  }

  if (Array.isArray(query.$or)) {
    const orClauses = query.$or as RecordMap[];
    if (!orClauses.some((clause) => matchesQuery(document, clause))) {
      return false;
    }
  }

  return Object.entries(query).every(([key, expected]) => {
    if (key === '$and' || key === '$or') {
      return true;
    }

    const actual = key.includes('.') ? getByPath(document, key) : document[key];

    if (expected && typeof expected === 'object' && !Array.isArray(expected)) {
      if ('$in' in expected) {
        const values = (expected as { $in: unknown[] }).$in;
        if (Array.isArray(actual)) {
          return actual.some((value) => values.some((candidate) => valuesMatch(value, candidate)));
        }
        return values.some((candidate) => valuesMatch(actual, candidate));
      }

      if ('$ne' in expected) {
        return !valuesMatch(actual, (expected as { $ne: unknown }).$ne);
      }

      if ('$exists' in expected) {
        const shouldExist = Boolean((expected as { $exists: unknown }).$exists);
        const exists = actual !== undefined;
        return shouldExist ? exists : !exists;
      }
    }

    return valuesMatch(actual, expected);
  });
}

function applyUpdate(document: RecordMap, update: RecordMap): void {
  const increment = (update.$inc || {}) as Record<string, number>;
  const setValues = (update.$set || {}) as Record<string, unknown>;
  const pushValues = (update.$push || {}) as Record<string, unknown>;
  const addToSetValues = (update.$addToSet || {}) as Record<string, unknown>;

  for (const [key, amount] of Object.entries(increment)) {
    const current = Number(document[key] || 0);
    document[key] = current + amount;
  }

  for (const [key, value] of Object.entries(setValues)) {
    document[key] = value;
  }

  for (const [key, value] of Object.entries(pushValues)) {
    const list = Array.isArray(document[key]) ? (document[key] as unknown[]) : [];
    list.push(value);
    document[key] = list;
  }

  for (const [key, value] of Object.entries(addToSetValues)) {
    const list = Array.isArray(document[key]) ? (document[key] as unknown[]) : [];
    const alreadyIncluded = list.some((existing) => valuesMatch(existing, value));
    if (!alreadyIncluded) {
      list.push(value);
    }
    document[key] = list;
  }
}

function createMemoryDb(seed: {
  reviews?: RecordMap[];
  orders?: RecordMap[];
  passports?: RecordMap[];
  pendingCustomers?: RecordMap[];
} = {}) {
  const reviews = [...(seed.reviews || [])];
  const orders = [...(seed.orders || [])];
  const passports = [...(seed.passports || [])];
  const pendingCustomers = [...(seed.pendingCustomers || [])];

  const db = {
    collection(name: string) {
      if (name === 'product_reviews') {
        return {
          async findOne(query: RecordMap) {
            return reviews.find((review) => matchesQuery(review, query)) || null;
          },
          async insertOne(document: RecordMap) {
            const insertedId = new ObjectId();
            reviews.push({ ...document, _id: insertedId });
            return { insertedId };
          },
          find(query: RecordMap) {
            let result = reviews.filter((review) => matchesQuery(review, query));

            return {
              sort(sortSpec: Record<string, 1 | -1>) {
                const [[field, direction]] = Object.entries(sortSpec);
                result = [...result].sort((a, b) => {
                  const left = (a[field] as Date)?.getTime?.() ?? Number(a[field] || 0);
                  const right = (b[field] as Date)?.getTime?.() ?? Number(b[field] || 0);
                  return direction === -1 ? right - left : left - right;
                });
                return this;
              },
              limit(limitValue: number) {
                result = result.slice(0, limitValue);
                return this;
              },
              async toArray() {
                return result.map((review) => ({ ...review }));
              },
            };
          },
          async updateOne(filter: RecordMap, update: RecordMap) {
            const matchIndex = reviews.findIndex((review) => matchesQuery(review, filter));
            if (matchIndex === -1) {
              return { matchedCount: 0, modifiedCount: 0 };
            }

            applyUpdate(reviews[matchIndex], update);
            return { matchedCount: 1, modifiedCount: 1 };
          },
        };
      }

      if (name === 'orders') {
        return {
          async findOne(query: RecordMap) {
            return orders.find((order) => matchesQuery(order, query)) || null;
          },
        };
      }

      if (name === 'passports') {
        return {
          async findOne(query: RecordMap) {
            return passports.find((passport) => matchesQuery(passport, query)) || null;
          },
          async updateOne(filter: RecordMap, update: RecordMap) {
            const matchIndex = passports.findIndex((passport) => matchesQuery(passport, filter));
            if (matchIndex === -1) {
              return { matchedCount: 0, modifiedCount: 0 };
            }

            applyUpdate(passports[matchIndex], update);
            return { matchedCount: 1, modifiedCount: 1 };
          },
          async insertOne(document: RecordMap) {
            passports.push({ ...document, _id: new ObjectId() });
            return { insertedId: new ObjectId() };
          },
        };
      }

      if (name === 'pending_customers') {
        return {
          async findOne(query: RecordMap) {
            return pendingCustomers.find((customer) => matchesQuery(customer, query)) || null;
          },
          async updateOne(filter: RecordMap, update: RecordMap, options?: { upsert?: boolean }) {
            const matchIndex = pendingCustomers.findIndex((customer) => matchesQuery(customer, filter));
            if (matchIndex === -1) {
              if (options?.upsert !== true) {
                return { matchedCount: 0, modifiedCount: 0 };
              }

              const newDocument: RecordMap = {
                _id: new ObjectId(),
                ...((update.$setOnInsert || {}) as RecordMap),
              };
              applyUpdate(newDocument, update);
              pendingCustomers.push(newDocument);

              return {
                matchedCount: 0,
                modifiedCount: 0,
                upsertedId: newDocument._id,
                upsertedCount: 1,
              };
            }

            applyUpdate(pendingCustomers[matchIndex], update);
            return { matchedCount: 1, modifiedCount: 1, upsertedCount: 0, upsertedId: null };
          },
          async insertOne(document: RecordMap) {
            const insertedId = new ObjectId();
            pendingCustomers.push({ ...document, _id: insertedId });
            return { insertedId };
          },
        };
      }

      if (name === 'customers') {
        return {
          async findOne() {
            return null;
          },
          async updateOne() {
            return { matchedCount: 0, modifiedCount: 0 };
          },
          async insertOne() {
            return { matchedCount: 0, modifiedCount: 0 };
          },
        };
      }

      throw new Error(`Unsupported collection in test database: ${name}`);
    },
  };

  return { db, reviews, passports, orders, pendingCustomers };
}

function createRequest({
  url,
  body,
  headers = {},
  cookies = {},
}: {
  url: string;
  body?: unknown;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
}) {
  const requestHeaders = new Headers(headers);

  return {
    url,
    headers: requestHeaders,
    cookies: {
      get: (name: string) => (cookies[name] ? { value: cookies[name] } : undefined),
    },
    async json() {
      return body;
    },
  };
}

describe('Review System End-To-End Flow (Mocked Backend)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rateLimitCheckMock.mockReturnValue(true);
    verifyAdminTokenMock.mockResolvedValue(null);
    sendReviewConfirmationMock.mockResolvedValue({ success: true });
  });

  it('handles submit, duplicate rejection, moderation visibility, and helpful voting end-to-end', async () => {
    const email = 'reviewer@example.com';
    const productId = 'blue-lotus';
    const { db, reviews } = createMemoryDb({
      orders: [
        {
          customer: { email },
          items: [{ productId }],
          status: 'completed',
        },
      ],
    });

    connectToDatabaseMock.mockResolvedValue({ db });

    const reviewsRoute = await import('@/app/api/reviews/route');
    const helpfulRoute = await import('@/app/api/reviews/helpful/route');

    const payload = {
      productId,
      productName: 'Blue Lotus',
      name: 'A Customer',
      email,
      rating: 5,
      title: 'Excellent blend',
      comment: 'This tasted amazing.',
    };

    const submitResponse = await reviewsRoute.POST(
      createRequest({
        url: 'http://localhost/api/reviews',
        body: payload,
        headers: { 'x-forwarded-for': '10.10.10.10' },
      }) as never
    );
    const submitBody = await submitResponse.json();

    expect(submitResponse.status).toBe(200);
    expect(submitBody.success).toBe(true);
    expect(submitBody.review.approved).toBe(false);
    expect(submitBody.review.verifiedPurchase).toBe(true);
    expect(submitBody.reviewStatus).toBe('pending_moderation');
    expect(submitBody.isPublic).toBe(false);
    expect(submitBody.pointsEarned).toBe(10);
    expect(submitBody.pendingCustomerCaptured).toBe(false);
    expect(submitBody.signupPrompt?.recommended).toBe(false);

    const duplicateResponse = await reviewsRoute.POST(
      createRequest({
        url: 'http://localhost/api/reviews',
        body: payload,
        headers: { 'x-forwarded-for': '10.10.10.10' },
      }) as never
    );
    const duplicateBody = await duplicateResponse.json();

    expect(duplicateResponse.status).toBe(400);
    expect(duplicateBody.error).toBe('You have already reviewed this product');

    const publicBeforeApproval = await reviewsRoute.GET(
      createRequest({
        url: `http://localhost/api/reviews?productId=${productId}`,
      }) as never
    );
    const publicBeforeBody = await publicBeforeApproval.json();

    expect(publicBeforeApproval.status).toBe(200);
    expect(publicBeforeBody.reviews).toHaveLength(0);

    const helpfulBeforeApproval = await helpfulRoute.POST(
      createRequest({
        url: 'http://localhost/api/reviews/helpful',
        body: { reviewId: submitBody.review._id, helpful: true },
      }) as never
    );
    const helpfulBeforeBody = await helpfulBeforeApproval.json();

    expect(helpfulBeforeApproval.status).toBe(409);
    expect(helpfulBeforeBody.error).toBe('Review is not available for voting');

    const review = reviews[0];
    review.approved = true;

    const publicAfterApproval = await reviewsRoute.GET(
      createRequest({
        url: `http://localhost/api/reviews?productId=${productId}`,
      }) as never
    );
    const publicAfterBody = await publicAfterApproval.json();

    expect(publicAfterApproval.status).toBe(200);
    expect(publicAfterBody.reviews).toHaveLength(1);
    expect(publicAfterBody.reviews[0].email).toBe(email);

    const helpfulSuccess = await helpfulRoute.POST(
      createRequest({
        url: 'http://localhost/api/reviews/helpful',
        body: { reviewId: submitBody.review._id, helpful: true },
      }) as never
    );

    expect(helpfulSuccess.status).toBe(200);

    const publicAfterVote = await reviewsRoute.GET(
      createRequest({
        url: `http://localhost/api/reviews?productId=${productId}`,
      }) as never
    );
    const publicAfterVoteBody = await publicAfterVote.json();

    expect(publicAfterVoteBody.reviews[0].helpful).toBe(1);
  });

  it('keeps includeUnapproved resilient with malformed admin cookies', async () => {
    const { db } = createMemoryDb({
      reviews: [
        {
          _id: new ObjectId(),
          productId: 'mango-tea',
          name: 'Pending User',
          email: 'pending@example.com',
          rating: 4,
          title: 'Pending moderation',
          comment: 'Waiting for approval',
          approved: false,
          hidden: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });

    connectToDatabaseMock.mockResolvedValue({ db });
    verifyAdminTokenMock.mockRejectedValue(new Error('bad token'));

    const reviewsRoute = await import('@/app/api/reviews/route');

    const response = await reviewsRoute.GET(
      createRequest({
        url: 'http://localhost/api/reviews?productId=mango-tea&includeUnapproved=true',
        cookies: { admin_token: 'bad-token' },
      }) as never
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.reviews).toHaveLength(0);
    expect(loggerWarnMock).toHaveBeenCalled();
  });

  it('treats approved legacy reviews without hidden flag as publicly visible', async () => {
    const { db } = createMemoryDb({
      reviews: [
        {
          _id: new ObjectId(),
          productId: 'legacy-product',
          name: 'Legacy Reviewer',
          email: 'legacy@example.com',
          rating: 5,
          title: 'Legacy review',
          comment: 'Approved before hidden flag existed',
          approved: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });

    connectToDatabaseMock.mockResolvedValue({ db });

    const reviewsRoute = await import('@/app/api/reviews/route');

    const response = await reviewsRoute.GET(
      createRequest({
        url: 'http://localhost/api/reviews?productId=legacy-product',
      }) as never
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.reviews).toHaveLength(1);
    expect(body.reviews[0].email).toBe('legacy@example.com');
  });

  it('returns summary and totalCount from the full matched public set even when list results are limited', async () => {
    const now = Date.now();
    const { db } = createMemoryDb({
      reviews: [
        {
          _id: new ObjectId(),
          productId: 'summary-product',
          name: 'Newest Public',
          email: 'newest@example.com',
          rating: 5,
          title: 'Newest',
          comment: 'Latest approved review',
          approved: true,
          hidden: false,
          verifiedPurchase: true,
          createdAt: new Date(now),
          updatedAt: new Date(now),
        },
        {
          _id: new ObjectId(),
          productId: 'summary-product',
          name: 'Older Public',
          email: 'older@example.com',
          rating: 4,
          title: 'Older',
          comment: 'Older approved review',
          approved: true,
          hidden: false,
          verifiedPurchase: false,
          createdAt: new Date(now - 1000),
          updatedAt: new Date(now - 1000),
        },
        {
          _id: new ObjectId(),
          productId: 'summary-product',
          name: 'Oldest Public',
          email: 'oldest@example.com',
          rating: 2,
          title: 'Oldest',
          comment: 'Oldest approved review',
          approved: true,
          hidden: false,
          verifiedPurchase: true,
          createdAt: new Date(now - 2000),
          updatedAt: new Date(now - 2000),
        },
        {
          _id: new ObjectId(),
          productId: 'summary-product',
          name: 'Hidden Review',
          email: 'hidden@example.com',
          rating: 1,
          title: 'Hidden',
          comment: 'Should not be public',
          approved: true,
          hidden: true,
          verifiedPurchase: false,
          createdAt: new Date(now - 3000),
          updatedAt: new Date(now - 3000),
        },
      ],
    });

    connectToDatabaseMock.mockResolvedValue({ db });

    const reviewsRoute = await import('@/app/api/reviews/route');
    const response = await reviewsRoute.GET(
      createRequest({
        url: 'http://localhost/api/reviews?productId=summary-product&limit=1',
      }) as never
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.reviews).toHaveLength(1);
    expect(body.reviews[0].email).toBe('newest@example.com');
    expect(body.count).toBe(1);
    expect(body.totalCount).toBe(3);
    expect(body.summary.reviewCount).toBe(3);
    expect(body.summary.averageRating).toBe(3.7);
    expect(body.summary.verifiedCount).toBe(2);
    expect(body.summary.ratingDistribution).toEqual({
      1: 0,
      2: 1,
      3: 0,
      4: 1,
      5: 1,
    });
  });

  it('covers validation and rate-limit error paths for submission and helpful voting', async () => {
    const { db } = createMemoryDb({
      reviews: [
        {
          _id: new ObjectId(),
          productId: 'rooibos',
          name: 'Approved User',
          email: 'approved@example.com',
          rating: 4,
          title: 'Approved review',
          comment: 'Ready for voting',
          approved: true,
          hidden: false,
          helpful: 0,
          notHelpful: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
    });

    connectToDatabaseMock.mockResolvedValue({ db });

    const reviewsRoute = await import('@/app/api/reviews/route');
    const helpfulRoute = await import('@/app/api/reviews/helpful/route');

    rateLimitCheckMock.mockImplementation((key: string) => !key.startsWith('review_submit:'));

    const submitLimited = await reviewsRoute.POST(
      createRequest({
        url: 'http://localhost/api/reviews',
        body: {
          productId: 'rooibos',
          productName: 'Rooibos',
          name: 'Rate Limited',
          email: 'limited@example.com',
          rating: 5,
          title: 'Blocked',
          comment: 'Should be blocked',
        },
      }) as never
    );

    expect(submitLimited.status).toBe(429);

    rateLimitCheckMock.mockReturnValue(true);

    const badHelpfulPayload = await helpfulRoute.POST(
      createRequest({
        url: 'http://localhost/api/reviews/helpful',
        body: { reviewId: new ObjectId().toString() },
      }) as never
    );

    expect(badHelpfulPayload.status).toBe(400);

    const invalidIdResponse = await helpfulRoute.POST(
      createRequest({
        url: 'http://localhost/api/reviews/helpful',
        body: { reviewId: 'not-an-object-id', helpful: true },
      }) as never
    );

    expect(invalidIdResponse.status).toBe(400);

    const missingReviewResponse = await helpfulRoute.POST(
      createRequest({
        url: 'http://localhost/api/reviews/helpful',
        body: { reviewId: new ObjectId().toString(), helpful: true },
      }) as never
    );

    expect(missingReviewResponse.status).toBe(404);

    rateLimitCheckMock.mockReturnValue(false);
    const rateLimitedVote = await helpfulRoute.POST(
      createRequest({
        url: 'http://localhost/api/reviews/helpful',
        body: { reviewId: new ObjectId().toString(), helpful: true },
      }) as never
    );

    expect(rateLimitedVote.status).toBe(429);
  });

  it('allows admin QA submissions to bypass public submit rate limits when explicitly requested', async () => {
    const { db } = createMemoryDb();
    connectToDatabaseMock.mockResolvedValue({ db });
    verifyAdminTokenMock.mockResolvedValue({ role: 'admin' });
    rateLimitCheckMock.mockReturnValue(false);

    const reviewsRoute = await import('@/app/api/reviews/route');

    const response = await reviewsRoute.POST(
      createRequest({
        url: 'http://localhost/api/reviews',
        cookies: { admin_token: 'valid-admin-token' },
        body: {
          productId: 'qa-product',
          productName: 'QA Product',
          name: 'Admin QA',
          email: 'admin-qa@example.com',
          rating: 5,
          title: 'Admin QA review',
          comment: 'Verifies end-to-end moderation path',
          qaBypassRateLimit: true,
          suppressConfirmationEmail: true,
        },
      }) as never
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.qaBypassRateLimit).toBe(true);
    expect(body.emailSuppressed).toBe(true);
    expect(body.emailSent).toBe(false);
    expect(rateLimitCheckMock).not.toHaveBeenCalled();
    expect(sendReviewConfirmationMock).not.toHaveBeenCalled();
  });

  it('captures non-verified reviewers as pending customers and suggests signup', async () => {
    const { db, pendingCustomers } = createMemoryDb();
    connectToDatabaseMock.mockResolvedValue({ db });

    const reviewsRoute = await import('@/app/api/reviews/route');

    const response = await reviewsRoute.POST(
      createRequest({
        url: 'http://localhost/api/reviews',
        body: {
          productId: 'guest-review-product',
          productName: 'Guest Review Product',
          name: 'Guest Reviewer',
          email: 'guest-reviewer@example.com',
          rating: 5,
          title: 'Loved it',
          comment: 'Great quality and taste.',
        },
      }) as never
    );

    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.review.verifiedPurchase).toBe(false);
    expect(body.pendingCustomerCaptured).toBe(true);
    expect(body.pendingCustomer?.captured).toBe(true);
    expect(body.pendingCustomer?.signupSuggested).toBe(true);
    expect(body.signupPrompt?.recommended).toBe(true);
    expect(body.signupPrompt?.registerHref).toContain('/register?');
    expect(pendingCustomers).toHaveLength(1);
    expect(pendingCustomers[0].email).toBe('guest-reviewer@example.com');
    expect(pendingCustomers[0].status).toBe('pending_signup');
    expect(pendingCustomers[0].reviewSubmissionCount).toBe(1);

    const secondResponse = await reviewsRoute.POST(
      createRequest({
        url: 'http://localhost/api/reviews',
        body: {
          productId: 'guest-review-product-2',
          productName: 'Guest Review Product 2',
          name: 'Guest Reviewer',
          email: 'guest-reviewer@example.com',
          rating: 4,
          title: 'Second review',
          comment: 'Sharing another product experience.',
        },
      }) as never
    );

    const secondBody = await secondResponse.json();
    expect(secondResponse.status).toBe(200);
    expect(secondBody.success).toBe(true);
    expect(pendingCustomers).toHaveLength(1);
    expect(pendingCustomers[0].reviewSubmissionCount).toBe(2);
    expect(pendingCustomers[0].reviewedProductIds).toEqual(
      expect.arrayContaining(['guest-review-product', 'guest-review-product-2'])
    );
  });
});
