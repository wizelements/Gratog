import { withRetry } from './retry.mjs';
export async function commitBatch({ writes, writeBatch, checkpoint, saveCheckpoint }) {
  const result = await withRetry(() => writeBatch(writes));
  await saveCheckpoint(checkpoint);
  return result;
}
