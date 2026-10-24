/**
 * Merchant-controlled, non-market pickup appointments.
 * No location or appointment is public until explicitly activated by admin.
 * Active windows must be confirmed, future-dated, and have a cutoff.
 * Data access follows the existing orders repository pending the Turso cutover.
 */
import { ObjectId, type Db, type ClientSession } from 'mongodb';
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
  // Publication never implies a staffed location. This is a separate admin attestation.
  staffingConfirmed: z.boolean().default(false),
  addressVerified: z.boolean().default(false),
  windows: z.array(pickupWindowSchema).max(60),
}).superRefine((location, ctx) => {
  const starts = new Set<string>();
  if (location.isActive && (!location.staffingConfirmed || !location.addressVerified)) {
    ctx.addIssue({code:'custom',path:['isActive'],message:'Verify staffing and public address before publication'});
  }
  for (const [index, slot] of location.windows.entries()) {
    if (starts.has(slot.startsAt)) ctx.addIssue({ code: 'custom', path: ['windows', index], message: 'Duplicate appointment start' });
    starts.add(slot.startsAt);
    if (Date.parse(slot.endsAt) <= Date.parse(slot.startsAt)) ctx.addIssue({ code: 'custom', path: ['windows', index, 'endsAt'], message: 'End must follow start' });
    if (Date.parse(slot.cutoffAt) >= Date.parse(slot.startsAt)) ctx.addIssue({ code: 'custom', path: ['windows', index, 'cutoffAt'], message: 'Cutoff must precede appointment' });
  }
});
export type PickupLocationInput = z.infer<typeof pickupLocationSchema>;
export type PublicPickupLocation = Omit<PickupLocationInput, 'isActive' | 'staffingConfirmed' | 'addressVerified'> & { id: string; windows: PickupLocationInput['windows'] };

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
      { $or: [{ paymentStatus: { $in: ['PAID', 'paid', 'COMPLETED', 'completed'] } },
        { status: 'payment_processing' }, { createdAt: { $gte: unpaidCutoff } }] },
    ]
  });
}

export async function getPublicPickupLocations(): Promise<PublicPickupLocation[]> {
  const { db } = await connectToDatabase();
  const rows = await db.collection(COLLECTION).find({ isActive: true, staffingConfirmed: true, addressVerified: true }).sort({ name: 1 }).toArray();
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

/**
 * Definitive admission for appointment orders, called INSIDE the canonical
 * order-create transaction. The write to the same location document forces
 * concurrent transactions for the final seat to conflict and retry. The count
 * and order insertion share the snapshot/transaction; an exception rolls back
 * the location write without leaving an orphan hold. No second database.
 *
 * The user-facing availability GET is advisory only; NEVER authorize a
 * charge on the strength of a previous GET or read-before-write check.
 */
export async function reservePickupSlotInOrderTransaction(
  db: Db, session: ClientSession, locationId: string, startsAt: string
) {
  if (!ObjectId.isValid(locationId) || !Number.isFinite(Date.parse(startsAt))) {
    throw new Error('Invalid pickup appointment');
  }
  const now = new Date();
  const row = await db.collection(COLLECTION).findOneAndUpdate(
    {
      _id: new ObjectId(locationId),
      isActive: true,
      addressVerified: true,
      staffingConfirmed: true,
      windows: { $elemMatch: { startsAt } },
    },
    { $set: { reservationLockAt: now } },
    { session, returnDocument: 'after' }
  );
  if (!row) throw new Error('Pickup location is closed or not staffed. Choose another appointment.');
  const slot = Array.isArray(row.windows) ? row.windows.find((item: any) => item.startsAt === startsAt) : null;
  if (!slot || Date.parse(slot.cutoffAt) <= now.getTime() || Date.parse(slot.startsAt) <= now.getTime()) {
    throw new Error('Pickup cutoff has passed. Choose another appointment.');
  }
  // Reservations have a 30-minute checkout lease, aligned with order access
  // tokens. Paid orders retain their seat. Canceled/refunded/failed do not.
  const reserved = await db.collection('orders').countDocuments({
    $and: [
      { $or: [{ 'pickup.locationId': locationId }, { 'fulfillment.pickup.locationId': locationId }] },
      { $or: [{ 'pickup.date': startsAt }, { 'fulfillment.pickup.date': startsAt }] },
      { status: { $nin: ORDER_STATES_NOT_BOOKED } },
      { $or: [
        { paymentStatus: { $in: ['PAID', 'paid', 'COMPLETED', 'completed'] } },
        { status: 'payment_processing' },
        { createdAt: { $gte: new Date(now.getTime() - 30 * 60 * 1000) } },
      ] },
    ],
  }, { session });
  if (reserved >= slot.capacity) {
    throw new Error('This pickup appointment has just filled. Please select another time.');
  }
  return { locationId, startsAt };
}

/**
 * Unpaid appointments cannot be charged once their lease has expired.
 * A fresh checkout re-acquires capacity through the transactional path.
 */
export function isUnpaidPickupLeaseCurrent(order: {
  pickup?: { mode?: string; date?: string };
  fulfillment?: { pickup?: { mode?: string; date?: string } };
  createdAt?: string | Date;
}, nowMs = Date.now()): boolean {
  const pickup = order.pickup || order.fulfillment?.pickup;
  if (pickup?.mode !== 'appointment') return true;
  const createdAt = new Date(order.createdAt || '').getTime();
  return Number.isFinite(createdAt)
    && createdAt <= nowMs
    && nowMs - createdAt < 25 * 60 * 1000
    && Number.isFinite(Date.parse(pickup.date || ''))
    && Date.parse(pickup.date || '') > nowMs;
}

/**
 * Recheck business publication and operational capacity before payment. This
 * intentionally does not count appointments: the existing order already
 * owns its transactional reservation until the unpaid lease expires.
 */
export async function isPickupStillOperational(order: {
  pickup?: { mode?: string; locationId?: string; date?: string; locationAddress?: {street?: string} };
  fulfillment?: { pickup?: { mode?: string; locationId?: string; date?: string; locationAddress?: {street?: string} } };
}): Promise<boolean> {
  const pickup = order.pickup || order.fulfillment?.pickup;
  if (pickup?.mode !== 'appointment') return true;
  if (!pickup.locationId || !pickup.date || !ObjectId.isValid(pickup.locationId)) return false;
  const { db } = await connectToDatabase();
  const location = await db.collection(COLLECTION).findOne({
    _id: new ObjectId(pickup.locationId), isActive: true,
    staffingConfirmed: true, addressVerified: true,
  });
  if (!location) return false;
  if (pickup.locationAddress?.street && location.street !== pickup.locationAddress.street) return false;
  const slot = (location.windows || []).find((w: any) => w.startsAt === pickup.date);
  return Boolean(slot && Date.parse(slot.cutoffAt) > Date.now()
    && Date.parse(slot.startsAt) > Date.now());
}
