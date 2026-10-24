import { describe, expect, it, vi } from 'vitest';
import { claimResendEvent } from '@/lib/email/resend-event-claim';

const now = new Date('2026-10-24T12:00:00Z');
const params = { svixId: 'msg_123', type: 'email.delivered', emailId: 'email_123', now };
const duplicate = Object.assign(new Error('duplicate key'), { code: 11000 });

function ledger(overrides: Record<string, unknown> = {}) {
  return {
    indexExists: vi.fn().mockResolvedValue(true),
    insertOne: vi.fn().mockResolvedValue({ acknowledged: true }),
    findOne: vi.fn(),
    findOneAndUpdate: vi.fn(),
    ...overrides,
  };
}

describe('Resend webhook atomic admission', () => {
  it('accepts only the atomic insert winner', async () => {
    const db = ledger();
    expect(await claimResendEvent(db, params)).toEqual({ accepted: true, recovered: false });
    expect(db.insertOne).toHaveBeenCalledTimes(1);
    expect(db.indexExists).toHaveBeenCalledWith('idx_resend_webhooks_svix');
    expect(db.findOne).not.toHaveBeenCalled();
  });

  it('fails closed when the required unique index is absent', async () => {
    const db = ledger({ indexExists: vi.fn().mockResolvedValue(false) });
    await expect(claimResendEvent(db, params)).rejects.toThrow('RESEND_WEBHOOK_UNIQUE_INDEX_MISSING');
    expect(db.insertOne).not.toHaveBeenCalled();
  });

  it('acknowledges a completed duplicate without repeating side effects', async () => {
    const db = ledger({
      insertOne: vi.fn().mockRejectedValue(duplicate),
      findOne: vi.fn().mockResolvedValue({ status: 'processed', processedAt: now }),
    });
    expect(await claimResendEvent(db, params)).toEqual({
      accepted: false, duplicate: true, complete: true,
    });
    expect(db.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('returns retriable 503 semantics while the first event is processing', async () => {
    const db = ledger({
      insertOne: vi.fn().mockRejectedValue(duplicate),
      findOne: vi.fn().mockResolvedValue({ status: 'processing', lastReceivedAt: now }),
    });
    expect(await claimResendEvent(db, params)).toEqual({
      accepted: false, duplicate: true, complete: false, retryAfterSeconds: 30,
    });
    expect(db.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it('reclaims failed messages with a compare-and-swap claim', async () => {
    const db = ledger({
      insertOne: vi.fn().mockRejectedValue(duplicate),
      findOne: vi.fn().mockResolvedValue({ status: 'failed' }),
      findOneAndUpdate: vi.fn().mockResolvedValue({ svixId: params.svixId }),
    });
    expect(await claimResendEvent(db, params)).toEqual({ accepted: true, recovered: true });
    expect(db.findOneAndUpdate).toHaveBeenCalledWith(
      { svixId: params.svixId, status: 'failed' }, expect.any(Object),
      { returnDocument: 'after' }
    );
  });

  it('does not process events without a stable signed ID', async () => {
    const db = ledger();
    expect(await claimResendEvent(db, { ...params, svixId: '' })).toEqual({
      accepted: false, reason: 'missing-or-invalid-id',
    });
    expect(db.insertOne).not.toHaveBeenCalled();
  });
});