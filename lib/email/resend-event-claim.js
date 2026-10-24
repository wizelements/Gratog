/**
 * Atomic Resend delivery-event admission. A unique Svix-ID index is required:
 * no durable single-winner claim => no side effects, even in Preview.
 *
 * This provides concurrency admission, NOT exactly-once multi-collection writes.
 * Production certification must separately prove recoverable effects and replay.
 */
export async function claimResendEvent(collection, { svixId, type, emailId, now = new Date() }) {
  if (typeof svixId !== 'string' || !svixId.trim() || svixId.length > 256) {
    return { accepted: false, reason: 'missing-or-invalid-id' };
  }

  const indexed = await collection.indexExists('idx_resend_webhooks_svix');
  if (!indexed) throw new Error('RESEND_WEBHOOK_UNIQUE_INDEX_MISSING');

  const initial = {
    svixId, type, messageId: emailId, status: 'processing',
    createdAt: now, lastReceivedAt: now,
  };

  try {
    await collection.insertOne(initial);
    return { accepted: true, recovered: false };
  } catch (err) {
    if (err?.code !== 11000) throw err;
  }

  // Only the unique-index winner proceeds. A concurrent duplicate must never
  // acknowledge success before the first worker commits its side effects.
  const existing = await collection.findOne(
    { svixId }, { projection: { processedAt: 1, status: 1, lastReceivedAt: 1 } }
  );
  if (!existing) throw new Error('RESEND_WEBHOOK_CLAIM_NOT_FOUND');
  if (existing.processedAt) return { accepted: false, duplicate: true, complete: true };

  const staleBefore = new Date(now.getTime() - 15 * 60 * 1000);
  const failed = existing.status === 'failed';
  const stale = existing.status === 'processing' &&
    existing.lastReceivedAt instanceof Date && existing.lastReceivedAt <= staleBefore;

  if (failed || stale) {
    const filter = failed
      ? { svixId, status: 'failed' }
      : { svixId, status: 'processing', lastReceivedAt: { $lte: staleBefore } };
    const result = await collection.findOneAndUpdate(
      filter,
      {
        $set: { status: 'processing', lastReceivedAt: now, type, messageId: emailId },
        $unset: { failedAt: '', error: '' },
      },
      { returnDocument: 'after' }
    );
    const claimed = result?.value || (result?.svixId === svixId ? result : null);
    if (claimed) return { accepted: true, recovered: true };
  }

  return { accepted: false, duplicate: true, complete: false, retryAfterSeconds: 30 };
}