import { classifyCapturedRefund } from './refund-progress';
import type { Db } from 'mongodb';

export type VerifiedSquareRefund = {
  orderId: string;
  paymentId: string;
  refundId: string;
  amountCents: number;
  paidCents: number;
  currency: string;
};

/**
 * Canonical refund ledger shared by regular checkout and market preorder.
 * Square webhook HMAC is verified before calling. A duplicate event or
 * refund.updated replay may not increment refunded amounts twice.
 */
export async function reconcileCapturedSquareRefund(db: Db, refund: VerifiedSquareRefund) {
  const { orderId, paymentId, refundId, amountCents, paidCents } = refund;
  const currency = String(refund.currency || '').toUpperCase();
  if (!orderId || !paymentId || !refundId || currency !== 'USD'
      || !Number.isSafeInteger(amountCents) || amountCents <= 0
      || !Number.isSafeInteger(paidCents) || paidCents <= 0) {
    throw new Error('Square refund identity, amount, currency or order total unverified');
  }
  const entries = db.collection('square_refund_entries');
  await entries.createIndex({ refundId: 1 }, { unique: true, name: 'square_refund_id_unique' });
  try {
    await entries.updateOne({ refundId }, {
      $setOnInsert: {
        refundId, orderId, paymentId, amountCents, currency, confirmedAt: new Date(),
      },
    }, { upsert: true });
  } catch (error) {
    // Another webhook may have won the same unique refund ID. The stored
    // record is still checked below, preventing amount/order substitution.
    if ((error as { code?: number } | null)?.code !== 11000) throw error;
  }
  const recorded = await entries.findOne({ refundId });
  if (!recorded || recorded.orderId !== orderId || recorded.paymentId !== paymentId
      || recorded.amountCents !== amountCents || recorded.currency !== currency) {
    throw new Error('Square refund ID reused with mismatched payment or amount');
  }
  const totals = await entries.aggregate([
    { $match: { orderId } },
    { $group: { _id: null, amount: { $sum: '$amountCents' } } },
  ]).toArray();
  const refundedCents = Number(totals[0]?.amount || 0);
  const progress = classifyCapturedRefund(paidCents, refundedCents);
  return { ...progress, refundedCents, paidCents };
}
