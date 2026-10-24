/**
 * A stable, unique _id makes concurrent Square webhook deliveries single-flight
 * even before a secondary eventId index has been provisioned. No background
 * timers: ambiguous in-progress events remain in reconciliation, never retried
 * blindly when side effects (email/refunds) may already be committed.
 */
type Collection = { insertOne: (doc: any) => Promise<any>; findOne: (filter: any) => Promise<any>;
  updateOne: (filter: any, update: any) => Promise<any> };
export type WebhookClaim = 'claimed' | 'duplicate' | 'busy';

export async function claimSquareWebhookEvent(
  collection: Collection, eventId: string
): Promise<WebhookClaim> {
  if (typeof eventId !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9-]{7,180}$/.test(eventId)) {
    throw new Error('INVALID_SQUARE_EVENT_ID');
  }
  try {
    await collection.insertOne({
      _id: 'square:' + eventId,
      eventId,
      status: 'processing',
      claimedAt: new Date(),
    });
    return 'claimed';
  } catch (error: any) {
    if (error?.code !== 11000) throw error;
    const row = await collection.findOne({ _id: 'square:' + eventId });
    if (row?.status === 'success') return 'duplicate';
    return 'busy';
  }
}

export async function finalizeSquareWebhookEvent(
  collection: Collection, eventId: string, success: boolean
): Promise<void> {
  const updated = await collection.updateOne(
    { _id: 'square:' + eventId, status: 'processing' },
    { $set: {
      status: success ? 'success' : 'needs_reconciliation',
      updatedAt: new Date(),
    } }
  );
  if (updated.modifiedCount !== 1) {
    throw new Error('SQUARE_WEBHOOK_CLAIM_FINALIZATION_FAILED');
  }
}
