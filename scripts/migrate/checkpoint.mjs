import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { EJSON } = require('bson');
export const encodeCheckpointId = (value) => EJSON.serialize(value);
export const decodeCheckpointId = (value) => EJSON.deserialize(value);
export function remainingAfterCheckpoint(records, checkpointId) {
  if (checkpointId == null) return records;
  const index = records.findIndex((record) => EJSON.stringify(record._id) === EJSON.stringify(checkpointId));
  return index < 0 ? records : records.slice(index + 1);
}
