import mongoose, { Connection } from 'mongoose';
import { assertPreviewDatabaseIdentity, requiredPreviewDatabaseName } from './database/preview-database-guard';

// Cache the connection to prevent multiple connections during hot reloads
let _cachedConnection: Connection | null = null;

interface MongoConnection {
  conn: Connection | null;
  promise: Promise<Connection> | null;
}

declare global {
  var mongoose: MongoConnection | undefined;
}

const cached: MongoConnection = global.mongoose || { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

export async function connectToDatabase(): Promise<{ db: any; client: any }> {
  if (cached.conn) {
    assertPreviewDatabaseIdentity(cached.conn.db?.databaseName);
    // Return the native MongoClient (not the mongoose Connection wrapper) so
    // callers can use `client.startSession()` / transactions correctly. The
    // mongoose Connection's startSession returns a Promise in mongoose 8+,
    // which breaks `withTransaction` / `endSession` in lib/transactions.ts.
    return { db: cached.conn.db, client: cached.conn.getClient() };
  }

  if (!cached.promise) {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI is not defined');
    }

    // Fail before opening any network connection if Preview has no approved
    // database target. The name is independently verified after connecting.
    requiredPreviewDatabaseName();

    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(uri, opts).then(async (instance) => {
      try {
        assertPreviewDatabaseIdentity(instance.connection.db?.databaseName);
      } catch (error) {
        // Never expose even a read-capable connection to the wrong namespace.
        await instance.disconnect();
        throw error;
      }
      return instance.connection;
    });
  }

  try {
    cached.conn = await cached.promise;
    return { db: cached.conn.db, client: cached.conn.getClient() };
  } catch (e) {
    cached.promise = null;
    throw e;
  }
}
