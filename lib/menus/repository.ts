/**
 * Menus Repository
 * Database operations for menu management
 */

import { ObjectId } from 'mongodb';
import { connectToDatabase } from '@/lib/db-optimized';
import { logger } from '@/lib/logger';
import { withTransaction } from '@/lib/transactions';
import { buildOpeeBusinessEvent } from '@/lib/opee/contract';
import { ensureOpeeOutboxIndexes, insertOpeeOutboxEvent } from '@/lib/opee/outbox';
import type { AdminMenu, MenuDocument } from './types';
import type { CreateMenuInput, UpdateMenuInput } from './schema';

const COLLECTION_NAME = 'menus';

function documentToAdminMenu(doc: MenuDocument): AdminMenu {
  return {
    id: doc._id.toString(),
    title: doc.title,
    description: doc.description,
    imageUrl: doc.imageUrl,
    thumbnailUrl: doc.thumbnailUrl,
    canvaUrl: doc.canvaUrl,
    printUrl: doc.printUrl,
    marketId: doc.marketId,
    weekStart: doc.weekStart?.toISOString?.() ?? new Date().toISOString(),
    weekEnd: doc.weekEnd?.toISOString?.() ?? new Date().toISOString(),
    isActive: !!doc.isActive,
    isArchived: !!doc.isArchived,
    linkedProducts: doc.linkedProducts,
    seasonalTags: doc.seasonalTags,
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

export async function getPublicMenus(): Promise<AdminMenu[]> {
  try {
    const { db } = await connectToDatabase();
    const docs = await db
      .collection(COLLECTION_NAME)
      .find({
        $or: [
          { isActive: true },
          { isArchived: true },
        ],
      })
      .sort({ isActive: -1, weekStart: -1 })
      .toArray();

    return docs.map((doc: any) => documentToAdminMenu(doc));
  } catch (error) {
    logger.error('Menus', 'Failed to fetch public menus', error);
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

export type CreateMenuData = CreateMenuInput;

export async function createMenu(data: CreateMenuData): Promise<AdminMenu> {
  try {
    await ensureOpeeOutboxIndexes();
    return await withTransaction(async (db, session) => {
      const now = new Date();
      const collection = db.collection(COLLECTION_NAME);
      let deactivatedCount = 0;

      if (data.isActive) {
        const deactivated = await collection.updateMany(
          { isActive: true },
          { $set: { isActive: false, updatedAt: now } },
          { session }
        );
        deactivatedCount = deactivated.modifiedCount;
      }

      const doc = {
        title: data.title,
        description: data.description || '',
        imageUrl: data.imageUrl,
        thumbnailUrl: data.thumbnailUrl || '',
        canvaUrl: data.canvaUrl || '',
        printUrl: data.printUrl || '',
        marketId: data.marketId || '',
        weekStart: data.weekStart,
        weekEnd: data.weekEnd,
        isActive: data.isActive || false,
        isArchived: data.isArchived || false,
        linkedProducts: data.linkedProducts || [],
        seasonalTags: data.seasonalTags || [],
        createdAt: now,
        updatedAt: now,
      };

      const result = await collection.insertOne(doc, { session });
      const menuId = result.insertedId.toString();

      const createdEvent = buildOpeeBusinessEvent({
        eventType: 'tog.menu.created',
        source: 'gratog.menu',
        sourceEventId: `create:${menuId}`,
        correlationId: menuId,
        subject: { type: 'menu', id: menuId },
        payload: {
          menu_id: menuId,
          market_id: doc.marketId || null,
          week_start: doc.weekStart.toISOString(),
          week_end: doc.weekEnd.toISOString(),
          is_active: doc.isActive,
          linked_product_ids: doc.linkedProducts,
        },
      });
      await insertOpeeOutboxEvent(db, createdEvent, { session });

      if (doc.isActive) {
        const activatedEvent = buildOpeeBusinessEvent({
          eventType: 'tog.menu.activated',
          source: 'gratog.menu',
          sourceEventId: `activate:${menuId}:${now.toISOString()}`,
          correlationId: menuId,
          subject: { type: 'menu', id: menuId },
          payload: { menu_id: menuId, deactivated_count: deactivatedCount },
        });
        await insertOpeeOutboxEvent(db, activatedEvent, { session });
      }

      logger.info('Menus', 'Menu created', { id: menuId, title: data.title });
      return documentToAdminMenu({ _id: result.insertedId, ...doc } as any);
    });
  } catch (error) {
    logger.error('Menus', 'Failed to create menu', error);
    throw error;
  }
}

export type UpdateMenuData = Omit<UpdateMenuInput, 'menuId'>;

export async function updateMenu(
  id: string,
  data: UpdateMenuData
): Promise<AdminMenu | null> {
  try {
    if (!ObjectId.isValid(id)) return null;
    await ensureOpeeOutboxIndexes();

    return await withTransaction(async (db, session) => {
      const now = new Date();
      const collection = db.collection(COLLECTION_NAME);
      let deactivatedCount = 0;

      if (data.isActive) {
        const deactivated = await collection.updateMany(
          { _id: { $ne: new ObjectId(id) }, isActive: true },
          { $set: { isActive: false, updatedAt: now } },
          { session }
        );
        deactivatedCount = deactivated.modifiedCount;
      }

      const updateFields: Record<string, any> = { updatedAt: now };
      const allowedFields = [
        'title', 'description', 'imageUrl', 'thumbnailUrl', 'canvaUrl',
        'printUrl', 'marketId', 'isActive', 'isArchived',
        'linkedProducts', 'seasonalTags',
      ];
      for (const field of allowedFields) {
        if (data[field as keyof UpdateMenuData] !== undefined) {
          updateFields[field] = data[field as keyof UpdateMenuData];
        }
      }
      if (data.weekStart) updateFields.weekStart = data.weekStart;
      if (data.weekEnd) updateFields.weekEnd = data.weekEnd;

      const result = await collection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: updateFields },
        { returnDocument: 'after', session }
      );
      if (!result) return null;

      const updateEvent = buildOpeeBusinessEvent({
        eventType: 'tog.menu.updated',
        source: 'gratog.menu',
        sourceEventId: `update:${id}:${now.toISOString()}`,
        correlationId: id,
        subject: { type: 'menu', id },
        payload: {
          menu_id: id,
          changed_fields: Object.keys(updateFields).filter((field) => field !== 'updatedAt'),
          is_active: Boolean(result.isActive),
        },
      });
      await insertOpeeOutboxEvent(db, updateEvent, { session });

      if (data.isActive) {
        const activatedEvent = buildOpeeBusinessEvent({
          eventType: 'tog.menu.activated',
          source: 'gratog.menu',
          sourceEventId: `activate:${id}:${now.toISOString()}`,
          correlationId: id,
          subject: { type: 'menu', id },
          payload: { menu_id: id, deactivated_count: deactivatedCount },
        });
        await insertOpeeOutboxEvent(db, activatedEvent, { session });
      }

      logger.info('Menus', 'Menu updated', { id });
      return documentToAdminMenu(result as any);
    });
  } catch (error) {
    logger.error('Menus', 'Failed to update menu', error);
    throw error;
  }
}

export async function deleteMenu(id: string): Promise<boolean> {
  try {
    if (!ObjectId.isValid(id)) return false;
    await ensureOpeeOutboxIndexes();

    return await withTransaction(async (db, session) => {
      const collection = db.collection(COLLECTION_NAME);
      const existing = await collection.findOne(
        { _id: new ObjectId(id) },
        { projection: { isActive: 1, marketId: 1 }, session }
      );
      if (!existing) return false;

      const result = await collection.deleteOne({ _id: new ObjectId(id) }, { session });
      if (result.deletedCount === 0) return false;

      const event = buildOpeeBusinessEvent({
        eventType: 'tog.menu.deleted',
        source: 'gratog.menu',
        sourceEventId: `delete:${id}`,
        correlationId: id,
        subject: { type: 'menu', id },
        payload: {
          menu_id: id,
          was_active: Boolean(existing.isActive),
          market_id: existing.marketId || null,
        },
      });
      await insertOpeeOutboxEvent(db, event, { session });

      logger.info('Menus', 'Menu deleted', { id });
      return true;
    });
  } catch (error) {
    logger.error('Menus', 'Failed to delete menu', error);
    throw error;
  }
}

export async function setActiveMenu(id: string): Promise<AdminMenu | null> {
  try {
    if (!ObjectId.isValid(id)) return null;
    await ensureOpeeOutboxIndexes();

    return await withTransaction(async (db, session) => {
      const now = new Date();
      const collection = db.collection(COLLECTION_NAME);
      const objectId = new ObjectId(id);

      const deactivated = await collection.updateMany(
        { _id: { $ne: objectId }, isActive: true },
        { $set: { isActive: false, updatedAt: now } },
        { session }
      );

      const result = await collection.findOneAndUpdate(
        { _id: objectId },
        { $set: { isActive: true, updatedAt: now } },
        { returnDocument: 'after', session }
      );
      if (!result) return null;

      const event = buildOpeeBusinessEvent({
        eventType: 'tog.menu.activated',
        source: 'gratog.menu',
        sourceEventId: `activate:${id}:${now.toISOString()}`,
        correlationId: id,
        subject: { type: 'menu', id },
        payload: { menu_id: id, deactivated_count: deactivated.modifiedCount },
      });
      await insertOpeeOutboxEvent(db, event, { session });

      logger.info('Menus', 'Active menu set', { id });
      return documentToAdminMenu(result as any);
    });
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
    await collection.createIndex({ isArchived: 1 });
    await collection.createIndex({ weekStart: -1 });
    await collection.createIndex({ marketId: 1 });

    logger.info('Menus', 'Menu indexes ensured');
  } catch (error) {
    logger.error('Menus', 'Failed to create menu indexes', error);
  }
}
