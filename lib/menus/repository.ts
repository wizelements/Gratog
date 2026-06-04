/**
 * Menus Repository
 * Database operations for menu management
 */

import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';
import type { AdminMenu, MenuDocument } from './types';

const COLLECTION_NAME = 'menus';

function documentToAdminMenu(doc: MenuDocument): AdminMenu {
  return {
    id: doc._id.toString(),
    title: doc.title,
    description: doc.description,
    imageUrl: doc.imageUrl,
    thumbnailUrl: doc.thumbnailUrl,
    marketId: doc.marketId,
    weekStart: doc.weekStart?.toISOString?.() ?? new Date().toISOString(),
    weekEnd: doc.weekEnd?.toISOString?.() ?? new Date().toISOString(),
    isActive: !!doc.isActive,
    linkedProducts: doc.linkedProducts,
    createdAt: doc.createdAt?.toISOString?.() ?? new Date().toISOString(),
    updatedAt: doc.updatedAt?.toISOString?.() ?? new Date().toISOString(),
  };
}

export async function getAllMenus(): Promise<AdminMenu[]> {
  try {
    const { db } = await connectToDatabase();
    const docs = await db
      .collection(COLLECTION_NAME)
      .find({})
      .sort({ weekStart: -1 })
      .toArray();

    return docs.map((doc: any) => documentToAdminMenu(doc));
  } catch (error) {
    logger.error('Menus', 'Failed to fetch all menus', error);
    throw error;
  }
}

export async function getActiveMenus(): Promise<AdminMenu[]> {
  try {
    const { db } = await connectToDatabase();
    const docs = await db
      .collection(COLLECTION_NAME)
      .find({ isActive: true })
      .sort({ weekStart: -1 })
      .toArray();

    return docs.map((doc: any) => documentToAdminMenu(doc));
  } catch (error) {
    logger.error('Menus', 'Failed to fetch active menus', error);
    throw error;
  }
}

export async function getActiveMenu(): Promise<AdminMenu | null> {
  try {
    const { db } = await connectToDatabase();
    const doc = await db
      .collection(COLLECTION_NAME)
      .findOne({ isActive: true }, { sort: { weekStart: -1 } });

    return doc ? documentToAdminMenu(doc as any) : null;
  } catch (error) {
    logger.error('Menus', 'Failed to fetch active menu', error);
    throw error;
  }
}

export async function getMenuById(id: string): Promise<AdminMenu | null> {
  try {
    if (!ObjectId.isValid(id)) {
      return null;
    }

    const { db } = await connectToDatabase();
    const doc = await db.collection(COLLECTION_NAME).findOne({
      _id: new ObjectId(id),
    });

    return doc ? documentToAdminMenu(doc as any) : null;
  } catch (error) {
    logger.error('Menus', 'Failed to fetch menu by id', error);
    throw error;
  }
}

export type CreateMenuData = {
  title: string;
  description?: string;
  imageUrl: string;
  thumbnailUrl?: string;
  marketId?: string;
  weekStart: string;
  weekEnd: string;
  isActive?: boolean;
  linkedProducts?: string[];
};

export async function createMenu(data: CreateMenuData): Promise<AdminMenu> {
  try {
    const { db } = await connectToDatabase();
    const now = new Date();

    const doc = {
      title: data.title,
      description: data.description || '',
      imageUrl: data.imageUrl,
      thumbnailUrl: data.thumbnailUrl || '',
      marketId: data.marketId || '',
      weekStart: new Date(data.weekStart),
      weekEnd: new Date(data.weekEnd),
      isActive: data.isActive || false,
      linkedProducts: data.linkedProducts || [],
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection(COLLECTION_NAME).insertOne(doc);

    logger.info('Menus', 'Menu created', {
      id: result.insertedId.toString(),
      title: data.title,
    });

    return {
      id: result.insertedId.toString(),
      title: doc.title,
      description: doc.description,
      imageUrl: doc.imageUrl,
      thumbnailUrl: doc.thumbnailUrl,
      marketId: doc.marketId,
      weekStart: doc.weekStart.toISOString(),
      weekEnd: doc.weekEnd.toISOString(),
      isActive: doc.isActive,
      linkedProducts: doc.linkedProducts,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };
  } catch (error) {
    logger.error('Menus', 'Failed to create menu', error);
    throw error;
  }
}

export interface UpdateMenuData {
  title?: string;
  description?: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  marketId?: string;
  weekStart?: string;
  weekEnd?: string;
  isActive?: boolean;
  linkedProducts?: string[];
}

export async function updateMenu(
  id: string,
  data: UpdateMenuData
): Promise<AdminMenu | null> {
  try {
    if (!ObjectId.isValid(id)) {
      return null;
    }

    const { db } = await connectToDatabase();

    const updateFields: Record<string, any> = {
      updatedAt: new Date(),
    };

    const allowedFields = [
      'title',
      'description',
      'imageUrl',
      'thumbnailUrl',
      'marketId',
      'isActive',
      'linkedProducts',
    ];

    for (const field of allowedFields) {
      if (data[field as keyof UpdateMenuData] !== undefined) {
        updateFields[field] = data[field as keyof UpdateMenuData];
      }
    }

    // Handle date fields separately
    if (data.weekStart) {
      updateFields.weekStart = new Date(data.weekStart);
    }
    if (data.weekEnd) {
      updateFields.weekEnd = new Date(data.weekEnd);
    }

    const result = await db.collection(COLLECTION_NAME).findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    if (!result) {
      return null;
    }

    logger.info('Menus', 'Menu updated', { id });

    return documentToAdminMenu(result as any);
  } catch (error) {
    logger.error('Menus', 'Failed to update menu', error);
    throw error;
  }
}

export async function deleteMenu(id: string): Promise<boolean> {
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
      logger.info('Menus', 'Menu deleted', { id });
    }

    return success;
  } catch (error) {
    logger.error('Menus', 'Failed to delete menu', error);
    throw error;
  }
}

export async function setActiveMenu(id: string): Promise<AdminMenu | null> {
  try {
    if (!ObjectId.isValid(id)) {
      return null;
    }

    const { db } = await connectToDatabase();
    const collection = db.collection(COLLECTION_NAME);

    // Deactivate all menus
    await collection.updateMany(
      { isActive: true },
      { $set: { isActive: false, updatedAt: new Date() } }
    );

    // Activate this one
    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { isActive: true, updatedAt: new Date() } },
      { returnDocument: 'after' }
    );

    if (!result) {
      return null;
    }

    logger.info('Menus', 'Active menu set', { id });

    return documentToAdminMenu(result as any);
  } catch (error) {
    logger.error('Menus', 'Failed to set active menu', error);
    throw error;
  }
}

export async function ensureMenuIndexes(): Promise<void> {
  try {
    const { db } = await connectToDatabase();
    const collection = db.collection(COLLECTION_NAME);

    await collection.createIndex({ isActive: 1 });
    await collection.createIndex({ weekStart: -1 });
    await collection.createIndex({ marketId: 1 });

    logger.info('Menus', 'Menu indexes ensured');
  } catch (error) {
    logger.error('Menus', 'Failed to create menu indexes', error);
  }
}
