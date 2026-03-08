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
  return Object.entries(query).every(([key, expected]) => {
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
    }

    return valuesMatch(actual, expected);
  });
}

function applyUpdate(document: RecordMap, update: RecordMap): void {
  const increment = (update.$inc || {}) as Record<string, number>;
  const setValues = (update.$set || {}) as Record<string, unknown>;
  const pushValues = (update.$push || {}) as Record<string, unknown>;

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
}

function createMemoryDb(seed: {
  reviews?: RecordMap[];
  orders?: RecordMap[];
  passports?: RecordMap[];
} = {}) {
  const reviews = [...(seed.reviews || [])];
  const orders = [...(seed.orders || [])];
  const passports = [...(seed.passports || [])];

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

      throw new Error(`Unsupported collection in test database: ${name}`);
    },
  };

  return { db, reviews, passports, orders };
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
});
