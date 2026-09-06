import { describe, expect, it, vi } from 'vitest';
import { ObjectId } from 'mongodb';
import { commitBatch } from '../../scripts/migrate/batch-runner.mjs';
import { decodeCheckpointId, encodeCheckpointId, remainingAfterCheckpoint } from '../../scripts/migrate/checkpoint.mjs';

describe('migration checkpoint and resume', () => {
  it('preserves ObjectId and string checkpoint types', () => {
    const objectId = new ObjectId();
    expect(decodeCheckpointId(encodeCheckpointId(objectId)).equals(objectId)).toBe(true);
    expect(decodeCheckpointId(encodeCheckpointId('counter-key'))).toBe('counter-key');
  });
  it('resumes without omissions or duplicates', () => {
    const records = [1,2,3,4,5].map((_id) => ({ _id }));
    const first = records.slice(0, 2); const resumed = remainingAfterCheckpoint(records, first.at(-1)!._id);
    expect([...first, ...resumed].map((x) => x._id)).toEqual([1,2,3,4,5]);
  });
  it('does not advance checkpoint after failed atomic write', async () => {
    const saveCheckpoint = vi.fn();
    await expect(commitBatch({ writes: [{}], writeBatch: async () => { throw new Error('constraint'); }, checkpoint: { lastSourceId: 1 }, saveCheckpoint })).rejects.toThrow('constraint');
    expect(saveCheckpoint).not.toHaveBeenCalled();
  });
});
