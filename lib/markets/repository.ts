/**
 * Markets Repository
 * Database operations for market management
 */

import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';
import type { AdminMarket, MarketDocument, MarketLocation } from './types';

const COLLECTION_NAME = 'markets';

function documentToAdminMarket(doc: MarketDocument): AdminMarket {
  return {
    id: doc._id.toString(),
    name: doc.name,
    address: doc.address,
    city: doc.city,
    state: doc.state,
    zip: doc.zip,
    lat: doc.lat,
    lng: doc.lng,
    hours: doc.hours,
    dayOfWeek: doc.dayOfWeek,
    description: doc.description,
    mapsUrl: doc.mapsUrl,
    isActive: doc.isActive !== false,
    featured: !!doc.featured,
    createdAt: doc.createdAt?.toISOString?.() ?? new Date().toISOString(),
    updatedAt: doc.updatedAt?.toISOString?.() ?? new Date().toISOString(),
  };
}

export async function getAllMarkets(): Promise<AdminMarket[]> {
  try {
    const { db } = await connectToDatabase();
    const docs = await db
      .collection(COLLECTION_NAME)
      .find({})
      .sort({ name: 1 })
      .toArray();

    return docs.map((doc: any) => documentToAdminMarket(doc));
  } catch (error) {
    logger.error('Markets', 'Failed to fetch all markets', error);
    throw error;
  }
}

export async function getActiveMarkets(): Promise<AdminMarket[]> {
  try {
    const { db } = await connectToDatabase();
    const docs = await db
      .collection(COLLECTION_NAME)
      .find({ isActive: true })
      .sort({ name: 1 })
      .toArray();

    return docs.map((doc: any) => documentToAdminMarket(doc));
  } catch (error) {
    logger.error('Markets', 'Failed to fetch active markets', error);
    throw error;
  }
}

export async function getMarketById(id: string): Promise<AdminMarket | null> {
  try {
    if (!ObjectId.isValid(id)) {
      return null;
    }

    const { db } = await connectToDatabase();
    const doc = await db.collection(COLLECTION_NAME).findOne({
      _id: new ObjectId(id),
    });

    return doc ? documentToAdminMarket(doc as any) : null;
  } catch (error) {
    logger.error('Markets', 'Failed to fetch market by id', error);
    throw error;
  }
}

export type CreateMarketData = {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  hours: string;
  dayOfWeek: number;
  description: string;
  mapsUrl?: string;
  isActive?: boolean;
  featured?: boolean;
};

export async function createMarket(data: CreateMarketData): Promise<AdminMarket> {
  try {
    const { db } = await connectToDatabase();
    const now = new Date();

    const doc = {
      name: data.name,
      address: data.address,
      city: data.city,
      state: data.state,
      zip: data.zip,
      lat: data.lat,
      lng: data.lng,
      hours: data.hours,
      dayOfWeek: data.dayOfWeek,
      description: data.description,
      mapsUrl: data.mapsUrl || '',
      isActive: data.isActive !== false,
      featured: data.featured || false,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection(COLLECTION_NAME).insertOne(doc);

    logger.info('Markets', 'Market created', {
      id: result.insertedId.toString(),
      name: data.name,
    });

    return {
      id: result.insertedId.toString(),
      ...doc,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
  } catch (error) {
    logger.error('Markets', 'Failed to create market', error);
    throw error;
  }
}

export interface UpdateMarketData extends Partial<MarketLocation> {
  isActive?: boolean;
  featured?: boolean;
}

export async function updateMarket(
  id: string,
  data: UpdateMarketData
): Promise<AdminMarket | null> {
  try {
    if (!ObjectId.isValid(id)) {
      return null;
    }

    const { db } = await connectToDatabase();

    const updateFields: Record<string, any> = {
      updatedAt: new Date(),
    };

    const allowedFields = [
      'name',
      'address',
      'city',
      'state',
      'zip',
      'lat',
      'lng',
      'hours',
      'dayOfWeek',
      'description',
      'mapsUrl',
      'isActive',
      'featured',
    ];

    for (const field of allowedFields) {
      if (data[field as keyof UpdateMarketData] !== undefined) {
        updateFields[field] = data[field as keyof UpdateMarketData];
      }
    }

    const result = await db.collection(COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    if (!result) {
      return null;
    }

    logger.info('Markets', 'Market updated', { id });

    return documentToAdminMarket(result as any);
  } catch (error) {
    logger.error('Markets', 'Failed to update market', error);
    throw error;
  }
}

export async function deleteMarket(id: string): Promise<boolean> {
  try {
    if (!ObjectId.isValid(id)) {
      return false;
    }

    const { db } = await connectToDatabase();

    const result = await db.collection(COLLECTION_NAME).deleteOne({
      _id: new ObjectId(id),
    });

    const success = result.deletedCount > 0;

    if (success) {
      logger.info('Markets', 'Market deleted', { id });
    }

    return success;
  } catch (error) {
    logger.error('Markets', 'Failed to delete market', error);
    throw error;
  }
}

export async function toggleMarketStatus(
  id: string,
  isActive: boolean
): Promise<AdminMarket | null> {
  return updateMarket(id, { isActive });
}

export async function seedDefaultMarkets(): Promise<{ seeded: number }> {
  try {
    const { db } = await connectToDatabase();
    const count = await db.collection(COLLECTION_NAME).countDocuments();

    if (count > 0) {
      logger.info('Markets', 'Markets already exist, skipping seed');
      return { seeded: 0 };
    }

    const now = new Date();
    const defaultMarkets = [
      {
        name: 'Serenbe Farmers Market',
        address: '10950 Hutcheson Ferry Rd',
        city: 'Palmetto',
        state: 'GA',
        zip: '30268',
        lat: 33.4848,
        lng: -84.686,
        hours: '09:00-13:00',
        dayOfWeek: 6,
        description:
          'Our flagship location featuring the full product line. Look for the gold Taste of Gratitude banners at Booth #12.',
        mapsUrl: 'https://maps.google.com/?q=Serenbe+Farmers+Market',
        isActive: true,
        featured: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: 'Browns Mill Community Market',
        address: 'Browns Mill Recreation Center',
        city: 'Atlanta',
        state: 'GA',
        zip: '30354',
        lat: 33.65,
        lng: -84.41,
        hours: '15:00-18:00',
        dayOfWeek: 6,
        description:
          'Community-focused market bringing wellness to South Atlanta. Featured products and special promotions available.',
        mapsUrl: 'https://maps.google.com/?q=Browns+Mill+Recreation+Center+Atlanta',
        isActive: true,
        featured: false,
        createdAt: now,
        updatedAt: now,
      },
    ];

    const result = await db.collection(COLLECTION_NAME).insertMany(defaultMarkets);

    logger.info('Markets', 'Default markets seeded', {
      count: result.insertedCount,
    });

    return { seeded: result.insertedCount };
  } catch (error) {
    logger.error('Markets', 'Failed to seed markets', error);
    throw error;
  }
}

export async function ensureMarketIndexes(): Promise<void> {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection(COLLECTION_NAME);

    await collection.createIndex({ name: 1 });
    await collection.createIndex({ city: 1, state: 1 });
    await collection.createIndex({ isActive: 1 });

    logger.info('Markets', 'Market indexes ensured');
  } catch (error) {
    logger.error('Markets', 'Failed to create market indexes', error);
  }
}
