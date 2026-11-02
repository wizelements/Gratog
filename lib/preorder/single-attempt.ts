import { connectToDatabase } from '@/lib/db-optimized';

/**
 * Reserve a market preorder intent BEFORE advancing the queue or creating
 * any Square link. A repeated intent never starts these side effects again.
 * Unknown outcomes remain pending for reconciliation, never auto-replayed.
 */
export async function reserveMarketPreorderAttempt(key: string, fingerprint: string) {
  const { db } = await connectToDatabase();
  const collection = db.collection('market_preorder_attempts');
  await collection.createIndex({ key: 1 }, { name: 'market_attempt_unique', unique: true });
  await collection.createIndex({ expiresAt: 1 }, { name: 'market_attempt_ttl', expireAfterSeconds: 0 });
  try {
    await collection.insertOne({
      key,
      fingerprint,
      state: 'processing',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    return { state: 'new' as const };
  } catch (error: any) {
    if (error?.code !== 11000 && !/E11000|duplicate key/i.test(String(error?.message || ''))) throw error;
    const previous = await collection.findOne({ key });
    if (!previous) return { state: 'pending' as const };
    if (previous.fingerprint !== fingerprint) return { state: 'conflict' as const };
    if (previous.state === 'complete' && previous.result) {
      return { state: 'replay' as const, result: previous.result };
    }
    if (previous.state === 'failed' && previous.result) {
      return { state: 'failed' as const, result: previous.result };
    }
    return { state: 'pending' as const };
  }
}

export async function completeMarketPreorderAttempt(key: string, result: any, state: 'complete' | 'failed') {
  const { db } = await connectToDatabase();
  const change = await db.collection('market_preorder_attempts').updateOne(
    { key, state: 'processing' },
    { $set: { state, result, updatedAt: new Date() } }
  );
  if (change.matchedCount !== 1) throw new Error('Unable to persist preorder attempt outcome');
}
