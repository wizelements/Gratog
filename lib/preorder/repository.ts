/**
 * Preorder MongoDB persistence layer
 * Uses raw MongoDB via connectToDatabase() for atomic counters and CRUD
 */

import { connectToDatabase } from '@/lib/db-optimized';

const COLLECTION = 'marketorders';
const COUNTER_COLLECTION = 'market_counters';

export async function getNextWaitlistNumber(
  marketId: string,
  prefix: string,
  date: Date
): Promise<{ waitlistNumber: string; counter: number }> {
  const { db } = await connectToDatabase();
  const dateKey = date.toISOString().split('T')[0];
  const counterKey = `${marketId}-${dateKey}`;

  const result = await db.collection(COUNTER_COLLECTION).findOneAndUpdate(
    { _id: counterKey },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' }
  );

  const counter = result.seq as number;
  const dayOfMonth = date.getDate().toString().padStart(2, '0');
  const waitlistNumber = `${prefix}-${dayOfMonth}${counter.toString().padStart(2, '0')}`;

  return { waitlistNumber, counter };
}

export async function createPreorder(order: Record<string, any>): Promise<any> {
  const { db } = await connectToDatabase();
  const result = await db.collection(COLLECTION).insertOne({
    ...order,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return { ...order, _id: result.insertedId };
}

export async function findPreorderByOrderNumber(orderNumber: string): Promise<any | null> {
  const { db } = await connectToDatabase();
  return db.collection(COLLECTION).findOne({ orderNumber });
}

export async function findPreorderByWaitlistNumber(waitlistNumber: string): Promise<any | null> {
  const { db } = await connectToDatabase();
  return db.collection(COLLECTION).findOne({ waitlistNumber });
}

export async function findPreorderByPhone(phone: string): Promise<any | null> {
  const { db } = await connectToDatabase();
  return db.collection(COLLECTION).findOne(
    { customerPhone: phone },
    { sort: { createdAt: -1 } }
  );
}

export async function updatePreorderStatus(
  orderNumber: string,
  status: string
): Promise<any | null> {
  const { db } = await connectToDatabase();
  return db.collection(COLLECTION).findOneAndUpdate(
    { orderNumber },
    { $set: { status, updatedAt: new Date() } },
    { returnDocument: 'after' }
  );
}
