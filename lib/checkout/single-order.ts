/**
 * Exact-once admission for guest checkout order creation.
 *
 * Cache get -> create -> cache set is NOT atomic across serverless workers.
 * The partial unique MongoDB index is the actual concurrency boundary.
 * An uncommitted or failed write never authorizes a second charge.
 */
export class CheckoutAttemptConflictError extends Error {
  constructor() {
    super('This checkout attempt was reused with different order details. Review your cart and start a new checkout.');
    this.name = 'CheckoutAttemptConflictError';
  }
}

export class CheckoutAttemptPendingError extends Error {
  constructor() {
    super('Your order is still being created. Retry this checkout without changing your details.');
    this.name = 'CheckoutAttemptPendingError';
  }
}

function duplicateKey(error: unknown): boolean {
  const candidate = error as { code?: number; message?: string } | null;
  return candidate?.code === 11000 || /E11000|duplicate key/i.test(candidate?.message || '');
}

interface CheckoutOrdersCollection {
  createIndex(keys: Record<string, number>, options: Record<string, unknown>): Promise<unknown>;
  findOne(query: Record<string, unknown>): Promise<any>;
}

export async function createOrReuseCheckoutOrder<T>(args: {
  collection: CheckoutOrdersCollection;
  key: string;
  fingerprint: string;
  create: () => Promise<T>;
  existingResponse: (order: any) => T;
}): Promise<T> {
  const { collection, key, fingerprint, create, existingResponse } = args;
  // Do not permit an unsafe best-effort fallback if index creation fails.
  await collection.createIndex(
    { checkoutAttemptKey: 1 },
    {
      name: 'checkout_attempt_key_unique',
      unique: true,
      partialFilterExpression: { checkoutAttemptKey: { $type: 'string' } },
    }
  );

  const recover = async (): Promise<T | null> => {
    const order = await collection.findOne({ checkoutAttemptKey: key });
    if (!order) return null;
    if (order.checkoutRequestFingerprint !== fingerprint) {
      throw new CheckoutAttemptConflictError();
    }
    return existingResponse(order);
  };

  const prior = await recover();
  if (prior !== null) return prior;
  try {
    return await create();
  } catch (error) {
    if (!duplicateKey(error)) throw error;
    // The competing transaction may not yet be visible to this worker.
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const existing = await recover();
      if (existing !== null) return existing;
      await new Promise(resolve => setTimeout(resolve, 50 + attempt * 50));
    }
    throw new CheckoutAttemptPendingError();
  }
}
