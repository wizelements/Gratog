/**
 * Merchant-controlled, non-market pickup appointments.
 * No location or appointment is public until explicitly activated by admin.
 * Active windows must be confirmed, future-dated, and have a cutoff.
 * Data access follows the existing orders repository pending the Turso cutover.
 */
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { connectToDatabase } from '@/lib/db-optimized';

export const pickupWindowSchema = z.object({
  startsAt: z.string().datetime({ offset: true }),
  endsAt: z.string().datetime({ offset: true }),
  cutoffAt: z.string().datetime({ offset: true }),
  capacity: z.number().int().min(1).max(100),
});
export const pickupLocationSchema = z.object({
  name: z.string().trim().min(2).max(100),
  street: z.string().trim().min(5).max(200),
  city: z.string().trim().min(2).max(80),
  state: z.literal('GA'),
  zip: z.string().regex(/^\d{5}$/),
  instructions: z.string().trim().max(500).default(''),
  isActive: z.boolean().default(false),
  windows: z.array(pickupWindowSchema).max(60),
}).superRefine((location, ctx) => {
  const starts = new Set<string>();
  for (const [index, slot] of location.windows.entries()) {
    if (starts.has(slot.startsAt)) ctx.addIssue({ code: 'custom', path: ['windows', index], message: 'Duplicate appointment start' });
    starts.add(slot.startsAt);
    if (Date.parse(slot.endsAt) <= Date.parse(slot.startsAt)) ctx.addIssue({ code: 'custom', path: ['windows', index, 'endsAt'], message: 'End must follow start' });
    if (Date.parse(slot.cutoffAt) >= Date.parse(slot.startsAt)) ctx.addIssue({ code: 'custom', path: ['windows', index, 'cutoffAt'], message: 'Cutoff must precede appointment' });
  }
});
export type PickupLocationInput = z.infer<typeof pickupLocationSchema>;
export type PublicPickupLocation = Omit<PickupLocationInput, 'isActive'> & { id: string; windows: PickupLocationInput['windows'] };

const COLLECTION = 'non_market_pickup_locations';
const ORDER_STATES_NOT_BOOKED = ['cancelled', 'CANCELLED', 'refunded', 'REFUNDED', 'payment_failed'];

export async function getPickupLocationsAdmin() {
  const { db } = await connectToDatabase();
  const rows = await db.collection(COLLECTION).find({}).sort({ name: 1 }).toArray();
  return rows.map(({ _id, ...rest }: any) => ({ ...rest, id: String(_id) }));
}

export async function savePickupLocation(input: PickupLocationInput, id?: string) {
  const { db } = await connectToDatabase();
  const now = new Date();
  if (id) {
    if (!ObjectId.isValid(id)) throw new Error('Invalid location ID');
    const result = await db.collection(COLLECTION).updateOne({ _id: new ObjectId(id) }, { $set: { ...input, updatedAt: now } });
    if (!result.matchedCount) throw new Error('Pickup location not found');
    return id;
  }
  const result = await db.collection(COLLECTION).insertOne({ ...input, createdAt: now, updatedAt: now });
  return String(result.insertedId);
}

async function bookingsForWindow(locationId: string, startsAt: string) {
  const { db } = await connectToDatabase();
  // Expired unpaid checkout attempts do not consume an appointment indefinitely.
  const unpaidCutoff = new Date(Date.now() - 30 * 60 * 1000);
  return db.collection('orders').countDocuments({
    $and: [
      { $or: [{ 'pickup.locationId': locationId }, { 'fulfillment.pickup.locationId': locationId }] },
      { $or: [{ 'pickup.date': startsAt }, { 'fulfillment.pickup.date': startsAt }] },
      { status: { $nin: ORDER_STATES_NOT_BOOKED } },
      { $or: [{ paymentStatus: { $in: ['PAID', 'paid', 'COMPLETED', 'completed'] } }, { createdAt: { $gte: unpaidCutoff } }] },
    ]
  });
}

export async function getPublicPickupLocations(): Promise<PublicPickupLocation[]> {
  const { db } = await connectToDatabase();
  const rows = await db.collection(COLLECTION).find({ isActive: true }).sort({ name: 1 }).toArray();
  const now = Date.now();
  const results: PublicPickupLocation[] = [];
  for (const row of rows) {
    const id = String(row._id);
    const candidates = Array.isArray(row.windows) ? row.windows : [];
    const available = [];
    for (const slot of candidates) {
      if (Date.parse(slot.startsAt) <= now || Date.parse(slot.cutoffAt) <= now) continue;
      if ((await bookingsForWindow(id, slot.startsAt)) >= slot.capacity) continue;
      available.push(slot);
    }
    if (available.length) results.push({
      id, name: row.name, street: row.street, city: row.city, state: 'GA',
      zip: row.zip, instructions: row.instructions || '', windows: available
    });
  }
  return results;
}

export async function assertPickupAppointment(locationId: string, startsAt: string) {
  if (!ObjectId.isValid(locationId) || !Number.isFinite(Date.parse(startsAt))) throw new Error('Invalid pickup appointment');
  const options = await getPublicPickupLocations();
  const location = options.find(item => item.id === locationId);
  const slot = location?.windows.find(window => window.startsAt === startsAt);
  if (!slot) throw new Error('This pickup time is no longer available. Please choose another appointment.');
  return { location, slot };
}
